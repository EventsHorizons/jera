"use client";

import { useActionState, useState } from "react";
import {
  archiveDebtAction,
  archiveGoalAction,
  completeGoalAction,
  contributeGoalAction,
  createBudgetAction,
  createCategoryAction,
  createDebtAction,
  createGoalAction,
  deleteCategoryAction,
  markDebtPaidAction,
  payDebtAction,
  updateBudgetAction,
  updateCategoryAction,
  updateDebtAction,
  updateGoalAction,
} from "@/app/actions/finance";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DeleteFormAction,
  EditAction,
  RowActions,
} from "@/components/ui/row-actions";
import { Select } from "@/components/ui/select";
import {
  currentMonthPeriod,
  todayISODate,
} from "@/lib/finance/calculations";
import type { ActionState } from "@/lib/utils/errors";

const initialState: ActionState = {};

export function CategoryForm({
  parents,
}: {
  parents: Array<{ id: string; name: string; kind: string }>;
}) {
  const [state, formAction, pending] = useActionState(createCategoryAction, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-border bg-surface p-4">
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}
      <Input name="name" label="Nombre" required />
      <Select
        name="kind"
        label="Tipo"
        options={[
          { value: "expense", label: "Gasto" },
          { value: "income", label: "Ingreso" },
        ]}
      />
      <Select
        name="parentId"
        label="Subcategoría de (opcional)"
        options={[
          { value: "", label: "Ninguna (categoría raíz)" },
          ...parents.map((p) => ({
            value: p.id,
            label: `${p.name} (${p.kind})`,
          })),
        ]}
      />
      <Button type="submit" loading={pending} variant="secondary">
        Crear
      </Button>
    </form>
  );
}

export function BudgetForm({
  expenseCategories,
}: {
  expenseCategories: Array<{ id: string; name: string }>;
}) {
  const period = currentMonthPeriod();
  const [state, formAction, pending] = useActionState(createBudgetAction, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-border bg-surface p-4">
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}
      <Select
        name="categoryId"
        label="Categoría"
        options={[
          { value: "", label: "Selecciona…" },
          ...expenseCategories.map((c) => ({ value: c.id, label: c.name })),
        ]}
        required
      />
      <Input name="amountLimit" label="Límite" type="number" step="0.01" min="0.01" required />
      <div className="grid grid-cols-2 gap-3">
        <Input name="periodMonth" label="Mes" type="number" min={1} max={12} defaultValue={period.month} required />
        <Input name="periodYear" label="Año" type="number" min={2000} defaultValue={period.year} required />
      </div>
      <Button type="submit" loading={pending}>
        Crear
      </Button>
    </form>
  );
}

export function GoalForm() {
  const [state, formAction, pending] = useActionState(createGoalAction, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-border bg-surface p-4">
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}
      <Input name="name" label="Nombre" required />
      <Input name="targetAmount" label="Monto objetivo" type="number" step="0.01" min="0.01" required />
      <Input name="targetDate" label="Fecha objetivo (opcional)" type="date" />
      <Button type="submit" loading={pending}>
        Crear
      </Button>
    </form>
  );
}

export function GoalContributeForm({ goalId }: { goalId: string }) {
  const [state, formAction, pending] = useActionState(contributeGoalAction, initialState);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="goalId" value={goalId} />
      <input type="hidden" name="contributedOn" value={todayISODate()} />
      <Input name="amount" label="Aporte" type="number" step="0.01" min="0.01" required className="w-32" />
      <Button type="submit" loading={pending} variant="secondary">
        Aportar
      </Button>
      {state.error ? <span className="w-full text-xs text-danger">{state.error}</span> : null}
      {state.success ? <span className="w-full text-xs text-success">{state.success}</span> : null}
    </form>
  );
}

export function DebtForm({
  accounts,
}: {
  accounts: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(createDebtAction, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-border bg-surface p-4">
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}
      <Input name="name" label="Nombre" required />
      <Input name="creditor" label="Acreedor (opcional)" />
      <Input name="originalAmount" label="Monto original" type="number" step="0.01" min="0.01" required />
      <Input name="installmentAmount" label="Cuota (opcional)" type="number" step="0.01" min="0" />
      <Input name="nextPaymentDate" label="Próximo pago (opcional)" type="date" />
      <Select
        name="linkedAccountId"
        label="Cuenta vinculada (opcional)"
        options={[
          { value: "", label: "Ninguna" },
          ...accounts.map((a) => ({ value: a.id, label: a.name })),
        ]}
      />
      <Input name="notes" label="Notas (opcional)" />
      <Button type="submit" loading={pending}>
        Crear
      </Button>
    </form>
  );
}

export function DebtPayForm({
  debtId,
  accounts,
}: {
  debtId: string;
  accounts: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(payDebtAction, initialState);

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="debtId" value={debtId} />
      <input type="hidden" name="paidOn" value={todayISODate()} />
      <div className="flex flex-wrap items-end gap-2">
        <Input name="amount" label="Pago" type="number" step="0.01" min="0.01" required className="w-32" />
        <Select
          name="accountId"
          label="Desde cuenta"
          options={[
            { value: "", label: "Selecciona…" },
            ...accounts.map((a) => ({ value: a.id, label: a.name })),
          ]}
          required
        />
        <Button type="submit" loading={pending} variant="secondary">
          Pagar
        </Button>
      </div>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-success">{state.success}</p> : null}
    </form>
  );
}

