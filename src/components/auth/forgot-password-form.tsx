"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { useClientSchemaValidation } from "@/lib/validations/client";
import Link from "next/link";

import type { ActionState } from "@/lib/utils/errors";

const initialState: ActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialState,
  );
  const { validateBeforeSubmit, mergeState } =
    useClientSchemaValidation(forgotPasswordSchema);
  const view = mergeState(state);

  return (
    <form
      action={formAction}
      onSubmit={(event) =>
        validateBeforeSubmit(event, (formData) => ({
          email: formData.get("email"),
        }))
      }
      className="flex w-full max-w-md flex-col gap-4"
      noValidate
    >
      {view.error ? <Alert variant="error">{view.error}</Alert> : null}
      {view.success ? <Alert variant="success">{view.success}</Alert> : null}
      <p className="text-sm text-text-secondary">
        Ingresa tu correo y te enviaremos instrucciones si está registrado.
      </p>
      <Input
        name="email"
        type="email"
        label="Correo electrónico"
        autoComplete="email"
        required
        error={view.fieldErrors?.email?.[0]}
      />
      <Button type="submit" loading={pending} className="w-full">
        Enviar instrucciones
      </Button>
      <Link
        href="/login"
        className="text-center text-sm text-primary hover:text-primary-hover"
      >
        Volver al inicio de sesión
      </Link>
    </form>
  );
}
