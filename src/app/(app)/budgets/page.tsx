import { BudgetsClient } from "@/components/finance/budgets-client";
import { requireUser } from "@/lib/auth/session";
import { currentMonthPeriod } from "@/lib/finance/calculations";
import { createClient } from "@/lib/supabase/server";

export default async function BudgetsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();
  const period = currentMonthPeriod();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, kind")
    .eq("user_id", user.id)
    .eq("kind", "expense")
    .order("name");

  const { data: budgets } = await supabase
    .from("budgets")
    .select("*, categories(name)")
    .eq("user_id", user.id)
    .eq("period_month", period.month)
    .eq("period_year", period.year)
    .order("created_at", { ascending: false });

  const { data: expenses } = await supabase
    .from("transactions")
    .select("amount, category_id, is_settlement")
    .eq("user_id", user.id)
    .eq("type", "expense")
    .gte("occurred_on", period.start)
    .lt("occurred_on", period.endExclusive);

  const spentByCategory: Record<string, number> = {};
  for (const expense of expenses ?? []) {
    if (!expense.category_id || expense.is_settlement) continue;
    spentByCategory[expense.category_id] =
      (spentByCategory[expense.category_id] ?? 0) + Number(expense.amount);
  }

  return (
    <BudgetsClient
      budgets={(budgets ?? []).map((b) => ({
        ...b,
        categories: b.categories as { name?: string } | null,
      }))}
      expenseCategories={categories ?? []}
      spentByCategory={spentByCategory}
      periodLabel={`${period.month}/${period.year}`}
    />
  );
}
