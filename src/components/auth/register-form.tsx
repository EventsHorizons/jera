"use client";

import { useActionState } from "react";
import { registerAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerSchema } from "@/lib/validations/auth";
import { useClientSchemaValidation } from "@/lib/validations/client";
import Link from "next/link";

import type { ActionState } from "@/lib/utils/errors";

const initialState: ActionState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );
  const { validateBeforeSubmit, mergeState } =
    useClientSchemaValidation(registerSchema);
  const view = mergeState(state);

  return (
    <form
      action={formAction}
      onSubmit={(event) =>
        validateBeforeSubmit(event, (formData) => ({
          displayName: formData.get("displayName"),
          email: formData.get("email"),
          password: formData.get("password"),
          confirmPassword: formData.get("confirmPassword"),
          acceptTerms: formData.get("acceptTerms") === "on",
        }))
      }
      className="flex w-full max-w-md flex-col gap-4"
      noValidate
    >
      {view.error ? <Alert variant="error">{view.error}</Alert> : null}
      <Input
        name="displayName"
        label="Nombre"
        autoComplete="name"
        required
        error={view.fieldErrors?.displayName?.[0]}
      />
      <Input
        name="email"
        type="email"
        label="Correo electrónico"
        autoComplete="email"
        required
        error={view.fieldErrors?.email?.[0]}
      />
      <Input
        name="password"
        type="password"
        label="Contraseña (mín. 8 caracteres)"
        autoComplete="new-password"
        required
        minLength={8}
        error={view.fieldErrors?.password?.[0]}
      />
      <Input
        name="confirmPassword"
        type="password"
        label="Confirmar contraseña"
        autoComplete="new-password"
        required
        minLength={8}
        error={view.fieldErrors?.confirmPassword?.[0]}
      />
      <label className="flex items-start gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          name="acceptTerms"
          className="mt-1"
          required
        />
        <span>
          Acepto los términos y condiciones del servicio.
          {view.fieldErrors?.acceptTerms?.[0] ? (
            <span className="mt-1 block text-xs text-danger">
              {view.fieldErrors.acceptTerms[0]}
            </span>
          ) : null}
        </span>
      </label>
      <Button type="submit" loading={pending} className="w-full">
        Crear cuenta
      </Button>
      <p className="text-center text-sm text-text-secondary">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-primary hover:text-primary-hover">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
