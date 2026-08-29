"use client";

import { useActionState } from "react";
import {
  createFirstAccountAction,
  skipOnboardingAction,
} from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BASE_CURRENCIES } from "@/lib/finance/currencies";

import type { ActionState } from "@/lib/utils/errors";

const initialState: ActionState = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    createFirstAccountAction,
    initialState,
  );

  return (
    <div className="space-y-4">
      <form
        action={formAction}
        className="space-y-4 rounded-xl border border-border bg-surface p-6"
      >
        {state.error ? <Alert variant="error">{state.error}</Alert> : null}
        <Input
          name="name"
          label="Nombre de la cuenta"
          placeholder="Ej. Banco principal"
          required
          error={state.fieldErrors?.name?.[0]}
        />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-text-secondary">Tipo</span>
          <select
            name="type"
            className="h-10 rounded-lg border border-border bg-surface px-3 text-text"
            defaultValue="bank"
          >
            <option value="bank">Cuenta bancaria</option>
            <option value="savings">Ahorro</option>
            <option value="cash">Efectivo</option>
            <option value="credit_card">Tarjeta de crédito</option>
            <option value="wallet">Billetera</option>
            <option value="loan">Préstamo</option>
            <option value="other">Otro</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-text-secondary">Moneda</span>
          <select
            name="currency"
            className="h-10 rounded-lg border border-border bg-surface px-3 text-text"
            defaultValue="USD"
          >
            {BASE_CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-text-muted">
            También será tu moneda base en el resumen (puedes cambiarla en Ajustes).
          </span>
          {state.fieldErrors?.currency?.[0] ? (
            <span className="text-xs text-danger">{state.fieldErrors.currency[0]}</span>
          ) : null}
        </label>
        <Input
          name="initialBalance"
          label="Saldo inicial"
          type="number"
          min="0"
          step="0.01"
          defaultValue="0"
          required
          error={state.fieldErrors?.initialBalance?.[0]}
        />
        <Button type="submit" loading={pending}>
          Crear cuenta y continuar
        </Button>
      </form>
      <form action={skipOnboardingAction}>
        <Button type="submit" variant="secondary">
          Omitir por ahora
        </Button>
      </form>
    </div>
  );
}
