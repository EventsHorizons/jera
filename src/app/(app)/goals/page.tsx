import { GoalsClient } from "@/components/finance/goals-client";
import { getProfile, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

export default async function GoalsPage() {
  const { user } = await requireUser();
  const profile = await getProfile(user.id);
  const supabase = await createClient();

  const { data: goals } = await supabase
    .from("saving_goals")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-zinc-100" />}>
      <GoalsClient
        goals={goals ?? []}
        baseCurrency={profile?.base_currency ?? "USD"}
      />
    </Suspense>
  );
}
