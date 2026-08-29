export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
};

export function mapZodErrors(
  error: { flatten: () => { fieldErrors: Record<string, string[]> } },
): ActionState {
  return { fieldErrors: error.flatten().fieldErrors };
}

export function authErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos";
  }

  if (normalized.includes("user already registered")) {
    return "Este correo ya está registrado";
  }

  if (normalized.includes("email not confirmed")) {
    return "Debes verificar tu correo antes de continuar";
  }

  if (
    normalized.includes("user banned") ||
    normalized.includes("banned") ||
    normalized.includes("suspended")
  ) {
    return "Tu cuenta está suspendida. Contacta soporte.";
  }

  if (normalized.includes("password")) {
    return "La contraseña no cumple los requisitos";
  }

  if (normalized.includes("session")) {
    return "Tu sesión ha expirado. Inicia sesión nuevamente.";
  }

  return "Ocurrió un error. Intenta nuevamente.";
}
