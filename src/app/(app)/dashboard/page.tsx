import { seedStreakRiskNotification } from "@/app/actions/gamification";
import {
  CategoryImpactList,
  DashboardOverview,
  GoalsProgressStrip,
  QuickEntryBar,
} from "@/components/finance/dashboard-overview";
import { ExpenseCaptureButton } from "@/components/finance/expense-capture";
import { InAppNotificationBanner } from "@/components/finance/in-app-notification-banner";
import { InsightStories } from "@/components/finance/insight-stories";
import { OptimisticActivityRail } from "@/components/finance/reactive-money";
import { getProfile, requireUser } from "@/lib/auth/session";
import {
  addDaysToISODate,
  currentMonthPeriod,
  formatMoney,
} from "@/lib/finance/calculations";
import { convertAmount, fetchUsdRates } from "@/lib/finance/fx";
import { todayInTimezone } from "@/lib/finance/gamification";
import { recalculateHealth } from "@/lib/finance/gamification-service";
import { createClient } from "@/lib/supabase/server";
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
  return date.toLocaleDateString("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function DashboardPage() {
  const { user } = await requireUser();
  const profile = await getProfile(user.id);
  const supabase = await createClient();
  const period = currentMonthPeriod();
  const today = new Date().toISOString().slice(0, 10);
  const baseCurrency = (profile?.base_currency ?? "USD").toUpperCase();
  const tz = profile?.timezone ?? "UTC";
  const localToday = todayInTimezone(tz);
  const graphStart = addDaysToISODate(localToday, -27);

  const nowLocal = new Date(
    new Date().toLocaleString("en-US", { timeZone: tz }),
  );
  const dayOfMonth = nowLocal.getDate();
  const daysInMonth = new Date(
    nowLocal.getFullYear(),
    nowLocal.getMonth() + 1,
    0,
  ).getDate();

  await supabase.rpc("generate_due_recurring_transactions", { p_as_of: today });
  await seedStreakRiskNotification(user.id).catch(() => undefined);
  if (
    !profile?.health_updated_at ||
    Date.now() - new Date(profile.health_updated_at).getTime() > 12 * 3600_000
  ) {
    await recalculateHealth(supabase, user.id, tz).catch(() => undefined);
  }

  const [
    { data: accounts },
    { data: monthTx },
    { data: recentTx },
    { data: streakRow },
    { data: stories },
    { data: notifs },
    { data: freshProfile },
    { data: goals },
    { data: budgets },
    { data: streakEvents },
    { data: activityDays },
    { data: categories },
  ] = await Promise.all([
    supabase.rpc("get_accounts_with_balance"),
    supabase
      .from("transactions")
      .select(
        "type, amount, is_settlement, reimburses_transaction_id, category_id, account_id, categories(name)",
      )
      .eq("user_id", user.id)
      .gte("occurred_on", period.start)
      .lt("occurred_on", period.endExclusive),
    supabase
      .from("transactions")
      .select(
        "id, type, amount, occurred_on, description, account_id, categories(name)",
      )
      .eq("user_id", user.id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("insight_stories")
      .select("id, title, body, kind")
      .eq("user_id", user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("in_app_notifications")
      .select("id, title, body, href")
      .eq("user_id", user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("profiles")
      .select("health_score")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("saving_goals")
      .select("id, name, target_amount, current_amount, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("budgets")
      .select("id, amount_limit, category_id")
      .eq("user_id", user.id)
      .eq("period_month", period.month)
      .eq("period_year", period.year),
    supabase
      .from("streak_events")
      .select("occurred_on, kind")
      .eq("user_id", user.id)
      .gte("occurred_on", graphStart)
      .lte("occurred_on", localToday),
    supabase
      .from("transactions")
      .select("occurred_on")
      .eq("user_id", user.id)
      .eq("is_settlement", false)
      .gte("occurred_on", graphStart)
      .lte("occurred_on", localToday),
    supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("kind", "expense")
      .order("name")
      .limit(8),
  ]);

  const activeAccounts = (accounts ?? []).filter((a) => a.status === "active");
  const hasAccounts = activeAccounts.length > 0;
  const currencyByAccount = new Map(
    (accounts ?? []).map((a) => [a.id, a.currency] as const),
  );

  const currencies = new Set<string>([baseCurrency]);
  for (const a of activeAccounts) currencies.add(a.currency);

  let rates: Record<string, number> = {};
  try {
    rates = await fetchUsdRates([...currencies]);
  } catch {
    rates = {};
  }

  const currencyOf = (accountId: string | null) =>
    (accountId ? currencyByAccount.get(accountId) : undefined) ?? baseCurrency;

  const toBase = (amount: number, currency: string) =>
    convertAmount(amount, currency, baseCurrency, rates);

  const available = activeAccounts.reduce(
    (s, a) => s + toBase(Number(a.current_balance), a.currency),
    0,
  );
  const monthExpense = (monthTx ?? [])
    .filter((t) => t.type === "expense" && !t.is_settlement)
    .reduce(
      (s, t) => s + toBase(Number(t.amount), currencyOf(t.account_id)),
      0,
    );
  const monthIncome = (monthTx ?? [])
    .filter((t) => t.type === "income" && !t.is_settlement)
    .reduce(
      (s, t) => s + toBase(Number(t.amount), currencyOf(t.account_id)),
      0,
    );

  const spentByCategoryBudget: Record<string, number> = {};
  for (const expense of monthTx ?? []) {
    if (
      expense.type !== "expense" ||
      expense.is_settlement ||
      !expense.category_id
    ) {
      continue;
    }
    spentByCategoryBudget[expense.category_id] =
      (spentByCategoryBudget[expense.category_id] ?? 0) +
      toBase(Number(expense.amount), currencyOf(expense.account_id));
  }

  let budgetRemainingPct: number | null = null;
  if ((budgets ?? []).length > 0) {
    let limit = 0;
    let spent = 0;
    for (const b of budgets ?? []) {
      limit += Number(b.amount_limit);
      spent += spentByCategoryBudget[b.category_id] ?? 0;
    }
    budgetRemainingPct =
      limit > 0 ? Math.max(0, Math.min(100, ((limit - spent) / limit) * 100)) : 0;
  }

  const activeDates = new Set<string>();
  for (const e of streakEvents ?? []) {
    if (e.kind === "freeze_used") continue;
    activeDates.add(e.occurred_on);
  }
  for (const t of activityDays ?? []) {
    activeDates.add(t.occurred_on as string);
  }

  const dayCells: Array<{ date: string; active: boolean }> = [];
  for (let i = 27; i >= 0; i--) {
    const date = addDaysToISODate(localToday, -i);
    dayCells.push({ date, active: activeDates.has(date) });
  }

  const categorySpend = new Map<string, number>();
  for (const t of monthTx ?? []) {
    if (t.type !== "expense" || t.is_settlement) continue;
    const name =
      (t.categories as { name?: string } | null)?.name ?? "Sin categoría";
    categorySpend.set(
      name,
      (categorySpend.get(name) ?? 0) +
        toBase(Number(t.amount), currencyOf(t.account_id)),
    );
  }
  const categoryRows = [...categorySpend.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const monthlySaveRate = Math.max(0, monthIncome - monthExpense);

  const grouped = new Map<string, NonNullable<typeof recentTx>>();
  for (const tx of recentTx ?? []) {
    const day = tx.occurred_on as string;
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(tx);
  }

  const monthLabel = new Date(`${period.start}T12:00:00`).toLocaleDateString(
    "es",
    { month: "long", year: "numeric" },
  );

  const insightPoints = [
    budgetRemainingPct != null
      ? `Presupuesto: ${budgetRemainingPct.toFixed(0)}% restante`
      : "Sin presupuestos activos este mes",
    monthIncome > 0
      ? `Capacidad de ahorro ${(
          Math.max(0, ((monthIncome - monthExpense) / monthIncome) * 100)
        ).toFixed(0)}%`
      : "Registra ingresos para medir capacidad de ahorro",
    categoryRows[0]
      ? `Mayor impacto: ${categoryRows[0].name}`
      : "Sin gastos categorizados aún",
  ];

  return (
    <div className="fc-bento-grid">
      <div className="col-span-12 space-y-5 lg:col-span-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="fc-page-title text-lg md:text-xl">Inicio</h1>
            <p className="text-sm text-text-secondary">
              {monthLabel} · {baseCurrency}
            </p>
          </div>
          <ExpenseCaptureButton className="hidden sm:inline-flex" />
        </header>

        <InAppNotificationBanner items={notifs ?? []} />

        {hasAccounts ? (
          <>
            <QuickEntryBar
              categories={(categories ?? []).map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />

            <DashboardOverview
              available={available}
              monthExpense={monthExpense}
              monthIncome={monthIncome}
              baseCurrency={baseCurrency}
              healthScore={Number(
                freshProfile?.health_score ?? profile?.health_score ?? 50,
              )}
              streak={streakRow?.current_streak ?? 0}
              freezeTokens={streakRow?.freeze_tokens ?? 0}
              qualifiedToday={streakRow?.last_qualified_on === localToday}
              dayCells={dayCells}
              dayOfMonth={dayOfMonth}
              daysInMonth={daysInMonth}
              budgetRemainingPct={budgetRemainingPct}
            />

            <div className="grid gap-3 lg:grid-cols-2">
              <GoalsProgressStrip
                goals={(goals ?? []).map((g) => ({
                  id: g.id,
                  name: g.name,
                  target_amount: Number(g.target_amount),
                  current_amount: Number(g.current_amount),
                }))}
                baseCurrency={baseCurrency}
                monthlySaveRate={monthlySaveRate}
              />
              <CategoryImpactList
                rows={categoryRows}
                baseCurrency={baseCurrency}
              />
            </div>

            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Lectura rápida del período
              </p>
              <ol className="mt-3 space-y-2">
                {insightPoints.map((point, i) => (
                  <li
                    key={point}
                    className="flex gap-2 text-sm text-zinc-700"
                  >
                    <span className="font-mono text-xs text-zinc-400">
                      {i + 1}.
                    </span>
                    {point}
                  </li>
                ))}
              </ol>
            </section>
          </>
        ) : (
          <div className="fc-empty py-10 text-center">
            <p className="font-medium text-text">Crea tu primera cuenta</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">
              Sin una cuenta no podemos calcular tu balance ni registrar
              movimientos.
            </p>
            <Link href="/accounts" className="fc-btn-ai mt-6 inline-flex">
              Agregar cuenta
            </Link>
          </div>
        )}

        <InsightStories stories={stories ?? []} />
      </div>

      {hasAccounts ? (
        <section className="col-span-12 lg:col-span-4">
          <div className="mb-4 flex items-baseline justify-between gap-4 lg:sticky lg:top-24">
            <h2 className="text-sm font-medium leading-none text-text">
              Actividad reciente
            </h2>
            <Link href="/transactions" className="text-xs leading-none fc-link">
              Ver todo →
            </Link>
          </div>

          <OptimisticActivityRail />

          {(recentTx ?? []).length === 0 ? (
            <p className="text-sm text-text-muted">
              Sin movimientos. Pulsa{" "}
              <kbd className="rounded-lg border border-border/80 px-2 py-1 font-mono text-xs">
                N
              </kbd>{" "}
              o{" "}
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
                                  (tx.categories as { name?: string } | null)
                                    ?.name ||
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
                              {formatMoney(
                                toBase(
                                  Number(tx.amount),
                                  currencyOf(tx.account_id),
                                ),
                                baseCurrency,
                              )}
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
