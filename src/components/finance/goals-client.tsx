"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { deleteGoalAction } from "@/app/actions/finance";
import {
  GoalContributeForm,
  GoalEditForm,
  GoalForm,
} from "@/components/finance/management-forms";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { EmptyPanel } from "@/components/ui/empty-panel";
import { PageHeader } from "@/components/ui/page-header";
import { formatMoney, goalProgress } from "@/lib/finance/calculations";

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  status: string;
};

export function GoalsClient({
  goals,
  baseCurrency = "USD",
}: {
  goals: Goal[];
  baseCurrency?: string;
}) {
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contributeId, setContributeId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setCreateOpen(true);
    }
  }, [searchParams]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Metas de ahorro"
        description="Define hacia qué estás ahorrando y cuánto te falta."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Nueva meta
          </Button>
        }
      />

      {goals.length === 0 ? (
        <EmptyPanel
          title="Aún no tienes metas"
          description="Define algo que quieras alcanzar — un viaje, un fondo de emergencia o cualquier objetivo."
          actionLabel="Crear meta"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="space-y-8">
          {goals.map((goal) => {
            const { remaining, percent, completed } = goalProgress(
              Number(goal.current_amount),
              Number(goal.target_amount),
            );

            return (
              <article key={goal.id} className="border-b border-border pb-8 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text">{goal.name}</p>
                    <p className="fc-amount mt-1 text-2xl font-semibold">
                      {formatMoney(Number(goal.current_amount), baseCurrency)}
                      <span className="text-base font-normal text-text-muted">
                        {" "}
                        / {formatMoney(Number(goal.target_amount), baseCurrency)}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {completed
                        ? "Meta completada"
                        : `Faltan ${formatMoney(remaining, baseCurrency)} · ${percent.toFixed(0)}%`}
                      {goal.target_date ? ` · Objetivo ${goal.target_date}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-sm">
                    <button
                      type="button"
                      className="fc-link font-medium"
                      onClick={() =>
                        setContributeId(contributeId === goal.id ? null : goal.id)
                      }
                    >
                      Aportar
                    </button>
                    <button
                      type="button"
                      className="text-text-secondary hover:text-text"
                      onClick={() =>
                        setEditingId(editingId === goal.id ? null : goal.id)
                      }
                    >
                      Editar
                    </button>
                    <form action={deleteGoalAction}>
                      <input type="hidden" name="id" value={goal.id} />
                      <button type="submit" className="text-text-muted hover:text-danger">
                        Eliminar
                      </button>
                    </form>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
                {contributeId === goal.id ? (
                  <div className="mt-4 max-w-sm">
                    <GoalContributeForm goalId={goal.id} />
                  </div>
                ) : null}
                {editingId === goal.id ? (
                  <div className="mt-4">
                    <GoalEditForm goal={goal} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <Drawer open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva meta">
        <GoalForm />
      </Drawer>
    </div>
  );
}
