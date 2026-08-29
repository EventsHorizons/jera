import { AccountsManager } from "@/components/finance/accounts-manager";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AccountsPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: accounts, error } = await supabase.rpc(
    "get_accounts_with_balance",
  );

  if (error) {
    console.error("get_accounts_with_balance", error.message);
  }

  const active = (accounts ?? []).filter((a) => a.status === "active");
  const archived = (accounts ?? []).filter((a) => a.status === "archived");

  return <AccountsManager active={active} archived={archived} />;
}
