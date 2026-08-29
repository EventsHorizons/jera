"use client";

import { useActionState } from "react";
import {
  updateAdjustmentAction,
  updateIncomeExpenseAction,
  updateTransferAction,
} from "@/app/actions/finance";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ActionState } from "@/lib/utils/errors";
import Link from "next/link";

const initialState: ActionState = {};

type AccountOption = { id: string; name: string; currency: string };
type CategoryOption = { id: string; name: string; kind: string };

export function EditTransactionForm({
  transaction,
  accounts,
  categories,
}: {
  transaction: {
    id: string;
    type: "income" | "expense" | "transfer" | "adjustment";
    amount: number;
    occurred_on: string;
    description: string | null;
    note: string | null;
    account_id: string | null;
    counterparty_account_id: string | null;
    category_id: string | null;
    adjustment_direction: "increase" | "decrease" | null;
    adjustment_reason: string | null;
  };
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.name} (${a.currency})`,
  }));

  if (transaction.type === "income" || transaction.type === "expense") {
    const ie = transaction as typeof transaction & {
      type: "income" | "expense";
    };
    return (
      <EditIncomeExpense
        transaction={ie}
        accountOptions={accountOptions}
        categories={categories.filter((c) => c.kind === ie.type)}
      />
    );
  }

  if (transaction.type === "transfer") {
    return (
      <EditTransfer transaction={transaction} accountOptions={accountOptions} />
    );
  }

  return (
    <EditAdjustment transaction={transaction} accountOptions={accountOptions} />
  );
}

function EditIncomeExpense({
  transaction,
  accountOptions,
  categories,
}: {
  transaction: {
    id: string;
    type: "income" | "expense";
    amount: number;
    occurred_on: string;
    description: string | null;
    note: string | null;
    account_id: string | null;
    category_id: string | null;
  };
  accountOptions: Array<{ value: string; label: string }>;
  categories: CategoryOption[];
}) {
  const [state, formAction, pending] = useActionState(
    updateIncomeExpenseAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <input type="hidden" name="id" value={transaction.id} />
      <input type="hidden" name="type" value={transaction.type} />
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="amount"
          label="Monto"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={transaction.amount}
          required
        />
        <Input
          name="occurredOn"
          label="Fecha"
          type="date"
          defaultValue={transaction.occurred_on}
          required
        />
      </div>
      <Select
        name="accountId"
        label="Cuenta"
        defaultValue={transaction.account_id ?? ""}
        options={accountOptions}
        required
      />
      <Select
        name="categoryId"
        label="Categoría"
        defaultValue={transaction.category_id ?? ""}
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        required
      />
      <Input
        name="description"
        label="Descripción"
        defaultValue={transaction.description ?? ""}
      />
      <Input name="note" label="Nota" defaultValue={transaction.note ?? ""} />
      <div className="flex gap-3">
        <Button type="submit" loading={pending}>
          Guardar cambios
        </Button>
        <Link
          href="/transactions"
          className="inline-flex h-10 items-center rounded-full border border-border/80 bg-surface-muted px-4 text-sm text-text-secondary hover:bg-zinc-100"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function EditTransfer({
  transaction,
  accountOptions,
}: {
  transaction: {
    id: string;
    amount: number;
    occurred_on: string;
    description: string | null;
    note: string | null;
    account_id: string | null;
    counterparty_account_id: string | null;
  };
  accountOptions: Array<{ value: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    updateTransferAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <input type="hidden" name="id" value={transaction.id} />
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="amount"
          label="Monto"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={transaction.amount}
          required
        />
        <Input
          name="occurredOn"
          label="Fecha"
          type="date"
          defaultValue={transaction.occurred_on}
          required
        />
      </div>
      <Select
        name="fromAccountId"
        label="Desde"
        defaultValue={transaction.account_id ?? ""}
        options={accountOptions}
        required
      />
      <Select
        name="toAccountId"
        label="Hacia"
        defaultValue={transaction.counterparty_account_id ?? ""}
        options={accountOptions}
        required
      />
      <Input
        name="description"
        label="Descripción"
        defaultValue={transaction.description ?? ""}
      />
      <Input name="note" label="Nota" defaultValue={transaction.note ?? ""} />
      <div className="flex gap-3">
        <Button type="submit" loading={pending}>
          Guardar transferencia
        </Button>
        <Link
          href="/transactions"
          className="inline-flex h-10 items-center rounded-full border border-border/80 bg-surface-muted px-4 text-sm text-text-secondary hover:bg-zinc-100"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function EditAdjustment({
  transaction,
  accountOptions,
}: {
  transaction: {
    id: string;
    amount: number;
    occurred_on: string;
    account_id: string | null;
    adjustment_direction: "increase" | "decrease" | null;
    adjustment_reason: string | null;
  };
  accountOptions: Array<{ value: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    updateAdjustmentAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <input type="hidden" name="id" value={transaction.id} />
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="amount"
          label="Monto"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={transaction.amount}
          required
        />
        <Input
          name="occurredOn"
          label="Fecha"
          type="date"
          defaultValue={transaction.occurred_on}
          required
        />
      </div>
      <Select
        name="accountId"
        label="Cuenta"
        defaultValue={transaction.account_id ?? ""}
        options={accountOptions}
        required
      />
      <Select
        name="direction"
        label="Dirección"
        defaultValue={transaction.adjustment_direction ?? "increase"}
        options={[
          { value: "increase", label: "Aumentar saldo" },
          { value: "decrease", label: "Disminuir saldo" },
        ]}
        required
      />
      <Input
        name="reason"
        label="Motivo"
        defaultValue={transaction.adjustment_reason ?? ""}
        required
        minLength={5}
      />
      <div className="flex gap-3">
        <Button type="submit" loading={pending}>
          Guardar ajuste
        </Button>
        <Link
          href="/transactions"
          className="inline-flex h-10 items-center rounded-full border border-border/80 bg-surface-muted px-4 text-sm text-text-secondary hover:bg-zinc-100"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
