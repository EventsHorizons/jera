"use client";

import { useState } from "react";
import { deleteBudgetAction } from "@/app/actions/finance";
import {
  BudgetEditForm,
  BudgetForm,
} from "@/components/finance/management-forms";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { EmptyPanel } from "@/components/ui/empty-panel";
import { PageHeader } from "@/components/ui/page-header";
import {
  DeleteFormAction,
  EditAction,
  RowActions,
} from "@/components/ui/row-actions";
import {
  budgetProgress,
  formatMoney,
} from "@/lib/finance/calculations";
import { Plus } from "lucide-react";
import Link from "next/link";

type BudgetRow = {
  id: string;
  category_id: string;
  amount_limit: number;
  period_month: number;
  period_year: number;
  categories: { name?: string } | null;
};

export function BudgetsClient({
  budgets,
  expenseCategories,
  spentByCategory,
  periodLabel,
}: {
  budgets: BudgetRow[];
  expenseCategories: Array<{ id: string; name: string }>;
  spentByCategory: Record<string, number>;
  periodLabel: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const totalLimit = budgets.reduce((sum, b) => sum + Number(b.amount_limit), 0);
  const totalSpent = budgets.reduce(
    (sum, b) => sum + (spentByCategory[b.category_id] ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Presupuestos"
        description={periodLabel}
        action={
          <Button
            type="button"
            size="icon"
            icon={<Plus className="h-4 w-4" strokeWidth={2} />}
            aria-label="Nuevo presupuesto"
            onClick={() => setCreateOpen(true)}
          />
        }
      />

      {budgets.length > 0 ? (
        <div className="fc-panel">
          <p className="fc-label">Resumen</p>
          <p className="fc-mono-amount mt-3 text-2xl font-semibold leading-none tracking-tight">
            {formatMoney(totalSpent)}{" "}
            <span className="text-base font-normal text-text-muted">
              / {formatMoney(totalLimit)}
            </span>
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all"
              style={{
                width: `${totalLimit > 0 ? Math.min(100, (totalSpent / totalLimit) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {budgets.length === 0 ? (
        <EmptyPanel
          title="Sin presupuestos"
          description="Define un límite por categoría para controlar tu gasto mensual."
          actionLabel="Crear presupuesto"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => {
            const spent = spentByCategory[budget.category_id] ?? 0;
            const { remaining, percent, over } = budgetProgress(
              Number(budget.amount_limit),
              spent,
            );
            const name = budget.categories?.name ?? "Categoría";

            return (
              <article key={budget.id} className="fc-panel">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-none text-text">{name}</p>
                    <p className="fc-mono-amount mt-2 text-sm text-text-secondary">
                      {formatMoney(spent)}{" "}
                      <span className="text-text-muted">
                        / {formatMoney(Number(budget.amount_limit))}
                      </span>
                    </p>
                    <p
                      className={`mt-1 text-xs font-medium ${
                        over ? "text-expense" : "text-text-secondary"
                      }`}
                    >
                      {over ? "Superado" : `${formatMoney(remaining)} restantes`}
                    </p>
                  </div>
                  <RowActions>
                    <EditAction
                      active={editingId === budget.id}
                      onClick={() =>
                        setEditingId(editingId === budget.id ? null : budget.id)
                      }
                    />
                    <DeleteFormAction action={deleteBudgetAction} id={budget.id} />
                  </RowActions>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      over ? "bg-expense" : percent >= 80 ? "bg-warning" : "bg-zinc-900"
                    }`}
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
                {editingId === budget.id ? (
                  <div className="mt-4 border-t border-border/80 pt-4">
                    <BudgetEditForm
                      budget={budget}
                      expenseCategories={expenseCategories}
                    />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <nav className="flex flex-wrap gap-2 border-t border-border/80 pt-6">
        <Link href="/goals" className="fc-btn-ai-secondary h-9 px-3 text-xs">
          Metas
        </Link>
        <Link href="/debts" className="fc-btn-ai-secondary h-9 px-3 text-xs">
          Deudas
        </Link>
        <Link href="/recurring" className="fc-btn-ai-secondary h-9 px-3 text-xs">
          Recurrentes
        </Link>
      </nav>

      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nuevo presupuesto"
      >
        <BudgetForm expenseCategories={expenseCategories} />
      </Drawer>
    </div>
  );
}
