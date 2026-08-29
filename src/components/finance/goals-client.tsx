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
import {
  ContributeAction,
  DeleteFormAction,
  EditAction,
  RowActions,
} from "@/components/ui/row-actions";
import { formatMoney, goalProgress } from "@/lib/finance/calculations";
import { Plus } from "lucide-react";

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
        title="Metas"
        description="Objetivos de ahorro y avance."
        action={
          <Button
            type="button"
            size="icon"
            icon={<Plus className="h-4 w-4" strokeWidth={2} />}
            aria-label="Nueva meta"
            onClick={() => setCreateOpen(true)}
          />
        }
      />

      {goals.length === 0 ? (
        <EmptyPanel
          title="Sin metas"
          description="Define un objetivo — viaje, fondo de emergencia o cualquier meta."
          actionLabel="Crear meta"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="space-y-6">
          {goals.map((goal) => {
            const { remaining, percent, completed } = goalProgress(
              Number(goal.current_amount),
              Number(goal.target_amount),
            );

            return (
              <article
                key={goal.id}
                className="rounded-xl border border-border/80 bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
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
                        ? "Completada"
                        : `${formatMoney(remaining, baseCurrency)} restantes · ${percent.toFixed(0)}%`}
                      {goal.target_date ? ` · ${goal.target_date}` : ""}
                    </p>
                  </div>
                  <RowActions>
                    <ContributeAction
                      active={contributeId === goal.id}
                      onClick={() =>
                        setContributeId(
                          contributeId === goal.id ? null : goal.id,
                        )
                      }
                    />
                    <EditAction
                      active={editingId === goal.id}
                      onClick={() =>
                        setEditingId(editingId === goal.id ? null : goal.id)
                      }
                    />
                    <DeleteFormAction action={deleteGoalAction} id={goal.id} />
                  </RowActions>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
                {contributeId === goal.id ? (
                  <div className="mt-4 max-w-sm">
                    <GoalContributeForm goalId={goal.id} />
                  </div>
                ) : null}
                {editingId === goal.id ? (
                  <div className="mt-4 border-t border-border/80 pt-4">
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
