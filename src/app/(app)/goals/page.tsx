import { GoalsClient } from "@/components/finance/goals-client";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function GoalsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: goals } = await supabase
    .from("saving_goals")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  return <GoalsClient goals={goals ?? []} />;
}
