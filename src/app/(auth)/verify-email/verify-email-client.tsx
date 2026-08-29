"use client";

import { useActionState } from "react";
import { resendVerificationAction } from "@/app/actions/auth";
import type { ActionState } from "@/lib/utils/errors";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const initialState: ActionState = {};

export function VerifyEmailClient({
  email,
  allowEmailEdit = false,
}: {
  email: string;
  allowEmailEdit?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    resendVerificationAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Verifica tu correo</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Te enviamos un enlace de verificación
          {email ? (
            <>
              {" "}
              a <strong className="text-text">{email}</strong>
            </>
          ) : null}
          . Debes confirmarlo antes de iniciar sesión.
        </p>
      </div>
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}
      <form action={formAction} className="space-y-4">
        {allowEmailEdit ? (
          <Input
            name="email"
            type="email"
            label="Correo electrónico"
            defaultValue={email}
            required
            autoComplete="email"
          />
        ) : (
          <input type="hidden" name="email" value={email} />
        )}
        <Button type="submit" loading={pending} variant="secondary">
          Reenviar correo de verificación
        </Button>
      </form>
      <Link
        href="/login"
        className="inline-block text-sm text-primary hover:text-primary-hover"
      >
        Ir al inicio de sesión
      </Link>
    </div>
  );
}
