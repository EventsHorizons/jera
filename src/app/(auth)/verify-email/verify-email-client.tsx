"use client";

import { Alert } from "@/components/ui/alert";
import Link from "next/link";

export function VerifyEmailClient({
  email,
}: {
  email: string;
  allowEmailEdit?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ya puedes continuar</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Jera no requiere verificación por correo
          {email ? (
            <>
              {" "}
              para <strong className="text-text">{email}</strong>
            </>
          ) : null}
          . Si acabas de registrarte, inicia sesión e irás al onboarding.
        </p>
      </div>
      <Alert variant="success">
        La verificación por correo está desactivada. No hace falta reenviar
        enlaces.
      </Alert>
      <div className="flex flex-col gap-3 text-sm">
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Ir al inicio de sesión
        </Link>
        <Link
          href="/register"
          className="text-center text-primary hover:text-primary-hover"
        >
          Crear otra cuenta
        </Link>
      </div>
    </div>
  );
}