export function CategoryList({
  categories,
}: {
  categories: Array<{
    id: string;
    name: string;
    kind: string;
    parent_id: string | null;
    is_system?: boolean;
  }>;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [updateState, updateAction, updating] = useActionState(
    updateCategoryAction,
    initialState,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteCategoryAction,
    initialState,
  );

  return (
    <div className="space-y-2">
      {updateState.error || deleteState.error ? (
        <Alert variant="error">{updateState.error || deleteState.error}</Alert>
      ) : null}
      {updateState.success || deleteState.success ? (
        <Alert variant="success">
          {updateState.success || deleteState.success}
        </Alert>
      ) : null}
      <ul className="space-y-1 text-sm text-text-secondary">
        {categories.map((c) => (
          <li key={c.id} className="border-b border-border py-2">
            <div className="flex items-center justify-between gap-2">
              <span>
                {c.parent_id ? "↳ " : ""}
                {c.name}
                <span className="ml-2 text-xs text-text-muted">{c.kind}</span>
              </span>
              <RowActions>
                <EditAction
                  active={editId === c.id}
                  onClick={() => setEditId(editId === c.id ? null : c.id)}
                />
                {!c.is_system ? (
                  <DeleteFormAction action={deleteAction} id={c.id} disabled={deleting} />
                ) : null}
              </RowActions>
            </div>
            {editId === c.id ? (
              <form action={updateAction} className="mt-2 flex gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input
                  name="name"
                  defaultValue={c.name}
                  className="h-8 flex-1 rounded border border-border bg-background px-2 text-sm"
                  required
                />
                <Button type="submit" loading={updating} variant="secondary">
                  Guardar
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BudgetEditForm({
  budget,
  expenseCategories,
}: {
  budget: {
    id: string;
    category_id: string;
    amount_limit: number;
    period_month: number;
    period_year: number;
  };
  expenseCategories: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(updateBudgetAction, initialState);

  return (
    <form action={formAction} className="mt-3 space-y-2 border-t border-border pt-3">
      <input type="hidden" name="id" value={budget.id} />
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}
      <Select
        name="categoryId"
        label="Categoría"
        defaultValue={budget.category_id}
        options={expenseCategories.map((c) => ({ value: c.id, label: c.name }))}
      />
      <Input
        name="amountLimit"
        label="Límite"
        type="number"
        step="0.01"
        min="0.01"
        defaultValue={budget.amount_limit}
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          name="periodMonth"
          label="Mes"
          type="number"
          min={1}
          max={12}
          defaultValue={budget.period_month}
          required
        />
        <Input
          name="periodYear"
          label="Año"
          type="number"
          min={2000}
          defaultValue={budget.period_year}
          required
        />
      </div>
      <Button type="submit" loading={pending} variant="secondary">
        Guardar
      </Button>
    </form>
  );
}

export function GoalEditForm({
  goal,
}: {
  goal: {
    id: string;
    name: string;
    target_amount: number;
    target_date: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(updateGoalAction, initialState);

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="id" value={goal.id} />
        {state.error ? <Alert variant="error">{state.error}</Alert> : null}
        {state.success ? <Alert variant="success">{state.success}</Alert> : null}
        <Input name="name" label="Nombre" defaultValue={goal.name} required />
        <Input
          name="targetAmount"
          label="Objetivo"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={goal.target_amount}
          required
        />
        <Input
          name="targetDate"
          label="Fecha objetivo"
          type="date"
          defaultValue={goal.target_date ?? ""}
        />
        <Button type="submit" loading={pending} variant="secondary">
          Guardar
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <form action={completeGoalAction}>
          <input type="hidden" name="id" value={goal.id} />
          <Button type="submit" variant="ghost">
            Completar
          </Button>
        </form>
        <form action={archiveGoalAction}>
          <input type="hidden" name="id" value={goal.id} />
          <Button type="submit" variant="ghost">
            Archivar
          </Button>
        </form>
      </div>
    </div>
  );
}

export function DebtEditForm({
  debt,
  accounts,
}: {
  debt: {
    id: string;
    name: string;
    creditor: string | null;
    original_amount: number;
    installment_amount: number | null;
    next_payment_date: string | null;
    notes: string | null;
    linked_account_id: string | null;
  };
  accounts: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(updateDebtAction, initialState);

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="id" value={debt.id} />
        {state.error ? <Alert variant="error">{state.error}</Alert> : null}
        {state.success ? <Alert variant="success">{state.success}</Alert> : null}
        <Input name="name" label="Nombre" defaultValue={debt.name} required />
        <Input name="creditor" label="Acreedor" defaultValue={debt.creditor ?? ""} />
        <Input
          name="originalAmount"
          label="Monto original"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={debt.original_amount}
          required
        />
        <Input
          name="installmentAmount"
          label="Cuota"
          type="number"
          step="0.01"
          min="0"
          defaultValue={debt.installment_amount ?? ""}
        />
        <Input
          name="nextPaymentDate"
          label="Próximo pago"
          type="date"
          defaultValue={debt.next_payment_date ?? ""}
        />
        <Select
          name="linkedAccountId"
          label="Cuenta vinculada"
          defaultValue={debt.linked_account_id ?? ""}
          options={[
            { value: "", label: "Ninguna" },
            ...accounts.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
        <Input name="notes" label="Notas" defaultValue={debt.notes ?? ""} />
        <Button type="submit" loading={pending} variant="secondary">
          Guardar
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <form action={markDebtPaidAction}>
          <input type="hidden" name="id" value={debt.id} />
          <Button type="submit" variant="ghost">
            Marcar pagada
          </Button>
        </form>
        <form action={archiveDebtAction}>
          <input type="hidden" name="id" value={debt.id} />
          <Button type="submit" variant="ghost">
            Archivar
          </Button>
        </form>
      </div>
    </div>
  );
}
