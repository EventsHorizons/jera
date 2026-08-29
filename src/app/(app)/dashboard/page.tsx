import { BalanceCard } from "@/components/finance/balance-card";
import { QuickEntryBar } from "@/components/finance/quick-entry-bar";
import { SpendingTrend } from "@/components/finance/spending-trend";
import { requireUser } from "@/lib/auth/session";
import {
  addDaysToISODate,
  calculateAvailableMoney,
  calculateExpenses,
  calculateIncome,
  currentMonthPeriod,
  formatMoney,
  formatMoneyMap,
} from "@/lib/finance/calculations";
import { createClient } from "@/lib/supabase/server";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import Link from "next/link";

const TYPE_LABELS: Record<string, string> = {
  income: "Ingreso",
  expense: "Gasto",
  transfer: "Transferencia",
  adjustment: "Ajuste",
};

function formatDayLabel(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Hoy";
  if (sameDay(date, yesterday)) return "Ayer";
  return date.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" });
}

export default async function DashboardPage() {
  const { user } = await requireUser();
  const supabase = await createClient();
  const period = currentMonthPeriod();
  const today = new Date().toISOString().slice(0, 10);

  await supabase.rpc("generate_due_recurring_transactions", { p_as_of: today });

  const [
    { data: accountRows },
    { data: categoryRows },
    { data: accounts },
    { data: monthTx },
    { data: recentTx },
    { data: weekTx },
    { data: todayTx },
  ] = await Promise.all([
    supabase
      .from("financial_accounts")
      .select("id, name, currency")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("name"),
    supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("kind", "expense")
      .order("name"),
    supabase.rpc("get_accounts_with_balance"),
    supabase
      .from("transactions")
      .select("type, amount, is_settlement, reimburses_transaction_id, category_id")
      .eq("user_id", user.id)
      .gte("occurred_on", period.start)
      .lt("occurred_on", period.endExclusive),
    supabase
      .from("transactions")
      .select("id, type, amount, occurred_on, description, categories(name)")
      .eq("user_id", user.id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("transactions")
      .select("amount, occurred_on")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .eq("is_settlement", false)
      .gte("occurred_on", addDaysToISODate(today, -6))
      .lte("occurred_on", today),
    supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .eq("is_settlement", false)
      .eq("occurred_on", today),
  ]);

  const quickAccounts = (accountRows ?? []).map((a) => ({
    value: a.id,
    label: a.name,
  }));
  const quickCategories = (categoryRows ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const activeAccounts = (accounts ?? []).filter((a) => a.status === "active");
  const hasAccounts = activeAccounts.length > 0;
  const availableByCurrency = calculateAvailableMoney(activeAccounts);
  const primaryCurrency =
    Object.keys(availableByCurrency)[0] ?? activeAccounts[0]?.currency ?? "USD";

  const txRows = (monthTx ?? []).map((t) => ({
    type: t.type,
    amount: Number(t.amount),
    account_id: null,
    counterparty_account_id: null,
    is_settlement: t.is_settlement,
    reimburses_transaction_id: t.reimburses_transaction_id,
    category_id: t.category_id,
  }));

  const monthIncome = calculateIncome(txRows);
  const monthExpense = calculateExpenses(txRows);
  const todayExpense = (todayTx ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

  const trendDays: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trendDays.push(d.toISOString().slice(0, 10));
  }

  const spendByDay = new Map<string, number>();
  for (const day of trendDays) spendByDay.set(day, 0);
  for (const tx of weekTx ?? []) {
    const key = tx.occurred_on as string;
    spendByDay.set(key, (spendByDay.get(key) ?? 0) + Number(tx.amount));
  }

  const trendPoints = trendDays.map((day) => ({
    label: new Date(`${day}T12:00:00`).toLocaleDateString("es", { weekday: "narrow" }),
    value: spendByDay.get(day) ?? 0,
  }));

  const grouped = new Map<string, NonNullable<typeof recentTx>>();
  for (const tx of recentTx ?? []) {
    const day = tx.occurred_on as string;
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(tx);
  }

  return (
    <div className="fc-bento-grid">
      <div className="col-span-12 space-y-6 lg:col-span-8">
        <header className="space-y-2">
          <h1 className="fc-page-title text-lg md:text-xl">Resumen</h1>
          <p className="text-sm leading-relaxed text-text-secondary">
            Tu estado financiero de un vistazo.
          </p>
        </header>

        <QuickEntryBar
          accounts={quickAccounts}
          categories={quickCategories}
          className="hidden sm:block"
        />

        {!hasAccounts ? (
          <div className="fc-empty py-10 text-center">
            <p className="font-medium text-text">Crea tu primera cuenta</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">
              Sin una cuenta no podemos calcular tu balance ni registrar movimientos.
            </p>
            <Link href="/accounts" className="fc-btn-ai mt-6 inline-flex">
              Agregar cuenta
            </Link>
          </div>
        ) : (
          <>
            <div className="fc-bento-grid">
              <BalanceCard
                label="Balance actual"
                value={formatMoneyMap(availableByCurrency, primaryCurrency)}
                icon={Wallet}
                className="col-span-12 sm:col-span-6 lg:col-span-4"
              />
              <BalanceCard
                label="Gastos del mes"
                value={formatMoney(monthExpense, primaryCurrency)}
                subtitle={`Hoy: ${formatMoney(todayExpense, primaryCurrency)}`}
                icon={ArrowUpRight}
                tone="expense"
                className="col-span-12 sm:col-span-6 lg:col-span-4"
              />
              <BalanceCard
                label="Ingresos del mes"
                value={formatMoney(monthIncome, primaryCurrency)}
                icon={ArrowDownLeft}
                tone="income"
                className="col-span-12 sm:col-span-6 lg:col-span-4"
              />
            </div>

            <SpendingTrend points={trendPoints} currency={primaryCurrency} />
          </>
        )}
      </div>

      {hasAccounts ? (
        <section className="col-span-12 lg:col-span-4">
          <div className="mb-4 flex items-baseline justify-between gap-4 lg:sticky lg:top-24">
            <h2 className="text-sm font-medium leading-none text-text">Actividad reciente</h2>
            <Link href="/transactions" className="text-xs leading-none fc-link">
              Ver todo →
            </Link>
          </div>

          {(recentTx ?? []).length === 0 ? (
            <p className="text-sm text-text-muted">
              Sin movimientos. Usa la barra inferior o{" "}
              <kbd className="rounded-lg border border-border/80 px-2 py-1 font-mono text-xs">
                ⌘K
              </kbd>
              .
            </p>
          ) : (
            <div className="space-y-6">
              {[...grouped.entries()].slice(0, 4).map(([day, items]) => (
                <div key={day}>
                  <p className="fc-label mb-2">{formatDayLabel(day)}</p>
                  <ul className="fc-list">
                    {items!.slice(0, 5).map((tx) => {
                      const isExpense = tx.type === "expense";
                      const isIncome = tx.type === "income";
                      return (
                        <li key={tx.id}>
                          <Link
                            href={`/transactions/${tx.id}`}
                            className="fc-list-row min-h-11"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium leading-none text-text">
                                {tx.description ||
                                  (tx.categories as { name?: string } | null)?.name ||
                                  TYPE_LABELS[tx.type]}
                              </p>
                              <span
                                className={
                                  isIncome
                                    ? "fc-badge-income mt-2 inline-flex"
                                    : isExpense
                                      ? "fc-badge-expense mt-2 inline-flex"
                                      : "mt-2 inline-flex text-xs text-text-muted"
                                }
                              >
                                {TYPE_LABELS[tx.type]}
                              </span>
                            </div>
                            <span
                              className={`fc-mono-amount shrink-0 text-sm font-semibold leading-none ${
                                isIncome
                                  ? "text-income"
                                  : isExpense
                                    ? "text-expense"
                                    : "text-text"
                              }`}
                            >
                              {isExpense ? "−" : isIncome ? "+" : ""}
                              {formatMoney(Number(tx.amount), primaryCurrency)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
