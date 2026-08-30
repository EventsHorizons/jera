"use client";

import { budgetCheckinAction } from "@/app/actions/gamification";
import { useExpenseCapture } from "@/components/finance/expense-capture";
import { ActiveGoalCard, type ActiveGoal } from "@/components/finance/active-goal-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { ActionIcons } from "@/lib/ui/action-grammar";
import { formatMoney } from "@/lib/finance/calculations";
import { cn } from "@/lib/utils/cn";
import { ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ComponentType } from "react";

type DayCell = { date: string; active: boolean };

function greetingForHour() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function trendLabel(current: number, previous: number | null): string | null {
  if (previous == null || previous === 0) return null;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(delta) || Math.abs(delta) < 1) return null;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(0)}% vs. mes anterior`;
}

export function DashboardOverview({
  displayName,
  netWorth,
  available,
  reservedInGoals,
  monthExpense,
  monthIncome,
  prevMonthExpense,
  prevMonthIncome,
  baseCurrency,
  savingsCurrent,
  savingsTarget,
  activeGoal,
  monthlySaveRate,
  streak,
  qualifiedToday,
  dayCells,
  budgetRemainingPct,
}: {
  displayName?: string;
  netWorth: number;
  available: number;
  reservedInGoals: number;
  monthExpense: number;
  monthIncome: number;
  prevMonthExpense: number | null;
  prevMonthIncome: number | null;
  baseCurrency: string;
  savingsCurrent: number;
  savingsTarget: number;
  activeGoal: ActiveGoal | null;
  monthlySaveRate: number;
  streak: number;
  qualifiedToday: boolean;
  dayCells: DayCell[];
  budgetRemainingPct: number | null;
}) {
  const { open } = useExpenseCapture();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const monthlyNet = monthIncome - monthExpense;
  const prevNet =
    prevMonthIncome != null && prevMonthExpense != null
      ? prevMonthIncome - prevMonthExpense
      : null;
  const saveRatePct =
    monthIncome > 0 ? Math.max(0, (monthlySaveRate / monthIncome) * 100) : 0;
  const savingsPct =
    savingsTarget > 0
      ? Math.min(100, (savingsCurrent / savingsTarget) * 100)
      : saveRatePct;

  const CalendarIcon = ActionIcons.utility.calendar;
  const ExpenseIcon = ActionIcons.finance.expense;
  const firstName = displayName?.split(/\s+/)[0];

  return (
    <section className="space-y-5">
      {/* Game screen / financial HUD */}
      <div className="fc-hud fc-card px-5 py-6 sm:px-6 sm:py-7">
        {firstName ? (
          <p className="text-sm text-text-secondary">
            {greetingForHour()}, {firstName}
          </p>
        ) : null}

        <div
          className={cn(
            "grid gap-6 sm:grid-cols-[1.4fr_1fr]",
            firstName ? "mt-5" : "",
          )}
        >
          <div>
            <p className="fc-label">Patrimonio</p>
            <p className="fc-hero-amount mt-2">
              {formatMoney(netWorth, baseCurrency)}
            </p>
            {monthlyNet !== 0 ? (
              <p
                className={cn(
                  "mt-2 inline-flex items-center gap-1.5 text-sm font-medium",
                  monthlyNet >= 0 ? "text-income" : "text-text-secondary",
                )}
              >
                {monthlyNet >= 0 ? (
                  <ArrowDownLeft className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                {monthlyNet >= 0 ? "+" : ""}
                {formatMoney(monthlyNet, baseCurrency)} este mes
              </p>
            ) : null}
          </div>

          <div className="sm:border-l sm:border-border/80 sm:pl-6">
            <p className="fc-label">Disponible</p>
            <p className="fc-mono-amount mt-2 text-2xl font-semibold text-text">
              {formatMoney(available, baseCurrency)}
            </p>
            {reservedInGoals > 0 ? (
              <p className="mt-2 text-xs text-text-muted">
                {formatMoney(reservedInGoals, baseCurrency)} en metas
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {activeGoal ? (
        <ActiveGoalCard
          goal={activeGoal}
          baseCurrency={baseCurrency}
          monthlySaveRate={monthlySaveRate}
        />
      ) : savingsTarget > 0 ? (
        <div className="fc-card px-5 py-5 sm:px-6">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="fc-label">Progreso de ahorro</p>
              <p className="mt-2 text-sm text-text-secondary">
                {formatMoney(savingsCurrent, baseCurrency)} de{" "}
                {formatMoney(savingsTarget, baseCurrency)}
              </p>
            </div>
            <p className="font-mono text-lg font-semibold tabular-nums text-primary">
              {savingsPct.toFixed(0)}%
            </p>
          </div>
          <ProgressBar value={savingsPct} className="mt-4" />
          <Link
            href="/goals"
            className="mt-3 inline-block text-xs text-primary hover:text-primary-hover"
          >
            Ver metas →
          </Link>
        </div>
      ) : null}

      {/* Month pulse — how am I progressing? */}
      <div className="fc-card px-5 py-4 sm:px-6">
        <p className="fc-label">Este mes</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <PulseStat
            label="Ahorro"
            value={
              monthlySaveRate > 0
                ? formatMoney(monthlySaveRate, baseCurrency)
                : "—"
            }
            hint={
              monthIncome > 0
                ? `${saveRatePct.toFixed(0)}% de ingresos`
                : trendLabel(monthlyNet, prevNet)
            }
            positive={monthlySaveRate > 0}
            icon={TrendingUp}
          />
          <PulseStat
            label="Entradas"
            value={formatMoney(monthIncome, baseCurrency)}
            hint={trendLabel(monthIncome, prevMonthIncome) ?? undefined}
            icon={ActionIcons.finance.income}
          />
          <PulseStat
            label="Salidas"
            value={formatMoney(monthExpense, baseCurrency)}
            hint={trendLabel(monthExpense, prevMonthExpense) ?? undefined}
            icon={ActionIcons.finance.expense}
            neutral
          />
        </div>
        {budgetRemainingPct != null ? (
          <p className="mt-3 text-xs text-text-muted">
            Presupuesto: {budgetRemainingPct.toFixed(0)}% disponible
          </p>
        ) : null}
      </div>

      {/* Constancia — subtle, not gamified */}
      <details className="fc-card-muted group px-5 py-4">
        <summary className="cursor-pointer list-none text-sm font-medium text-text [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            Constancia
            <span className="text-xs font-normal text-text-muted">
              {streak > 0 ? `${streak}d` : "Expandir"}
            </span>
          </span>
        </summary>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-muted">
              {streak > 0
                ? `${streak} día${streak === 1 ? "" : "s"} revisando tus finanzas`
                : "Un minuto al día mantiene el control"}
            </p>
            <ConsistencyGraph cells={dayCells} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {qualifiedToday ? (
              <span className="rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                Revisión de hoy lista
              </span>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={pending}
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => {
                  startTransition(async () => {
                    const res = await budgetCheckinAction();
                    setMsg(res.success ?? res.error ?? null);
                    router.refresh();
                  });
                }}
              >
                <CalendarIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                Registrar revisión
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs"
              onClick={() => {
                const detail = { handled: false };
                document.dispatchEvent(
                  new CustomEvent("jera:focus-quick-entry", { detail }),
                );
                if (!detail.handled) open();
              }}
            >
              <ExpenseIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              Agregar gasto
            </Button>
          </div>
          {msg ? <p className="text-xs text-text-muted">{msg}</p> : null}
        </div>
      </details>
    </section>
  );
}

function PulseStat({
  label,
  value,
  hint,
  icon: Icon,
  positive,
  neutral,
}: {
  label: string;
  value: string;
  hint?: string | null;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  positive?: boolean;
  neutral?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            "h-3 w-3",
            positive ? "text-income" : "text-text-muted",
          )}
          strokeWidth={1.75}
        />
        <p className="text-[11px] text-text-muted">{label}</p>
      </div>
      <p
        className={cn(
          "fc-mono-amount mt-1 text-sm font-semibold",
          positive && "text-income",
          !positive && !neutral && "text-text",
          neutral && "text-text",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function GoalsProgressStrip({
  goals,
  baseCurrency,
  monthlySaveRate,
  excludeGoalId,
}: {
  goals: Array<{
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
  }>;
  baseCurrency: string;
  monthlySaveRate: number;
  excludeGoalId?: string;
}) {
  const filtered = excludeGoalId
    ? goals.filter((g) => g.id !== excludeGoalId)
    : goals;
  if (filtered.length === 0) return null;

  return (
    <section className="fc-card px-5 py-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="fc-label">Otras metas</p>
        <Link href="/goals" className="text-xs text-primary hover:text-primary-hover">
          Ver todas →
        </Link>
      </div>
      <ul className="space-y-4">
        {filtered.map((g) => {
          const pct =
            g.target_amount > 0
              ? Math.min(100, (g.current_amount / g.target_amount) * 100)
              : 0;
          return (
            <li key={g.id}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium text-text">{g.name}</p>
                <p className="shrink-0 font-mono text-xs tabular-nums text-primary">
                  {pct.toFixed(0)}%
                </p>
              </div>
              <ProgressBar value={pct} className="mt-2" />
              <p className="mt-1.5 text-xs text-text-muted">
                {formatMoney(g.current_amount, baseCurrency)} de{" "}
                {formatMoney(g.target_amount, baseCurrency)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function CategoryImpactList({
  rows,
  baseCurrency,
}: {
  rows: Array<{ id?: string; name: string; amount: number }>;
  baseCurrency: string;
}) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.amount), 1);
  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <section className="fc-card px-5 py-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="fc-label">Dónde va tu dinero</p>
        <p className="font-mono text-xs tabular-nums text-text-muted">
          {formatMoney(total, baseCurrency)}
        </p>
      </div>
      <ul className="space-y-3">
        {rows.slice(0, 5).map((r) => (
          <li key={r.id ?? r.name}>
            {r.id ? (
              <Link
                href={`/transactions?category=${encodeURIComponent(r.id)}`}
                className="block rounded-lg transition hover:opacity-80"
              >
                <CategoryRow
                  name={r.name}
                  amount={r.amount}
                  max={max}
                  baseCurrency={baseCurrency}
                />
              </Link>
            ) : (
              <CategoryRow
                name={r.name}
                amount={r.amount}
                max={max}
                baseCurrency={baseCurrency}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CategoryRow({
  name,
  amount,
  max,
  baseCurrency,
}: {
  name: string;
  amount: number;
  max: number;
  baseCurrency: string;
}) {
  return (
    <>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="truncate text-sm text-text">{name}</span>
        <span className="shrink-0 font-mono text-xs tabular-nums text-text-secondary">
          {formatMoney(amount, baseCurrency)}
        </span>
      </div>
      <ProgressBar
        value={(amount / max) * 100}
        fillClassName="!bg-border"
        className="!h-1"
      />
    </>
  );
}

function ConsistencyGraph({ cells }: { cells: DayCell[] }) {
  const weeks = useMemo(() => {
    const rows: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [cells]);

  return (
    <div className="flex gap-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((cell) => (
            <div
              key={cell.date}
              title={cell.date}
              className={cn(
                "h-2.5 w-2.5 rounded-[3px] transition-colors",
                cell.active ? "bg-primary" : "bg-border",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardMetricsSkeleton() {
  return (
    <section className="animate-pulse space-y-5">
      <div className="fc-card px-6 py-7">
        <div className="h-3 w-28 rounded bg-surface-muted" />
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="h-9 w-48 rounded bg-surface-muted" />
          <div className="h-7 w-36 rounded bg-surface-muted" />
        </div>
      </div>
      <div className="fc-card px-6 py-5">
        <div className="h-3 w-24 rounded bg-surface-muted" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded bg-surface-muted" />
          ))}
        </div>
      </div>
    </section>
  );
}
