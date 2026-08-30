import { TransactionRowActions } from "@/components/finance/transaction-row-actions";
import {
  CategoryForm,
  CategoryList,
} from "@/components/finance/management-forms";
import { AdvancedTransactionPanel } from "@/components/transactions/advanced-transaction-panel";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionQuickFilters } from "@/components/transactions/transaction-quick-filters";
import { EmptyPanel } from "@/components/ui/empty-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Collapsible } from "@/components/ui/collapsible";
import { requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/finance/calculations";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Suspense } from "react";

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
  return date.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" });
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    account?: string;
    category?: string;
    q?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("financial_accounts")
    .select("id, name, currency, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("name");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, kind, parent_id, is_system")
    .eq("user_id", user.id)
    .order("name");

  let query = supabase
    .from("transactions")
    .select(
      "id, type, amount, occurred_on, description, note, account_id, counterparty_account_id, category_id, adjustment_direction, categories(name)",
    )
    .eq("user_id", user.id)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (
    params.type === "income" ||
    params.type === "expense" ||
    params.type === "transfer" ||
    params.type === "adjustment"
  ) {
    query = query.eq("type", params.type);
  }
  if (params.account) {
    query = query.or(
      `account_id.eq.${params.account},counterparty_account_id.eq.${params.account}`,
    );
  }
  if (params.category) query = query.eq("category_id", params.category);
  if (params.from) query = query.gte("occurred_on", params.from);
  if (params.to) query = query.lte("occurred_on", params.to);
  if (params.q) {
    query = query.or(
      `description.ilike.%${params.q}%,note.ilike.%${params.q}%`,
    );
  }

  const { data: transactions } = await query;

  const { data: recentExpenses } = await supabase
    .from("transactions")
    .select("id, amount, description, occurred_on")
    .eq("user_id", user.id)
    .eq("type", "expense")
    .eq("is_settlement", false)
    .order("occurred_on", { ascending: false })
    .limit(20);

  const accountMap = new Map((accounts ?? []).map((a) => [a.id, a]));
  const rootCategories = (categories ?? []).filter((c) => !c.parent_id);
  const hasAccounts = (accounts?.length ?? 0) > 0;

  const grouped = new Map<string, NonNullable<typeof transactions>>();
  for (const tx of transactions ?? []) {
    const day = tx.occurred_on as string;
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(tx);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Movimientos"
        description="Historial y filtros."
      />

      {!hasAccounts ? (
        <EmptyPanel
          title="Primero necesitas una cuenta"
          description="Crea una cuenta para poder registrar ingresos y gastos."
          actionLabel="Agregar cuenta"
          actionHref="/accounts"
        />
      ) : (
        <>
          <Suspense fallback={null}>
            <TransactionQuickFilters activeType={params.type} />
          </Suspense>

          <AdvancedTransactionPanel
            accounts={accounts ?? []}
            categories={categories ?? []}
            recentExpenses={(recentExpenses ?? []).map((e) => ({
              id: e.id,
              label: `${e.occurred_on} · ${e.description || "Gasto"} · ${Number(e.amount).toFixed(2)}`,
            }))}
          />

          <TransactionFilters
            params={params}
            accounts={accounts ?? []}
            categories={categories ?? []}
          />

          {(transactions ?? []).length === 0 ? (
            <EmptyPanel
              title="Sin transacciones"
              description="Registra un gasto con la barra rápida en Inicio o el botón + Agregar gasto."
              actionLabel="Ir a Inicio"
              actionHref="/dashboard"
            />
          ) : (
            <div className="space-y-6">
              {[...grouped.entries()].map(([day, items]) => (
                <section key={day}>
                  <p className="fc-label mb-2">{formatDayLabel(day)}</p>
                  <ul className="fc-list">
                    {items!.map((tx) => {
                      const account = accountMap.get(tx.account_id ?? "");
                      const currency = account?.currency ?? "USD";
                      const categoryName =
                        (tx.categories as { name?: string } | null)?.name ?? null;
                      const isExpense = tx.type === "expense";
                      const isIncome = tx.type === "income";

                      return (
                        <li key={tx.id} className="fc-list-row min-h-11 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium leading-none text-text">
                              {tx.description || categoryName || TYPE_LABELS[tx.type]}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={
                                  isIncome
                                    ? "fc-badge-income"
                                    : isExpense
                                      ? "fc-badge-expense"
                                      : "text-xs text-text-muted"
                                }
                              >
                                {TYPE_LABELS[tx.type]}
                              </span>
                              {account ? (
                                <span className="text-xs text-text-muted">{account.name}</span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`fc-mono-amount text-sm font-semibold leading-none ${
                                isIncome
                                  ? "text-income"
                                  : "text-text"
                              }`}
                            >
                              {isExpense ? "−" : isIncome ? "+" : ""}
                              {formatMoney(Number(tx.amount), currency)}
                            </span>
                            <TransactionRowActions
                              id={tx.id}
                              description={
                                tx.description ||
                                categoryName ||
                                TYPE_LABELS[tx.type]
                              }
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <Collapsible label="Gestionar categorías">
            <div className="fc-panel space-y-4">
              <CategoryForm parents={rootCategories} />
              <CategoryList categories={categories ?? []} />
            </div>
          </Collapsible>
        </>
      )}
    </div>
  );
}
