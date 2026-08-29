import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyStreakQualification,
  computeHealthScore,
  levelFromXp,
  STREAK_MILESTONES,
  todayInTimezone,
  XP_RULES,
  type HealthComponents,
  type XpReason,
} from "@/lib/finance/gamification";
import { addDaysToISODate, currentMonthPeriod } from "@/lib/finance/calculations";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type GamificationResult = {
  xpAwarded: number;
  leveledUp: boolean;
  level: number;
  levelName: string;
  streak: number;
  freezeTokens: number;
  usedFreeze: boolean;
  brokenStreak: boolean;
  healthScore: number;
  newAchievements: string[];
  storyChanceHint: boolean;
};

async function ensureStreakRow(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data;
  const { data: created } = await supabase
    .from("user_streaks")
    .insert({ user_id: userId })
    .select("*")
    .single();
  return created!;
}

async function ensureProgressRow(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data;
  const { data: created } = await supabase
    .from("user_progress")
    .insert({ user_id: userId })
    .select("*")
    .single();
  return created!;
}

async function countXpToday(
  supabase: Client,
  userId: string,
  reason: XpReason,
  day: string,
) {
  const { count } = await supabase
    .from("xp_ledger")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("reason", reason)
    .eq("day", day);
  return count ?? 0;
}

