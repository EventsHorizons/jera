"use client";

import { useActionState } from "react";
import { deleteAccountAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAccountSchema } from "@/lib/validations/auth";
import { useClientSchemaValidation } from "@/lib/validations/client";

import type { ActionState } from "@/lib/utils/errors";

const initialState: ActionState = {};

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(
    deleteAccountAction,
    initialState,
  );
  const { validateBeforeSubmit, mergeState } =
    useClientSchemaValidation(deleteAccountSchema);
  const view = mergeState(state);

  return (
    <form
      action={formAction}
      onSubmit={(event) =>
        validateBeforeSubmit(event, (formData) => ({
          confirmation: formData.get("confirmation"),
          password: formData.get("password"),
        }))
      }
      className="max-w-lg space-y-4 rounded-xl border border-red-500/20 bg-red-500/5 p-6"
      noValidate
    >
      {view.error ? <Alert variant="error">{view.error}</Alert> : null}
      <p className="text-sm text-text-secondary">
        Esta acción es irreversible. Se eliminarán tu perfil, cuentas,
        movimientos, categorías, presupuestos, metas y deudas. Todas tus
        sesiones quedarán invalidadas.
      </p>
      <Input
        name="confirmation"
        label='Escribe "ELIMINAR" para confirmar'
        required
        error={view.fieldErrors?.confirmation?.[0]}
      />
      <Input
        name="password"
        type="password"
        label="Contraseña actual (reautenticación)"
        autoComplete="current-password"
        required
        error={view.fieldErrors?.password?.[0]}
      />
      <Button type="submit" variant="danger" loading={pending}>
        Eliminar cuenta permanentemente
      </Button>
    </form>
  );
}
