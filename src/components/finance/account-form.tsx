"use client";

import { useActionState, useEffect } from "react";
import {
  createAccountAction,
  updateAccountAction,
} from "@/app/actions/finance";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ActionState } from "@/lib/utils/errors";
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance/calculations";
import { useRouter } from "next/navigation";

const initialState: ActionState = {};

const typeOptions = Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function AccountForm({
  mode = "create",
  account,
  plain = false,
  onSuccess,
}: {
  mode?: "create" | "edit";
  account?: {
    id: string;
    name: string;
    type: string;
    institution: string | null;
    currency: string;
    initial_balance: number;
  };
  plain?: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const action = mode === "edit" ? updateAccountAction : createAccountAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (!state.success) return;
    onSuccess?.();
    router.refresh();
  }, [state.success, onSuccess, router]);

  return (
    <form
      action={formAction}
      className={
        plain
          ? "space-y-4"
          : "space-y-4 rounded-2xl border border-border bg-surface p-5"
      }
    >
      {mode === "edit" ? <input type="hidden" name="id" value={account?.id} /> : null}
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}
      <Input
        name="name"
        label="Nombre"
        required
        defaultValue={account?.name}
        error={state.fieldErrors?.name?.[0]}
      />
      <Select
        name="type"
        label="Tipo"
        defaultValue={account?.type ?? "bank"}
        options={typeOptions}
        error={state.fieldErrors?.type?.[0]}
      />
      <Input
        name="institution"
        label="Institución (opcional)"
        defaultValue={account?.institution ?? ""}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="currency"
          label="Moneda"
          defaultValue={account?.currency ?? "USD"}
          maxLength={3}
          required
          error={state.fieldErrors?.currency?.[0]}
        />
        <Input
          name="initialBalance"
          label="Saldo inicial"
          type="number"
          step="0.01"
          min="0"
          defaultValue={account?.initial_balance ?? 0}
          required
          error={state.fieldErrors?.initialBalance?.[0]}
        />
      </div>
      <Button type="submit" loading={pending}>
        {mode === "edit" ? "Guardar cambios" : "Crear cuenta"}
      </Button>
    </form>
  );
}
