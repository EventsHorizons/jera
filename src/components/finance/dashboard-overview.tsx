"use client";

import { budgetCheckinAction } from "@/app/actions/gamification";
import { contributeGoalAction } from "@/app/actions/finance";
import { useExpenseCapture } from "@/components/finance/expense-capture";
import { Button } from "@/components/ui/button";
import { formatMoney, todayISODate } from "@/lib/finance/calculations";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type DayCell = { date: string; active: boolean };

export function DashboardOverview({
  available,
  monthExpense,
  monthIncome,
  baseCurrency,
  healthScore,
  streak,
  freezeTokens,
  qualifiedToday,
  dayCells,
  dayOfMonth,
  daysInMonth,
  budgetRemainingPct,
}: {
  available: number;
  monthExpense: number;
  monthIncome: number;
  baseCurrency: string;
  healthScore: number;
  streak: number;
  freezeTokens: number;
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

  const saveCapacity =
    monthIncome > 0
      ? Math.max(0, ((monthIncome - monthExpense) / monthIncome) * 100)
      : 0;

  const paceExpected =
    daysInMonth > 0 ? (dayOfMonth / daysInMonth) * 100 : 0;
  const budgetHealth =
    budgetRemainingPct == null
      ? Math.round(healthScore)
      : Math.round(budgetRemainingPct);

  const paceLabel =
    budgetRemainingPct == null
      ? "Sin presupuestos este mes"
      : budgetRemainingPct >= 100 - paceExpected
        ? "Dentro del ritmo"
        : "Por encima del ritmo";

  return (
    <section className="space-y-4">
      {/* Primary metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Saldo disponible"
          value={formatMoney(available, baseCurrency)}
          tone="neutral"
        />
        <MetricCard
          label="Ritmo de gasto (mes)"
          value={formatMoney(monthExpense, baseCurrency)}
          hint={`Día ${dayOfMonth} de ${daysInMonth}`}
          tone="expense"
        />
        <MetricCard
          label="Capacidad de ahorro"
          value={`${saveCapacity.toFixed(0)}%`}
          hint={
            monthIncome > 0
              ? `${formatMoney(Math.max(0, monthIncome - monthExpense), baseCurrency)} neto`
              : "Sin ingresos registrados"
          }
          tone="income"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        {/* Financial health */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Salud financiera
              </p>
              <p className="mt-1 text-sm text-zinc-600">{paceLabel}</p>
            </div>
            <p className="font-mono text-2xl font-semibold tabular-nums text-zinc-900">
              {budgetHealth}
              <span className="text-sm font-normal text-zinc-400">%</span>
            </p>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                budgetHealth >= 60
                  ? "bg-emerald-500"
                  : budgetHealth >= 35
                    ? "bg-zinc-400"
                    : "bg-rose-500",
              )}
              style={{ width: `${Math.min(100, Math.max(0, budgetHealth))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Presupuesto restante vs. avance del mes · índice compuesto {Math.round(healthScore)}
          </p>
        </div>

        {/* Consistency / streak */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Constancia
            </p>
            <p className="font-mono text-sm font-semibold text-zinc-900">
              {streak}d
              {freezeTokens > 0 ? (
                <span className="ml-2 font-sans text-xs font-normal text-zinc-400">
                  · {freezeTokens} reserva
                </span>
              ) : null}
            </p>
          </div>
          <ConsistencyGraph cells={dayCells} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {qualifiedToday ? (
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                Hoy registrado
              </span>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={pending}
                className="h-8 px-3 text-xs"
                onClick={() => {
                  startTransition(async () => {
                    const res = await budgetCheckinAction();
                    setMsg(res.success ?? res.error ?? null);
                    router.refresh();
                  });
                }}
              >
                Revisión
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => {
                const detail = { handled: false };
                document.dispatchEvent(
                  new CustomEvent("jera:focus-quick-entry", { detail }),
                );
                if (!detail.handled) open();
              }}
            >
              Gasto · N
            </Button>
          </div>
          {msg ? <p className="mt-2 text-xs text-zinc-500">{msg}</p> : null}
        </div>
      </div>
    </section>
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
        setMsg(res.success);
        setCustomByGoal((prev) => ({ ...prev, [goalId]: "" }));
        router.refresh();
      } else {
        setMsg(res.error ?? "No se pudo registrar el aporte.");
      }
    });
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          Objetivos de ahorro
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/recurring"
            className="text-xs text-action hover:text-action-hover"
          >
            Recurrente
          </Link>
          <Link href="/goals" className="text-xs text-zinc-500 hover:text-zinc-800">
            Ver todos →
          </Link>
        </div>
      </div>
      <ul className="space-y-4">
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
                <p className="truncate text-sm font-medium text-zinc-900">
                  {g.name}
                </p>
                <p className="shrink-0 font-mono text-xs tabular-nums text-zinc-500">
                  {pct.toFixed(0)}%
                </p>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-zinc-900 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-400">
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
                    className="h-7 rounded-md border border-zinc-200 px-2 font-mono text-[11px] text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
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
                  className="h-7 w-16 rounded-md border border-zinc-200 bg-zinc-50 px-2 font-mono text-[11px] outline-none focus:border-action"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const n = Number.parseFloat(customByGoal[g.id] ?? "");
                    if (Number.isFinite(n) && n > 0) contribute(g.id, n);
                  }}
                  className="h-7 rounded-md bg-action px-2 text-[11px] font-medium text-white transition hover:bg-action-hover disabled:opacity-50"
                >
                  Aportar
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {msg ? <p className="mt-3 text-xs text-zinc-500">{msg}</p> : null}
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
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          Impacto por categoría
        </p>
        <p className="font-mono text-xs tabular-nums text-zinc-400">
          {formatMoney(total, baseCurrency)}
        </p>
      </div>
      <ul className="space-y-2.5">
        {rows.slice(0, 6).map((r) => {
          const inner = (
            <>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm text-zinc-700">{r.name}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-500">
                  {formatMoney(r.amount, baseCurrency)}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-zinc-400"
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
                  className="block rounded-md transition hover:opacity-80"
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

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "neutral" | "expense" | "income";
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums",
          tone === "expense" && "text-zinc-900",
          tone === "income" && "text-emerald-600",
          tone === "neutral" && "text-zinc-900",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-zinc-400">{hint}</p> : null}
    </div>
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
    <div className="mt-3 flex gap-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((cell) => (
            <div
              key={cell.date}
              title={cell.date}
              className={cn(
                "h-2.5 w-2.5 rounded-[3px]",
                cell.active ? "bg-zinc-900" : "bg-zinc-100",
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
    <section className="animate-pulse space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="h-3 w-24 rounded bg-zinc-100" />
            <div className="mt-3 h-7 w-32 rounded bg-zinc-100" />
            <div className="mt-2 h-3 w-20 rounded bg-zinc-50" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="h-28 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="h-3 w-28 rounded bg-zinc-100" />
          <div className="mt-6 h-1.5 rounded-full bg-zinc-100" />
        </div>
        <div className="h-28 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="h-3 w-20 rounded bg-zinc-100" />
          <div className="mt-4 flex gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-2.5 w-2.5 rounded-[3px] bg-zinc-100" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
