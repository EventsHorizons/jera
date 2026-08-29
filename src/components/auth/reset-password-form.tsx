"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { useClientSchemaValidation } from "@/lib/validations/client";

import type { ActionState } from "@/lib/utils/errors";

const initialState: ActionState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialState,
  );
  const { validateBeforeSubmit, mergeState } =
    useClientSchemaValidation(resetPasswordSchema);
  const view = mergeState(state);

  return (
    <form
      action={formAction}
      onSubmit={(event) =>
        validateBeforeSubmit(event, (formData) => ({
          password: formData.get("password"),
          confirmPassword: formData.get("confirmPassword"),
        }))
      }
      className="flex w-full max-w-md flex-col gap-4"
      noValidate
    >
      {view.error ? <Alert variant="error">{view.error}</Alert> : null}
      <Input
        name="password"
        type="password"
        label="Nueva contraseña"
        autoComplete="new-password"
        required
        error={view.fieldErrors?.password?.[0]}
      />
      <Input
        name="confirmPassword"
        type="password"
        label="Confirmar nueva contraseña"
        autoComplete="new-password"
        required
        error={view.fieldErrors?.confirmPassword?.[0]}
      />
      <Button type="submit" loading={pending} className="w-full">
        Actualizar contraseña
      </Button>
    </form>
  );
}
