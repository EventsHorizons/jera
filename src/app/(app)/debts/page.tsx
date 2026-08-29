import { DebtsClient } from "@/components/finance/debts-client";
import { getProfile, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function DebtsPage() {
  const { user } = await requireUser();
  const profile = await getProfile(user.id);
  const supabase = await createClient();

  const { data: debts } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const { data: accounts } = await supabase
    .from("financial_accounts")
    .select("id, name, nature, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .eq("nature", "asset")
    .order("name");

  return (
    <DebtsClient
      debts={debts ?? []}
      accounts={(accounts ?? []).map((a) => ({ id: a.id, name: a.name }))}
      baseCurrency={profile?.base_currency ?? "USD"}
    />
  );
}
