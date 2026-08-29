"use server";

import { requireUser } from "@/lib/auth/session";
import {
  awardXp,
  maybeGenerateStories,
  pushInAppNotification,
  qualifyStreakDay,
  recalculateHealth,
  runPostTransactionGamification,
  unlockAchievement,
} from "@/lib/finance/gamification-service";
import { levelFromXp, todayInTimezone } from "@/lib/finance/gamification";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/utils/errors";
import { revalidatePath } from "next/cache";

function revalidateGamification() {
  revalidatePath("/dashboard");
  revalidatePath("/plan");
  revalidatePath("/settings/profile");
  revalidatePath("/achievements");
}

export async function budgetCheckinAction(): Promise<
  ActionState & { xp?: number; streak?: number }
> {
  const { user } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const tz = profile?.timezone ?? "UTC";
  const result = await qualifyStreakDay(supabase, user.id, "budget_checkin", tz);
  await recalculateHealth(supabase, user.id, tz);

  revalidateGamification();
  return {
    success: result.newlyQualified
      ? `Check-in listo. Racha: ${result.streak} · +${result.xp} XP`
      : `Ya contaste hoy. Racha: ${result.streak}`,
    xp: result.xp,
    streak: result.streak,
  };
}

export async function markStoryReadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Historia inválida." };

  const { user } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const tz = profile?.timezone ?? "UTC";
  const today = todayInTimezone(tz);

  await supabase
    .from("insight_stories")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  await awardXp(supabase, user.id, "story_viewed", today, undefined, id);
  revalidateGamification();
  return { success: "Listo." };
}

export async function markNotificationReadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Aviso inválido." };
  const { user } = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("in_app_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidateGamification();
  return { success: "Ok" };
}

export async function updateNotificationPrefsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireUser();
  const supabase = await createClient();
  const payload = {
    user_id: user.id,
    streak_alerts: formData.get("streak_alerts") === "on",
    budget_alerts: formData.get("budget_alerts") === "on",
    insight_alerts: formData.get("insight_alerts") === "on",
    cohort_alerts: formData.get("cohort_alerts") === "on",
    quiet_hours: formData.get("quiet_hours") === "on",
  };
  const { error } = await supabase.from("notification_prefs").upsert(payload);
  if (error) return { error: "No se pudieron guardar las preferencias." };
  revalidateGamification();
  return { success: "Preferencias guardadas." };
}

export async function updateCohortOptInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireUser();
  const supabase = await createClient();
  const optIn = formData.get("cohort_opt_in") === "on";
  const { error } = await supabase
    .from("profiles")
    .update({ cohort_opt_in: optIn })
    .eq("id", user.id);
  if (error) return { error: "No se pudo actualizar." };
  revalidateGamification();
  return {
    success: optIn
      ? "Comparación anónima activada."
      : "Comparación anónima desactivada.",
  };
}

export async function refreshHealthAction(): Promise<ActionState> {
  const { user } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  await recalculateHealth(supabase, user.id, profile?.timezone ?? "UTC");
  revalidateGamification();
  return { success: "Energía actualizada." };
}

/** Called from createIncomeExpense after successful insert. */
export async function afterTransactionGamification(userId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();
  return runPostTransactionGamification(
    supabase,
    userId,
    profile?.timezone ?? "UTC",
  );
}

export async function seedStreakRiskNotification(userId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();
  const tz = profile?.timezone ?? "UTC";
  const today = todayInTimezone(tz);
  const { data: streak } = await supabase
    .from("user_streaks")
    .select("current_streak, last_qualified_on, freeze_tokens")
    .eq("user_id", userId)
    .maybeSingle();
  if (!streak || streak.current_streak < 1) return;
  if (streak.last_qualified_on === today) return;

  const { data: prefs } = await supabase
    .from("notification_prefs")
    .select("streak_alerts, muted_streak_until")
    .eq("user_id", userId)
    .maybeSingle();
  if (prefs && prefs.streak_alerts === false) return;
  if (prefs?.muted_streak_until && prefs.muted_streak_until >= today) return;

  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );

  if (hour >= 20) {
    await pushInAppNotification(
      supabase,
      userId,
      "T1",
      "Tu racha sigue viva",
      `Quedan pocas horas. Un tap protege tu racha de ${streak.current_streak}.`,
      "/dashboard",
    );
  }
}

export async function evaluateGoalAchievement(userId: string, goalId: string) {
  const supabase = await createClient();
  const { data: goal } = await supabase
    .from("saving_goals")
    .select("current_amount, target_amount, status")
    .eq("id", goalId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!goal) return;
  if (
    Number(goal.current_amount) >= Number(goal.target_amount) ||
    goal.status === "completed"
  ) {
    await unlockAchievement(supabase, userId, "M05");
  }
}

export async function evaluateDebtAchievement(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("debts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "paid");
  if ((count ?? 0) >= 1) {
    await unlockAchievement(supabase, userId, "M06");
  }
}

