"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePasswordSchema } from "@/lib/validations/auth";
import { useClientSchemaValidation } from "@/lib/validations/client";

import type { ActionState } from "@/lib/utils/errors";

const initialState: ActionState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState,
  );
  const { validateBeforeSubmit, mergeState } =
    useClientSchemaValidation(changePasswordSchema);
  const view = mergeState(state);

  return (
    <form
      action={formAction}
      onSubmit={(event) =>
        validateBeforeSubmit(event, (formData) => ({
          currentPassword: formData.get("currentPassword"),
          password: formData.get("password"),
          confirmPassword: formData.get("confirmPassword"),
        }))
      }
      className="max-w-lg space-y-4"
      noValidate
    >
      {view.error ? <Alert variant="error">{view.error}</Alert> : null}
      {view.success ? <Alert variant="success">{view.success}</Alert> : null}
      <Input
        name="currentPassword"
        type="password"
        label="Contraseña actual"
        autoComplete="current-password"
        required
        error={view.fieldErrors?.currentPassword?.[0]}
      />
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
      <Button type="submit" loading={pending}>
        Cambiar contraseña
      </Button>
    </form>
  );
}