export async function awardXp(
  supabase: Client,
  userId: string,
  reason: XpReason,
  day: string,
  amountOverride?: number,
  refId?: string | null,
): Promise<{ awarded: number; leveledUp: boolean; level: number; levelName: string; xpTotal: number }> {
  const rule = XP_RULES[reason];
  const amount = amountOverride ?? rule.amount;
  if (amount <= 0) {
    const progress = await ensureProgressRow(supabase, userId);
    const info = levelFromXp(progress.xp_total);
    return {
      awarded: 0,
      leveledUp: false,
      level: info.level,
      levelName: info.name,
      xpTotal: progress.xp_total,
    };
  }

  const used = await countXpToday(supabase, userId, reason, day);
  if (used >= rule.cap) {
    const progress = await ensureProgressRow(supabase, userId);
    const info = levelFromXp(progress.xp_total);
    return {
      awarded: 0,
      leveledUp: false,
      level: info.level,
      levelName: info.name,
      xpTotal: progress.xp_total,
    };
  }

  const progress = await ensureProgressRow(supabase, userId);
  const prevLevel = levelFromXp(progress.xp_total).level;
  const xpTotal = progress.xp_total + amount;
  const info = levelFromXp(xpTotal);

  await supabase.from("xp_ledger").insert({
    user_id: userId,
    amount,
    reason,
    ref_id: refId ?? null,
    day,
  });

  await supabase
    .from("user_progress")
    .update({
      xp_total: xpTotal,
      level: info.level,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return {
    awarded: amount,
    leveledUp: info.level > prevLevel,
    level: info.level,
    levelName: info.name,
    xpTotal,
  };
}

export async function unlockAchievement(
  supabase: Client,
  userId: string,
  achievementId: string,
): Promise<boolean> {
  const { error } = await supabase.from("user_achievements").insert({
    user_id: userId,
    achievement_id: achievementId,
  });
  return !error;
}

export async function qualifyStreakDay(
  supabase: Client,
  userId: string,
  kind: "transaction" | "budget_checkin",
  timezone: string,
): Promise<{
  streak: number;
  freezeTokens: number;
  newlyQualified: boolean;
  usedFreeze: boolean;
  broken: boolean;
  newMilestones: number[];
  xp: number;
  leveledUp: boolean;
  level: number;
  levelName: string;
  newAchievements: string[];
}> {
  const today = todayInTimezone(timezone);
  const row = await ensureStreakRow(supabase, userId);
  const state = {
    current_streak: row.current_streak,
    longest_streak: row.longest_streak,
    last_qualified_on: row.last_qualified_on,
    freeze_tokens: row.freeze_tokens,
    milestones_claimed: row.milestones_claimed ?? [],
  };

  // Record event (unique per kind/day — ignore conflict)
  const { error: eventError } = await supabase.from("streak_events").insert({
    user_id: userId,
    occurred_on: today,
    kind,
  });
  if (eventError && eventError.code !== "23505") {
    console.error("streak_events", eventError.message);
  }

  const result = applyStreakQualification(state, today);
  let xp = 0;
  let leveledUp = false;
  let level = 1;
  let levelName = "Semilla";
  const newAchievements: string[] = [];

  if (result.newlyQualified) {
    if (result.usedFreeze) {
      await supabase.from("streak_events").insert({
        user_id: userId,
        occurred_on: today,
        kind: "freeze_used",
      });
    }

    await supabase
      .from("user_streaks")
      .update({
        current_streak: result.next.current_streak,
        longest_streak: result.next.longest_streak,
        last_qualified_on: result.next.last_qualified_on,
        freeze_tokens: result.next.freeze_tokens,
        milestones_claimed: result.next.milestones_claimed,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    const dayXp = await awardXp(supabase, userId, "streak_day", today);
    xp += dayXp.awarded;
    leveledUp = leveledUp || dayXp.leveledUp;
    level = dayXp.level;
    levelName = dayXp.levelName;

    for (const m of result.newMilestones) {
      const bonus = STREAK_MILESTONES[m] ?? 0;
      const mXp = await awardXp(
        supabase,
        userId,
        "streak_milestone",
        today,
        bonus,
      );
      xp += mXp.awarded;
      leveledUp = leveledUp || mXp.leveledUp;
      level = mXp.level;
      levelName = mXp.levelName;
      if (m === 7 && (await unlockAchievement(supabase, userId, "M02"))) {
        newAchievements.push("M02");
      }
      if (m === 30 && (await unlockAchievement(supabase, userId, "M03"))) {
        newAchievements.push("M03");
      }
    }
  } else {
    const progress = await ensureProgressRow(supabase, userId);
    const info = levelFromXp(progress.xp_total);
    level = info.level;
    levelName = info.name;
  }

  if (kind === "transaction") {
    const txXp = await awardXp(supabase, userId, "expense_logged", today);
    xp += txXp.awarded;
    leveledUp = leveledUp || txXp.leveledUp;
    level = txXp.level;
    levelName = txXp.levelName;

    const { count } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "expense");
    if ((count ?? 0) === 1) {
      if (await unlockAchievement(supabase, userId, "M01")) {
        newAchievements.push("M01");
      }
    }
  }

  if (kind === "budget_checkin") {
    const cXp = await awardXp(supabase, userId, "budget_checkin", today);
    xp += cXp.awarded;
    leveledUp = leveledUp || cXp.leveledUp;
    level = cXp.level;
    levelName = cXp.levelName;
  }

  return {
    streak: result.next.current_streak,
    freezeTokens: result.next.freeze_tokens,
    newlyQualified: result.newlyQualified,
    usedFreeze: result.usedFreeze,
    broken: result.broken,
    newMilestones: result.newMilestones,
    xp,
    leveledUp,
    level,
    levelName,
    newAchievements,
  };
}

export async function recalculateHealth(
  supabase: Client,
  userId: string,
  timezone: string,
): Promise<{ score: number; components: HealthComponents }> {
  const today = todayInTimezone(timezone);
  const period = currentMonthPeriod(new Date(`${today}T12:00:00Z`));
  const weekStart = addDaysToISODate(today, -6);

  const [
    { data: streak },
    { data: budgets },
    { data: expenses },
    { data: goals },
    { data: debts },
    { data: weekTx },
  ] = await Promise.all([
    supabase.from("user_streaks").select("current_streak").eq("user_id", userId).maybeSingle(),
    supabase
      .from("budgets")
      .select("category_id, amount_limit")
      .eq("user_id", userId)
      .eq("period_month", period.month)
      .eq("period_year", period.year),
    supabase
      .from("transactions")
      .select("amount, category_id, is_settlement")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("occurred_on", period.start)
      .lt("occurred_on", period.endExclusive),
    supabase
      .from("saving_goals")
      .select("target_amount, current_amount, status")
      .eq("user_id", userId)
      .neq("status", "archived"),
    supabase
      .from("debts")
      .select("original_amount, paid_amount, status")
      .eq("user_id", userId)
      .neq("status", "archived"),
    supabase
      .from("transactions")
      .select("occurred_on")
      .eq("user_id", userId)
      .gte("occurred_on", weekStart)
      .lte("occurred_on", today),
  ]);

  const spentByCat: Record<string, number> = {};
  for (const e of expenses ?? []) {
    if (!e.category_id || e.is_settlement) continue;
    spentByCat[e.category_id] =
      (spentByCat[e.category_id] ?? 0) + Number(e.amount);
  }

  let budgetScore = 0.7; // neutral if no budgets
  if ((budgets ?? []).length > 0) {
    const ratios = (budgets ?? []).map((b) => {
      const spent = spentByCat[b.category_id] ?? 0;
      const limit = Number(b.amount_limit) || 1;
      return Math.max(0, Math.min(1, 1 - spent / limit));
    });
    budgetScore = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  }

  const streakDays = streak?.current_streak ?? 0;
  const streakScore = Math.min(1, streakDays / 30);

  let goalsScore = 0.5;
  const activeGoals = (goals ?? []).filter((g) => g.status !== "completed");
  const completed = (goals ?? []).filter((g) => g.status === "completed");
  if ((goals ?? []).length > 0) {
    const progressing = (goals ?? []).map((g) =>
      Math.min(1, Number(g.current_amount) / Math.max(1, Number(g.target_amount))),
    );
    goalsScore =
      progressing.reduce((a, b) => a + b, 0) / progressing.length ||
      (completed.length > 0 ? 1 : 0.5);
  }

  let debtsScore = 1;
  if ((debts ?? []).length > 0) {
    const ratios = (debts ?? []).map((d) => {
      const orig = Number(d.original_amount) || 1;
      return Math.min(1, Number(d.paid_amount) / orig);
    });
    debtsScore = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  }

  const daysWithTx = new Set((weekTx ?? []).map((t) => t.occurred_on)).size;
  const loggingScore = daysWithTx / 7;

  const components: HealthComponents = {
    budget: budgetScore,
    streak: streakScore,
    goals: goalsScore,
    debts: debtsScore,
    logging: loggingScore,
  };
  const score = computeHealthScore(components);

  await supabase
    .from("profiles")
    .update({
      health_score: score,
      health_updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return { score, components };
}

export async function maybeGenerateStories(
  supabase: Client,
  userId: string,
  timezone: string,
  healthScore: number,
) {
  const today = todayInTimezone(timezone);
  const { count } = await supabase
    .from("insight_stories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("created_on", today);
  if ((count ?? 0) >= 2) return;

  const period = currentMonthPeriod(new Date(`${today}T12:00:00Z`));
  const stories: Array<{
    kind: "comparison" | "budget" | "health";
    title: string;
    body: string;
    payload: Record<string, unknown>;
  }> = [];

  const { data: budgets } = await supabase
    .from("budgets")
    .select("category_id, amount_limit, categories(name)")
    .eq("user_id", userId)
    .eq("period_month", period.month)
    .eq("period_year", period.year);

  const { data: expenses } = await supabase
    .from("transactions")
    .select("amount, category_id, is_settlement")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("occurred_on", period.start)
    .lt("occurred_on", period.endExclusive);

  const spent: Record<string, number> = {};
  for (const e of expenses ?? []) {
    if (!e.category_id || e.is_settlement) continue;
    spent[e.category_id] = (spent[e.category_id] ?? 0) + Number(e.amount);
  }

  for (const b of budgets ?? []) {
    const s = spent[b.category_id] ?? 0;
    const limit = Number(b.amount_limit) || 1;
    const pct = s / limit;
    const name =
      (b.categories as { name?: string } | null)?.name ?? "Categoría";
    if (pct >= 0.8) {
      const remaining = Math.max(0, limit - s);
      stories.push({
        kind: "budget",
        title:
          pct >= 1
            ? `Superaste el límite de ${name}`
            : `Te quedan ${remaining.toFixed(0)} en ${name}`,
        body:
          pct >= 1
            ? "Revisa el presupuesto o ajusta el límite si cambió tu mes."
            : `Llevas ${(pct * 100).toFixed(0)}% del límite este mes.`,
        payload: { categoryId: b.category_id, spent: s, limit, pct },
      });
    }
  }

  stories.push({
    kind: "health",
    title: `Tu energía está en ${Math.round(healthScore)}`,
    body:
      healthScore >= 80
        ? "Vas estable: sigue registrando y respetando límites."
        : healthScore >= 50
          ? "Hay margen de mejora en presupuesto o constancia."
          : "Empecemos por un check-in de presupuesto hoy.",
    payload: { healthScore },
  });

  // Variable reward: insert at most one new unread story ~40%
  if (Math.random() > 0.4 && stories.length > 0) {
    const pick = stories[Math.floor(Math.random() * stories.length)]!;
    await supabase.from("insight_stories").insert({
      user_id: userId,
      kind: pick.kind,
      title: pick.title,
      body: pick.body,
      payload: pick.payload as import("@/types/database").Json,
      created_on: today,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
  }
}

export async function pushInAppNotification(
  supabase: Client,
  userId: string,
  notifId: string,
  title: string,
  body: string,
  href?: string,
) {
  const today = todayInTimezone("UTC");
  const { count } = await supabase
    .from("notification_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("day", today);
  if ((count ?? 0) >= 3) return;

  const { count: same } = await supabase
    .from("notification_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("day", today)
    .eq("notif_id", notifId);
  if ((same ?? 0) > 0) return;

  await supabase.from("notification_log").insert({
    user_id: userId,
    notif_id: notifId,
    channel: "in_app",
    day: today,
  });
  await supabase.from("in_app_notifications").insert({
    user_id: userId,
    notif_id: notifId,
    title,
    body,
    href: href ?? null,
  });
}

export async function runPostTransactionGamification(
  supabase: Client,
  userId: string,
  timezone: string,
): Promise<GamificationResult> {
  const streak = await qualifyStreakDay(
    supabase,
    userId,
    "transaction",
    timezone,
  );
  const health = await recalculateHealth(supabase, userId, timezone);
  await maybeGenerateStories(supabase, userId, timezone, health.score);

  // Multi-currency achievement
  const { data: accounts } = await supabase
    .from("financial_accounts")
    .select("currency")
    .eq("user_id", userId);
  const currencies = new Set((accounts ?? []).map((a) => a.currency));
  const newAchievements = [...streak.newAchievements];
  if (currencies.size >= 2) {
    if (await unlockAchievement(supabase, userId, "M07")) {
      newAchievements.push("M07");
    }
  }

  // Streak risk in-app nudge deferred to page load

  return {
    xpAwarded: streak.xp,
    leveledUp: streak.leveledUp,
    level: streak.level,
    levelName: streak.levelName,
    streak: streak.streak,
    freezeTokens: streak.freezeTokens,
    usedFreeze: streak.usedFreeze,
    brokenStreak: streak.broken,
    healthScore: health.score,
    newAchievements,
    storyChanceHint: true,
  };
}
