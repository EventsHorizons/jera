"use client";

import { contributeGoalAction } from "@/app/actions/finance";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ActionIcons } from "@/lib/ui/action-grammar";
import { formatMoney, todayISODate } from "@/lib/finance/calculations";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type ActiveGoal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
};

export function ActiveGoalCard({
  goal,
  baseCurrency,
  monthlySaveRate,
}: {
  goal: ActiveGoal;
  baseCurrency: string;
  monthlySaveRate: number;
}) {
  const router = useRouter();
  const [flash, setFlash] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pct =
    goal.target_amount > 0
      ? Math.min(100, (goal.current_amount / goal.target_amount) * 100)
      : 0;
  const remaining = Math.max(0, goal.target_amount - goal.current_amount);
  const completed = pct >= 100;
  const monthsLeft =
    monthlySaveRate > 0 ? Math.ceil(remaining / monthlySaveRate) : null;

  const contribute = (amount: number) => {
    if (!(amount > 0)) return;
    setMsg(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("goalId", goal.id);
      fd.set("amount", String(amount));
      fd.set("contributedOn", todayISODate());
      const res = await contributeGoalAction({}, fd);
      if (res.success) {
        setFlash(true);
        setMsg("Progreso actualizado.");
        window.setTimeout(() => setFlash(false), 1200);
        router.refresh();
      } else {
        setMsg(res.error ?? "No pudimos registrar el aporte.");
      }
    });
  };

  const GoalIcon = ActionIcons.finance.goal;
  const presets = [50, 100, 200];

  return (
    <section
      className={cn(
        "fc-card px-5 py-5 transition-colors duration-500 sm:px-6",
        flash && "ring-1 ring-primary/30 bg-primary-soft/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <GoalIcon className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div>
            <p className="fc-label">Meta activa</p>
            <h2 className="mt-0.5 text-base font-semibold text-text">{goal.name}</h2>
          </div>
        </div>
        <p className="font-mono text-xl font-semibold tabular-nums text-primary">
          {pct.toFixed(0)}%
        </p>
      </div>

      <ProgressBar value={pct} className="mt-4" />

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-sm tabular-nums text-text">
          {formatMoney(goal.current_amount, baseCurrency)}
          <span className="text-text-muted">
            {" "}
            / {formatMoney(goal.target_amount, baseCurrency)}
          </span>
        </p>
        {!completed ? (
          <p className="text-xs text-text-muted">
            Faltan {formatMoney(remaining, baseCurrency)}
            {monthsLeft != null
              ? ` · ~${monthsLeft} mes${monthsLeft === 1 ? "" : "es"}`
              : ""}
          </p>
        ) : (
          <p className="text-xs font-medium text-income">Meta completada</p>
        )}
      </div>

      {!completed ? (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {presets.map((n) => (
            <button
              key={n}
              type="button"
              disabled={pending}
              onClick={() => contribute(n)}
              className="h-8 rounded-[10px] border border-border px-2.5 font-mono text-xs text-text-secondary transition hover:border-primary/30 hover:bg-primary-soft disabled:opacity-50"
            >
              +{n}
            </button>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={() => contribute(monthlySaveRate > 0 ? Math.min(monthlySaveRate, remaining) : 50)}
            className="h-8 rounded-[10px] bg-primary px-3 text-xs font-medium text-on-primary transition hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Aportar"}
          </button>
          <Link
            href="/goals"
            className="ml-auto text-xs text-primary hover:text-primary-hover"
          >
            Ver metas →
          </Link>
        </div>
      ) : null}

      {msg ? (
        <p className="mt-3 text-xs text-text-secondary" role="status">
          {msg}
        </p>
      ) : null}
    </section>
  );
}
