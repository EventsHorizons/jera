import { AchievementsClient } from "@/components/finance/achievements-client";
import { getProfile, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AchievementsPage() {
  const { user } = await requireUser();
  const profile = await getProfile(user.id);
  const supabase = await createClient();

  const [{ data: catalog }, { data: unlocked }, { data: streak }, { data: progress }] =
    await Promise.all([
      supabase.from("achievements").select("*").order("sort_order"),
      supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", user.id),
      supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_progress").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

  const unlockedMap = new Map(
    (unlocked ?? []).map((u) => [u.achievement_id, u.unlocked_at]),
  );

  return (
    <AchievementsClient
      achievements={(catalog ?? []).map((a) => ({
        ...a,
        unlockedAt: unlockedMap.get(a.id) ?? null,
      }))}
      streak={streak?.current_streak ?? 0}
      longest={streak?.longest_streak ?? 0}
      xp={progress?.xp_total ?? 0}
      level={progress?.level ?? 1}
      cohortOptIn={profile?.cohort_opt_in ?? false}
      healthScore={Number(profile?.health_score ?? 50)}
      baseCurrency={profile?.base_currency ?? "USD"}
    />
  );
}
