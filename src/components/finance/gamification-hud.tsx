"use client";

import { budgetCheckinAction } from "@/app/actions/gamification";
import { Button } from "@/components/ui/button";
import { healthTone, LEVEL_THRESHOLDS } from "@/lib/finance/gamification";
import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function GamificationHud({
  streak,
  freezeTokens,
  qualifiedToday,
  healthScore,
  xpTotal,
  level,
  levelName,
  nextXp,
}: {
  streak: number;
  freezeTokens: number;
  qualifiedToday: boolean;
  healthScore: number;
  xpTotal: number;
  level: number;
  levelName: string;
  nextXp: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const tone = healthTone(healthScore);
  const currentFloor =
    LEVEL_THRESHOLDS.find((r) => r.level === level)?.xp ?? 0;
  const xpProgress =
    nextXp && nextXp > currentFloor
      ? Math.min(
          100,
          Math.round(((xpTotal - currentFloor) / (nextXp - currentFloor)) * 100),
        )
      : 100;

  return (
    <section className="space-y-4 rounded-2xl border border-border/80 bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="fc-label">Racha</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="fc-mono-amount text-3xl font-semibold tracking-tight">
              {streak}
            </span>
            <span className="text-sm text-text-secondary">días</span>
            {freezeTokens > 0 ? (
              <span className="rounded-lg border border-border/80 px-2 py-0.5 text-xs text-text-muted">
                {freezeTokens} escudo{freezeTokens === 1 ? "" : "s"}
              </span>
            ) : null}
          </p>
          {!qualifiedToday ? (
            <p className="mt-1 text-xs text-text-muted">Aún no cuenta hoy</p>
          ) : (
            <p className="mt-1 text-xs text-success">Día contado</p>
          )}
        </div>
        <div className="min-w-[10rem] flex-1 sm:max-w-xs">
          <div className="flex items-baseline justify-between gap-2">
            <p className="fc-label">Energía Jera</p>
            <span className="fc-mono-amount text-sm font-semibold">
              {Math.round(healthScore)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                tone === "stable" && "bg-zinc-900",
                tone === "attention" && "bg-zinc-500",
                tone === "critical" && "bg-expense",
              )}
              style={{ width: `${Math.min(100, Math.max(0, healthScore))}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {tone === "stable"
              ? "Estable"
              : tone === "attention"
                ? "Atención"
                : "Empecemos por un check-in"}
          </p>
        </div>
        <div className="min-w-[8rem]">
          <p className="fc-label">
            Nivel {level} · {levelName}
          </p>
          <p className="mt-1 fc-mono-amount text-sm font-medium">{xpTotal} XP</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all duration-300"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>
      </div>

      {!qualifiedToday ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            loading={pending}
            onClick={() => {
              startTransition(async () => {
                const res = await budgetCheckinAction();
                setMessage(res.success ?? res.error ?? null);
                router.refresh();
              });
            }}
          >
            Revisar presupuesto (check-in)
          </Button>
          {message ? (
            <span className="text-xs text-text-secondary">{message}</span>
          ) : (
            <span className="text-xs text-text-muted">
              1 tap protege tu racha sin registrar un gasto.
            </span>
          )}
        </div>
      ) : null}
    </section>
  );
}
