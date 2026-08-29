"use client";

import {
  updateCohortOptInAction,
  updateNotificationPrefsAction,
} from "@/app/actions/gamification";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useActionState } from "react";
import type { ActionState } from "@/lib/utils/errors";

const initial: ActionState = {};

export function EngagementSettingsForm({
  cohortOptIn,
  prefs,
}: {
  cohortOptIn: boolean;
  prefs: {
    streak_alerts: boolean;
    budget_alerts: boolean;
    insight_alerts: boolean;
    cohort_alerts: boolean;
    quiet_hours: boolean;
  };
}) {
  const [cohortState, cohortAction, cohortPending] = useActionState(
    updateCohortOptInAction,
    initial,
  );
  const [prefState, prefAction, prefPending] = useActionState(
    updateNotificationPrefsAction,
    initial,
  );

  return (
    <div className="max-w-lg space-y-8">
      <form action={cohortAction} className="space-y-3">
        <h3 className="text-sm font-medium text-text">Comparación anónima</h3>
        <p className="text-sm text-text-secondary">
          Opt-in para verte frente a perfiles similares (percentiles, sin nombres
          ni montos de terceros). Mínimo n≥50 por celda.
        </p>
        {cohortState.error ? <Alert variant="error">{cohortState.error}</Alert> : null}
        {cohortState.success ? (
          <Alert variant="success">{cohortState.success}</Alert>
        ) : null}
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="cohort_opt_in"
            value="on"
            defaultChecked={cohortOptIn}
            className="h-4 w-4 rounded border-border"
          />
          Participar en cohorte anónima
        </label>
        <Button type="submit" loading={cohortPending} variant="secondary">
          Guardar cohorte
        </Button>
      </form>

      <form action={prefAction} className="space-y-3">
        <h3 className="text-sm font-medium text-text">Avisos in-app</h3>
        <p className="text-sm text-text-secondary">
          Cap: máximo 3 avisos/día. Horas quietas 22:00–08:00 si están activas.
        </p>
        {prefState.error ? <Alert variant="error">{prefState.error}</Alert> : null}
        {prefState.success ? (
          <Alert variant="success">{prefState.success}</Alert>
        ) : null}
        {(
          [
            ["streak_alerts", "Racha en riesgo", prefs.streak_alerts],
            ["budget_alerts", "Presupuesto", prefs.budget_alerts],
            ["insight_alerts", "Insights", prefs.insight_alerts],
            ["cohort_alerts", "Resumen de cohorte", prefs.cohort_alerts],
            ["quiet_hours", "Horas quietas", prefs.quiet_hours],
          ] as const
        ).map(([name, label, checked]) => (
          <label key={name} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name={name}
              value="on"
              defaultChecked={checked}
              className="h-4 w-4 rounded border-border"
            />
            {label}
          </label>
        ))}
        <Button type="submit" loading={prefPending}>
          Guardar avisos
        </Button>
      </form>
    </div>
  );
}
