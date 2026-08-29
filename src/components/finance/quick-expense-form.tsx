"use client";

import { useActionState, useState } from "react";
import { createIncomeExpenseAction } from "@/app/actions/finance";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { todayISODate } from "@/lib/finance/calculations";
import { STORAGE_KEYS } from "@/lib/brand/constants";
import type { ActionState } from "@/lib/utils/errors";

const initialState: ActionState = {};

type Option = { value: string; label: string };
type Defaults = { accountId?: string; categoryId?: string };

function readDefaults(): Defaults {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.lastExpense) ?? "{}") as Defaults;
  } catch {
    return {};
  }
}

function writeDefaults(accountId: string, categoryId: string) {
  localStorage.setItem(STORAGE_KEYS.lastExpense, JSON.stringify({ accountId, categoryId }));
}

export function QuickExpenseForm({
  accounts,
  categories,
  onSuccess,
}: {
  accounts: Option[];
  categories: Option[];
  onSuccess?: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [defaults] = useState<Defaults>(() => readDefaults());

  const defaultAccount =
    accounts.find((a) => a.value === defaults.accountId)?.value ??
    accounts[0]?.value;
  const defaultCategory =
    categories.find((c) => c.value === defaults.categoryId)?.value ??
    categories[0]?.value;

  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      formData.set("type", "expense");
      const result = await createIncomeExpenseAction(prev, formData);
      if (result.success) {
        const accountId = String(formData.get("accountId") ?? "");
        const categoryId = String(formData.get("categoryId") ?? "");
        if (accountId && categoryId) writeDefaults(accountId, categoryId);
        onSuccess?.();
      }
      return result;
    },
    initialState,
  );

  if (accounts.length === 0 || categories.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Crea una cuenta y una categoría de gasto para empezar.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}
      <input type="hidden" name="type" value="expense" />
      <input type="hidden" name="_quick" value="1" />
      {!showDetails ? (
        <input type="hidden" name="occurredOn" value={todayISODate()} />
      ) : null}

      <label className="block">
        <span className="fc-label">¿Cuánto?</span>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          autoFocus
          placeholder="0"
          className="fc-hero-amount mt-2 w-full border-0 border-b-2 border-border bg-transparent pb-2 outline-none focus:border-primary"
        />
        {state.fieldErrors?.amount?.[0] ? (
          <span className="mt-1 block text-xs text-danger">
            {state.fieldErrors.amount[0]}
          </span>
        ) : null}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          name="accountId"
          label="Cuenta"
          required
          options={accounts}
          defaultValue={defaultAccount}
          error={state.fieldErrors?.accountId?.[0]}
        />
        <Select
          name="categoryId"
          label="Categoría"
          required
          options={categories}
          defaultValue={defaultCategory}
          error={state.fieldErrors?.categoryId?.[0]}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className="text-sm text-text-secondary hover:text-text"
      >
        {showDetails ? "− Menos detalles" : "+ Añadir descripción o cambiar fecha"}
      </button>

      {showDetails ? (
        <div className="space-y-3 border-t border-border pt-3">
          <Input
            name="description"
            label="Descripción (opcional)"
            placeholder="Ej. Almuerzo, supermercado…"
            error={state.fieldErrors?.description?.[0]}
          />
          <Input
            name="occurredOn"
            type="date"
            label="Fecha"
            required
            defaultValue={todayISODate()}
            error={state.fieldErrors?.occurredOn?.[0]}
          />
        </div>
      ) : null}

      <Button type="submit" loading={pending} className="h-11 w-full text-base">
        Guardar gasto
      </Button>
    </form>
  );
}
