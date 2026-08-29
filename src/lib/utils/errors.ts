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

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("already exists")
  ) {
    return "Este correo ya está registrado";
  }

  if (normalized.includes("email not confirmed")) {
    return "No se pudo iniciar sesión. Prueba de nuevo o recupera tu contraseña.";
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("over_email") ||
    normalized.includes("for security purposes") ||
    normalized.includes("too many requests")
  ) {
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }

  if (
    normalized.includes("user banned") ||
    normalized.includes("banned") ||
    normalized.includes("suspended")
  ) {
    return "Tu cuenta está suspendida. Contacta soporte.";
  }

  if (
    normalized.includes("password should") ||
    normalized.includes("password is too") ||
    normalized.includes("weak password") ||
    normalized.includes("password is required")
  ) {
    return "La contraseña no cumple los requisitos";
  }

  if (normalized.includes("database error")) {
    return "No se pudo crear el perfil. Inténtalo de nuevo.";
  }

  if (
    normalized.includes("signup is disabled") ||
    normalized.includes("signups not allowed")
  ) {
    return "El registro está temporalmente deshabilitado.";
  }

  if (normalized.includes("session")) {
    return "Tu sesión ha expirado. Inicia sesión nuevamente.";
  }

  console.error("auth error (unmapped):", message);
  return "Ocurrió un error. Intenta nuevamente.";
}
