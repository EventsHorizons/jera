"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema } from "@/lib/validations/auth";
import { useClientSchemaValidation } from "@/lib/validations/client";
import Link from "next/link";

import type { ActionState } from "@/lib/utils/errors";

const initialState: ActionState = {};

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const { validateBeforeSubmit, mergeState } =
    useClientSchemaValidation(loginSchema);
  const view = mergeState(state);

  return (
    <form
      action={formAction}
      onSubmit={(event) =>
        validateBeforeSubmit(event, (formData) => ({
          email: formData.get("email"),
          password: formData.get("password"),
        }))
      }
      className="flex w-full max-w-md flex-col gap-4"
      noValidate
    >
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      {view.error ? <Alert variant="error">{view.error}</Alert> : null}
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
        label="Contraseña"
        autoComplete="current-password"
        required
        error={view.fieldErrors?.password?.[0]}
      />
      <div className="flex items-center justify-between text-sm">
        <Link
          href="/forgot-password"
          className="text-primary hover:text-primary-hover"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <Button type="submit" loading={pending} className="w-full">
        Iniciar sesión
      </Button>
      <p className="text-center text-sm text-text-secondary">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-primary hover:text-primary-hover">
          Regístrate
        </Link>
      </p>
    </form>
  );
}
