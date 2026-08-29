import { ExpenseCaptureButton } from "@/components/finance/expense-capture";
import { GamificationHud } from "@/components/finance/gamification-hud";
import { InAppNotificationBanner } from "@/components/finance/in-app-notification-banner";
import { InsightStories } from "@/components/finance/insight-stories";
import {
  OptimisticActivityRail,
  ReactiveMoneyCards,
} from "@/components/finance/reactive-money";
import { SpendingTrend } from "@/components/finance/spending-trend";
import { seedStreakRiskNotification } from "@/app/actions/gamification";
import { getProfile, requireUser } from "@/lib/auth/session";
import {
  addDaysToISODate,
  currentMonthPeriod,
  formatMoney,
} from "@/lib/finance/calculations";
import { convertAmount, fetchUsdRates } from "@/lib/finance/fx";
import { levelFromXp, todayInTimezone } from "@/lib/finance/gamification";
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
  return date.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" });
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

  await supabase.rpc("generate_due_recurring_transactions", { p_as_of: today });
  await seedStreakRiskNotification(user.id).catch(() => undefined);
  // Soft refresh health if stale (>12h) or null
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
    { data: weekTx },
    { data: todayTx },
    { data: streakRow },
    { data: progressRow },
    { data: stories },
    { data: notifs },
    { data: freshProfile },
  ] = await Promise.all([
    supabase.rpc("get_accounts_with_balance"),
    supabase
      .from("transactions")
      .select("type, amount, is_settlement, reimburses_transaction_id, category_id, account_id")
      .eq("user_id", user.id)
      .gte("occurred_on", period.start)
      .lt("occurred_on", period.endExclusive),
    supabase
      .from("transactions")
      .select("id, type, amount, occurred_on, description, account_id, categories(name)")
      .eq("user_id", user.id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("transactions")
      .select("amount, occurred_on, account_id")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .eq("is_settlement", false)
      .gte("occurred_on", addDaysToISODate(today, -6))
      .lte("occurred_on", today),
    supabase
      .from("transactions")
      .select("amount, account_id")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .eq("is_settlement", false)
      .eq("occurred_on", today),
    supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_progress").select("*").eq("user_id", user.id).maybeSingle(),
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
  ]);

  const levelInfo = levelFromXp(progressRow?.xp_total ?? 0);

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

  const availableRows = activeAccounts.map((a) => ({
    amount: Number(a.current_balance),
    currency: a.currency,
  }));
  const monthExpenseRows = (monthTx ?? [])
    .filter((t) => t.type === "expense" && !t.is_settlement)
    .map((t) => ({
      amount: Number(t.amount),
      currency: currencyOf(t.account_id),
    }));
  const monthIncomeRows = (monthTx ?? [])
    .filter((t) => t.type === "income" && !t.is_settlement)
    .map((t) => ({
      amount: Number(t.amount),
      currency: currencyOf(t.account_id),
    }));
  const todayExpenseRows = (todayTx ?? []).map((t) => ({
    amount: Number(t.amount),
    currency: currencyOf(t.account_id),
  }));

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
    spendByDay.set(
      key,
      (spendByDay.get(key) ?? 0) + toBase(Number(tx.amount), currencyOf(tx.account_id)),
    );
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

  const monthLabel = new Date(`${period.start}T12:00:00`).toLocaleDateString("es", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fc-bento-grid">
      <div className="col-span-12 space-y-6 lg:col-span-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="fc-page-title text-lg md:text-xl">Inicio</h1>
            <p className="text-sm leading-relaxed text-text-secondary">
              Impacto de {monthLabel} en {baseCurrency}.
            </p>
          </div>
          <ExpenseCaptureButton className="hidden sm:inline-flex" />
        </header>

        <InAppNotificationBanner items={notifs ?? []} />

        <GamificationHud
          streak={streakRow?.current_streak ?? 0}
          freezeTokens={streakRow?.freeze_tokens ?? 0}
          qualifiedToday={streakRow?.last_qualified_on === localToday}
          healthScore={Number(freshProfile?.health_score ?? profile?.health_score ?? 50)}
          xpTotal={progressRow?.xp_total ?? 0}
          level={levelInfo.level}
          levelName={levelInfo.name}
          nextXp={levelInfo.nextXp}
        />

        <InsightStories stories={stories ?? []} />

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
            <ReactiveMoneyCards
              available={availableRows}
              monthExpense={monthExpenseRows}
              monthIncome={monthIncomeRows}
              todayExpense={todayExpenseRows}
            />

            <SpendingTrend points={trendPoints} currency={baseCurrency} />
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

          <OptimisticActivityRail />

          {(recentTx ?? []).length === 0 ? (
            <p className="text-sm text-text-muted">
              Sin movimientos. Pulsa + o{" "}
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
                              {formatMoney(
                                toBase(Number(tx.amount), currencyOf(tx.account_id)),
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
