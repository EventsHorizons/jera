"use client";

import { budgetCheckinAction } from "@/app/actions/gamification";
import { contributeGoalAction } from "@/app/actions/finance";
import { useExpenseCapture } from "@/components/finance/expense-capture";
import { Button } from "@/components/ui/button";
import { ActionIcons } from "@/lib/ui/action-grammar";
import { formatMoney, todayISODate } from "@/lib/finance/calculations";
import { cn } from "@/lib/utils/cn";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
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

export function DashboardOverview({
  displayName,
  available,
  monthExpense,
  monthIncome,
  baseCurrency,
  savingsCurrent,
  savingsTarget,
  streak,
  qualifiedToday,
  dayCells,
  dayOfMonth,
  daysInMonth,
  budgetRemainingPct,
}: {
  displayName?: string;
  available: number;
  monthExpense: number;
  monthIncome: number;
  baseCurrency: string;
  savingsCurrent: number;
  savingsTarget: number;
  streak: number;
  qualifiedToday: boolean;
  dayCells: DayCell[];
  dayOfMonth: number;
  daysInMonth: number;
  budgetRemainingPct: number | null;
}) {
  const { open } = useExpenseCapture();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const monthlyNet = monthIncome - monthExpense;
  const reservedThisMonth = Math.max(0, monthlyNet);
  const savingsPct =
    savingsTarget > 0
      ? Math.min(100, (savingsCurrent / savingsTarget) * 100)
      : monthIncome > 0
        ? Math.min(100, (reservedThisMonth / monthIncome) * 100)
        : 0;

  const savingsLabel =
    savingsTarget > 0
      ? `${formatMoney(savingsCurrent, baseCurrency)} de ${formatMoney(savingsTarget, baseCurrency)}`
      : monthIncome > 0
        ? `${formatMoney(reservedThisMonth, baseCurrency)} reservado este mes`
        : "Registra ingresos para medir tu progreso";

  const CalendarIcon = ActionIcons.utility.calendar;
  const ExpenseIcon = ActionIcons.finance.expense;
  const firstName = displayName?.split(/\s+/)[0];

  return (
    <section className="space-y-6">
      {/* Hero — calm, not shouting */}
      <div className="fc-card px-5 py-6 sm:px-6 sm:py-7">
        {firstName ? (
          <p className="text-sm text-text-secondary">
            {greetingForHour()}, {firstName}
          </p>
        ) : null}
        <p className={cn("fc-label", firstName ? "mt-4" : "")}>
          Dinero disponible
        </p>
        <p className="fc-hero-amount mt-2">{formatMoney(available, baseCurrency)}</p>
        {monthIncome > 0 || monthExpense > 0 ? (
          <p
            className={cn(
              "mt-3 inline-flex items-center gap-1.5 text-sm font-medium",
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
        ) : (
          <p className="mt-3 text-sm text-text-muted">
            Sin movimientos registrados este mes
          </p>
        )}
      </div>

      {/* Savings as progress, not deprivation */}
      <div className="fc-card px-5 py-5 sm:px-6">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="fc-label">Progreso de ahorro</p>
            <p className="mt-2 text-sm text-text-secondary">{savingsLabel}</p>
          </div>
          <p className="font-mono text-lg font-semibold tabular-nums text-primary">
            {savingsPct.toFixed(0)}%
          </p>
        </div>
        <div className="fc-progress-track mt-4">
          <div
            className="fc-progress-fill"
            style={{ width: `${Math.max(0, savingsPct)}%` }}
          />
        </div>
        {budgetRemainingPct != null ? (
          <p className="mt-3 text-xs text-text-muted">
            Presupuesto: {budgetRemainingPct.toFixed(0)}% disponible · día{" "}
            {dayOfMonth} de {daysInMonth}
          </p>
        ) : null}
      </div>

      {/* Month context — neutral information */}
      <div className="grid grid-cols-2 gap-3">
        <MonthStat
          label="Entradas del mes"
          value={formatMoney(monthIncome, baseCurrency)}
          icon={ActionIcons.finance.income}
        />
        <MonthStat
          label="Salidas del mes"
          value={formatMoney(monthExpense, baseCurrency)}
          icon={ActionIcons.finance.expense}
        />
      </div>

      {/* Subtle habit tracking */}
      <div className="fc-card-muted px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text">Constancia</p>
            <p className="mt-0.5 text-xs text-text-muted">
              {streak > 0
                ? `${streak} día${streak === 1 ? "" : "s"} seguidos revisando tus finanzas`
                : "Un minuto al día mantiene el control"}
            </p>
          </div>
          <ConsistencyGraph cells={dayCells} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
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
            <kbd className="hidden rounded border border-border bg-surface px-1 font-mono text-[10px] text-text-muted sm:inline">
              N
            </kbd>
          </Button>
        </div>
        {msg ? <p className="mt-2 text-xs text-text-muted">{msg}</p> : null}
      </div>
    </section>
  );
}

function MonthStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="fc-card px-4 py-4">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.75} />
        <p className="text-xs text-text-muted">{label}</p>
      </div>
      <p className="fc-mono-amount mt-2 text-lg font-semibold text-text">{value}</p>
    </div>
  );
}

