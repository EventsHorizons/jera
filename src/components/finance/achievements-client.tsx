"use client";

import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
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
  healthScore,
  cohortOptIn,
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
  const unlocked = achievements.filter((a) => a.unlockedAt);
  const band =
    healthScore >= 80 ? "alta" : healthScore >= 60 ? "media" : "en construcción";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tu progreso"
        description="Constancia, estabilidad e hitos personales — sin puntos artificiales."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="fc-panel">
          <p className="fc-label">Constancia</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{streak}</p>
          <p className="text-sm text-text-muted">
            días seguidos · máx. {longest}
          </p>
        </div>
        <div className="fc-panel">
          <p className="fc-label">Estabilidad</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {Math.round(healthScore)}
          </p>
          <ProgressBar value={healthScore} className="mt-3" />
          <p className="mt-2 text-xs text-text-muted capitalize">{band}</p>
        </div>
        <div className="fc-panel">
          <p className="fc-label">Hitos</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {unlocked.length}
            <span className="text-base font-normal text-text-muted">
              /{achievements.length}
            </span>
          </p>
          <p className="text-sm text-text-muted">logros personales</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-text">Hitos personales</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {achievements.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-2xl border px-4 py-3 transition",
                a.unlockedAt
                  ? "border-primary/20 bg-primary-soft/30"
                  : "border-border/50 bg-surface-muted/40",
              )}
            >
              <p className="font-medium text-text">{a.name}</p>
              <p className="mt-1 text-sm text-text-secondary">{a.description}</p>
              {a.unlockedAt ? (
                <p className="mt-2 text-xs text-income">
                  Alcanzado {new Date(a.unlockedAt).toLocaleDateString("es")}
                </p>
              ) : (
                <p className="mt-2 text-xs text-text-muted">Por alcanzar</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="fc-card-muted space-y-2 px-5 py-4">
        <h2 className="text-sm font-medium text-text">Comparación anónima</h2>
        {cohortOptIn ? (
          <>
            <p className="text-sm text-text-secondary">
              Tu estabilidad está en banda <strong>{band}</strong> respecto a
              usuarios similares ({baseCurrency}). Sin nombres ni montos ajenos.
            </p>
            <p className="text-xs text-text-muted">
              Vista estimada hasta tener suficientes datos agregados.
            </p>
          </>
        ) : (
          <p className="text-sm text-text-secondary">
            Activa la comparación anónima en Ajustes si quieres contexto
            adicional sobre tu ritmo.
          </p>
        )}
      </section>
    </div>
  );
}
