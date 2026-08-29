"use client";

import { useActionState, useState } from "react";
import {
  createAdjustmentAction,
  createIncomeExpenseAction,
  createTransferAction,
} from "@/app/actions/finance";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { todayISODate } from "@/lib/finance/calculations";
import type { ActionState } from "@/lib/utils/errors";

const initialState: ActionState = {};

type AccountOption = { id: string; name: string; currency: string };
type CategoryOption = { id: string; name: string; kind: string; parent_id?: string | null };

export function TransactionForm({
  accounts,
  categories,
  recentExpenses = [],
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  recentExpenses?: Array<{ id: string; label: string }>;
}) {
  const [mode, setMode] = useState<"income" | "expense" | "transfer" | "adjustment">(
    "expense",
  );

  const incomeCats = categories.filter((c) => c.kind === "income");
  const expenseCats = categories.filter((c) => c.kind === "expense");
  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.name} (${a.currency})`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["expense", "Gasto"],
            ["income", "Ingreso"],
            ["transfer", "Transferencia"],
            ["adjustment", "Ajuste"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-full px-4 py-2 text-sm transition active:scale-[0.98] ${
              mode === value
                ? "bg-zinc-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "border border-border/80 text-text-secondary hover:bg-surface-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "income" || mode === "expense" ? (
        <IncomeExpenseForm
          type={mode}
          accountOptions={accountOptions}
          categoryOptions={(mode === "income" ? incomeCats : expenseCats).map((c) => ({
            value: c.id,
            label: c.name,
          }))}
          expenseOptions={recentExpenses.map((e) => ({
            value: e.id,
            label: e.label,
          }))}
        />
      ) : null}

      {mode === "transfer" ? (
        <TransferForm accountOptions={accountOptions} />
      ) : null}

      {mode === "adjustment" ? (
        <AdjustmentForm accountOptions={accountOptions} />
      ) : null}
    </div>
  );
}

function IncomeExpenseForm({
  type,
  accountOptions,
  categoryOptions,
  expenseOptions = [],
}: {
  type: "income" | "expense";
  accountOptions: Array<{ value: string; label: string }>;
  categoryOptions: Array<{ value: string; label: string }>;
  expenseOptions?: Array<{ value: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    createIncomeExpenseAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="type" value={type} />
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {type === "expense" ? (
        <p className="text-xs text-text-muted">
          Gasto con tarjeta de crédito: elige la cuenta de la tarjeta. El banco no
          baja hasta que registres un pago (transferencia banco → tarjeta).
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="amount"
          label="Monto"
          type="number"
          step="0.01"
          min="0.01"
          required
          error={state.fieldErrors?.amount?.[0]}
        />
        <Input
          name="occurredOn"
          label="Fecha"
          type="date"
          defaultValue={todayISODate()}
          required
        />
      </div>
      <Select
        name="accountId"
        label="Cuenta"
        options={[{ value: "", label: "Selecciona…" }, ...accountOptions]}
        required
        error={state.fieldErrors?.accountId?.[0]}
      />
      <Select
        name="categoryId"
        label="Categoría"
        options={[{ value: "", label: "Selecciona…" }, ...categoryOptions]}
        required
        error={state.fieldErrors?.categoryId?.[0]}
      />
      {type === "income" && expenseOptions.length > 0 ? (
        <Select
          name="reimbursesTransactionId"
          label="Reembolso de gasto (opcional)"
          options={[
            { value: "", label: "No es un reembolso" },
            ...expenseOptions,
          ]}
        />
      ) : null}
      <Input name="description" label="Descripción (opcional)" />
      <Input name="note" label="Nota (opcional)" />
      <Button type="submit" loading={pending}>
        Guardar {type === "income" ? "ingreso" : "gasto"}
      </Button>
    </form>
  );
}

function TransferForm({
  accountOptions,
}: {
  accountOptions: Array<{ value: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState(createTransferAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      <p className="text-xs text-text-muted">
        Transferir a una tarjeta o préstamo registra un pago de obligación (no un
        gasto nuevo). Entre cuentas propias no cuenta como ingreso ni gasto.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="amount"
          label="Monto"
          type="number"
          step="0.01"
          min="0.01"
          required
          error={state.fieldErrors?.amount?.[0]}
        />
        <Input
          name="occurredOn"
          label="Fecha"
          type="date"
          defaultValue={todayISODate()}
          required
        />
      </div>
      <Select
        name="fromAccountId"
        label="Desde"
        options={[{ value: "", label: "Selecciona…" }, ...accountOptions]}
        required
      />
      <Select
        name="toAccountId"
        label="Hacia"
        options={[{ value: "", label: "Selecciona…" }, ...accountOptions]}
        required
        error={state.fieldErrors?.toAccountId?.[0]}
      />
      <Input name="description" label="Descripción (opcional)" />
      <Button type="submit" loading={pending}>
        Transferir
      </Button>
    </form>
  );
}

function AdjustmentForm({
  accountOptions,
}: {
  accountOptions: Array<{ value: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    createAdjustmentAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      <Alert variant="info">
        Usa ajustes solo para corregir diferencias reales. No cuentan como ingreso ni gasto.
      </Alert>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="amount"
          label="Monto"
          type="number"
          step="0.01"
          min="0.01"
          required
        />
        <Input
          name="occurredOn"
          label="Fecha"
          type="date"
          defaultValue={todayISODate()}
          required
        />
      </div>
      <Select
        name="accountId"
        label="Cuenta"
        options={[{ value: "", label: "Selecciona…" }, ...accountOptions]}
        required
      />
      <Select
        name="direction"
        label="Dirección"
        options={[
          { value: "increase", label: "Aumentar saldo" },
          { value: "decrease", label: "Disminuir saldo" },
        ]}
        required
      />
      <Input
        name="reason"
        label="Motivo"
        required
        minLength={5}
        error={state.fieldErrors?.reason?.[0]}
      />
      <Button type="submit" loading={pending}>
        Registrar ajuste
      </Button>
    </form>
  );
}
