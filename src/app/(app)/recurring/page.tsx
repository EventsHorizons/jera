import { RecurringClient } from "@/components/finance/recurring-client";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function RecurringPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("financial_accounts")
    .select("id, name, currency")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("name");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, kind")
    .eq("user_id", user.id)
    .order("name");

  const { data: rules } = await supabase
    .from("recurring_transactions")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("next_occurrence");

  return (
    <RecurringClient
      accounts={accounts ?? []}
      categories={categories ?? []}
      rules={rules ?? []}
    />
  );
}