export function GoalsProgressStrip({
  goals,
  baseCurrency,
  monthlySaveRate,
}: {
  goals: Array<{
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
  }>;
  baseCurrency: string;
  monthlySaveRate: number;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [customByGoal, setCustomByGoal] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (goals.length === 0) return null;

  const presets = [10, 50, 100];

  const contribute = (goalId: string, amount: number) => {
    if (!(amount > 0)) return;
    setPendingId(goalId);
    setMsg(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("goalId", goalId);
      fd.set("amount", String(amount));
      fd.set("contributedOn", todayISODate());
      const res = await contributeGoalAction({}, fd);
      setPendingId(null);
      if (res.success) {
        setMsg("Aporte registrado.");
        setCustomByGoal((prev) => ({ ...prev, [goalId]: "" }));
        router.refresh();
      } else {
        setMsg(res.error ?? "No pudimos registrar el aporte.");
      }
    });
  };

  return (
    <section className="fc-card px-5 py-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="fc-label">Metas de ahorro</p>
        <Link href="/goals" className="text-xs text-primary hover:text-primary-hover">
          Ver todas →
        </Link>
      </div>
      <ul className="space-y-5">
        {goals.map((g) => {
          const pct =
            g.target_amount > 0
              ? Math.min(100, (g.current_amount / g.target_amount) * 100)
              : 0;
          const remaining = Math.max(0, g.target_amount - g.current_amount);
          const monthsLeft =
            monthlySaveRate > 0
              ? Math.ceil(remaining / monthlySaveRate)
              : null;
          const busy = pending && pendingId === g.id;
          return (
            <li key={g.id}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium text-text">{g.name}</p>
                <p className="shrink-0 font-mono text-xs tabular-nums text-primary">
                  {pct.toFixed(0)}%
                </p>
              </div>
              <div className="fc-progress-track mt-2">
                <div
                  className="fc-progress-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-text-muted">
                {formatMoney(g.current_amount, baseCurrency)} de{" "}
                {formatMoney(g.target_amount, baseCurrency)}
                {monthsLeft != null
                  ? ` · ~${monthsLeft} mes${monthsLeft === 1 ? "" : "es"} al ritmo actual`
                  : ""}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {presets.map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={busy}
                    onClick={() => contribute(g.id, n)}
                    className="h-7 rounded-[10px] border border-border px-2 font-mono text-[11px] text-text-secondary transition hover:border-primary/30 hover:bg-primary-soft disabled:opacity-50"
                  >
                    +{n}
                  </button>
                ))}
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Otro"
                  value={customByGoal[g.id] ?? ""}
                  onChange={(e) =>
                    setCustomByGoal((prev) => ({
                      ...prev,
                      [g.id]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const n = Number.parseFloat(customByGoal[g.id] ?? "");
                      if (Number.isFinite(n) && n > 0) contribute(g.id, n);
                    }
                  }}
                  className="h-7 w-16 rounded-[10px] border border-border bg-surface px-2 font-mono text-[11px] outline-none focus:border-primary/40"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const n = Number.parseFloat(customByGoal[g.id] ?? "");
                    if (Number.isFinite(n) && n > 0) contribute(g.id, n);
                  }}
                  className="h-7 rounded-[10px] bg-primary px-2.5 text-[11px] font-medium text-on-primary transition hover:bg-primary-hover disabled:opacity-50"
                >
                  Aportar
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {msg ? <p className="mt-3 text-xs text-text-muted">{msg}</p> : null}
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
        {rows.slice(0, 6).map((r) => {
          const inner = (
            <>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm text-text">{r.name}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-text-secondary">
                  {formatMoney(r.amount, baseCurrency)}
                </span>
              </div>
              <div className="fc-progress-track h-1">
                <div
                  className="h-full rounded-full bg-border transition-all duration-300"
                  style={{ width: `${(r.amount / max) * 100}%` }}
                />
              </div>
            </>
          );
          return (
            <li key={r.id ?? r.name}>
              {r.id ? (
                <Link
                  href={`/transactions?category=${encodeURIComponent(r.id)}`}
                  className="block rounded-lg transition hover:opacity-80"
                >
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </section>
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
    <section className="animate-pulse space-y-6">
      <div className="fc-card px-6 py-7">
        <div className="h-3 w-28 rounded bg-surface-muted" />
        <div className="mt-6 h-9 w-48 rounded bg-surface-muted" />
        <div className="mt-3 h-4 w-32 rounded bg-surface-muted" />
      </div>
      <div className="fc-card px-6 py-5">
        <div className="h-3 w-32 rounded bg-surface-muted" />
        <div className="mt-4 h-1.5 rounded-full bg-surface-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="fc-card px-4 py-4">
            <div className="h-3 w-24 rounded bg-surface-muted" />
            <div className="mt-3 h-6 w-28 rounded bg-surface-muted" />
          </div>
        ))}
      </div>
    </section>
  );
}
