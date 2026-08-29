"use client";

import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils/cn";

type Achievement = {
  id: string;
  name: string;
  description: string;
  unlockedAt: string | null;
};

export function AchievementsClient({
  achievements,
  streak,
  longest,
  xp,
  level,
  cohortOptIn,
  healthScore,
  baseCurrency,
}: {
  achievements: Achievement[];
  streak: number;
  longest: number;
  xp: number;
  level: number;
  cohortOptIn: boolean;
  healthScore: number;
  baseCurrency: string;
}) {
  // Local percentile preview until cohort n≥50 — based on health only.
  const band =
    healthScore >= 80 ? "top 20%" : healthScore >= 60 ? "20–40%" : "mid";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Progreso"
        description="Medallas, nivel y comparación anónima (si activaste cohorte)."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="fc-panel">
          <p className="fc-label">Nivel</p>
          <p className="mt-2 text-2xl font-semibold">{level}</p>
          <p className="text-sm text-text-muted">{xp} XP</p>
        </div>
        <div className="fc-panel">
          <p className="fc-label">Racha</p>
          <p className="mt-2 text-2xl font-semibold">{streak}</p>
          <p className="text-sm text-text-muted">Máxima {longest}</p>
        </div>
        <div className="fc-panel">
          <p className="fc-label">Energía</p>
          <p className="mt-2 text-2xl font-semibold">{Math.round(healthScore)}</p>
          <p className="text-sm text-text-muted">{baseCurrency}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-text">Medallas</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {achievements.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-2xl border px-4 py-3",
                a.unlockedAt
                  ? "border-border/80 bg-surface"
                  : "border-border/50 bg-surface-muted/40 opacity-60",
              )}
            >
              <p className="text-xs text-text-muted">{a.id}</p>
              <p className="font-medium text-text">{a.name}</p>
              <p className="mt-1 text-sm text-text-secondary">{a.description}</p>
              {a.unlockedAt ? (
                <p className="mt-2 text-xs text-success">
                  Desbloqueada {new Date(a.unlockedAt).toLocaleDateString("es")}
                </p>
              ) : (
                <p className="mt-2 text-xs text-text-muted">Bloqueada</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-border/80 p-4">
        <h2 className="text-sm font-medium text-text">Tu cohorte</h2>
        {cohortOptIn ? (
          <>
            <p className="text-sm text-text-secondary">
              Vista previa local: banda estimada <strong>{band}</strong> según tu
              energía (hasta tener n≥50 agregados reales en {baseCurrency}).
            </p>
            <p className="text-xs text-text-muted">
              Sin nombres ni montos de otras personas.
            </p>
          </>
        ) : (
          <p className="text-sm text-text-secondary">
            Activa la comparación anónima en Ajustes → perfil para ver percentiles.
          </p>
        )}
      </section>
    </div>
  );
}
