"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  AUTH_RATE_LIMITS,
  rateLimit,
} from "@/lib/security/rate-limit";
import {
  changePasswordSchema,
  deleteAccountSchema,
  firstAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import {
  authErrorMessage,
  mapZodErrors,
  type ActionState,
} from "@/lib/utils/errors";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function getOrigin() {
  const headerStore = await headers();
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  // Prefer configured public site URL so auth redirects never point at localhost in prod.
  if (fromEnv && !fromEnv.includes("localhost")) {
    return fromEnv;
  }
  return (
    headerStore.get("origin") ??
    fromEnv ??
    "http://localhost:3000"
  );
}

async function clientIp() {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerStore.get("x-real-ip") ?? "unknown";
}

function rateLimitedMessage(retryAfterSeconds: number): ActionState {
  return {
    error: `Demasiados intentos. Espera ${retryAfterSeconds}s e inténtalo de nuevo.`,
  };
}

async function assertActiveProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ActionState | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "No se encontró el perfil de usuario." };
  }

  if (profile.status === "suspended") {
    await supabase.auth.signOut({ scope: "global" });
    return { error: "Tu cuenta está suspendida. Contacta soporte." };
  }

  return null;
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await clientIp();
  const limited = rateLimit(
    `register:${ip}`,
    AUTH_RATE_LIMITS.register.limit,
    AUTH_RATE_LIMITS.register.windowMs,
  );
  if (!limited.ok) return rateLimitedMessage(limited.retryAfterSeconds);

  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms") === "on",
  });

  if (!parsed.success) {
    return mapZodErrors(parsed.error);
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      data: {
        display_name: parsed.data.displayName,
        terms_accepted_at: new Date().toISOString(),
        terms_version: "1.0",
      },
    },
  });

  if (error) {
    return { error: authErrorMessage(error.message) };
  }

  if (!data.user) {
    return { error: "No se pudo crear la cuenta. Inténtalo de nuevo." };
  }

  // Supabase returns an empty identities array when the email is already registered
  // and confirmations are enabled (anti-enumeration).
  if (data.user.identities && data.user.identities.length === 0) {
    return {
      error: "Este correo ya está registrado. Inicia sesión o recupera tu contraseña.",
    };
  }

  // Product decision: no email verification gate. Confirm immediately via admin API.
  try {
    const admin = createAdminClient();
    const { error: confirmError } = await admin.auth.admin.updateUserById(
      data.user.id,
      { email_confirm: true },
    );
    if (confirmError) {
      console.error("auto-confirm failed", confirmError.message);
    }
  } catch (err) {
    console.error("auto-confirm unavailable", err);
  }

  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
    });
    if (signInError) {
      return {
        error:
          "Cuenta creada, pero no se pudo iniciar sesión automáticamente. Prueba iniciar sesión.",
      };
    }
  }

  redirect("/onboarding");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return mapZodErrors(parsed.error);
  }

  const email = parsed.data.email.toLowerCase();
  const ip = await clientIp();
  const ipLimit = rateLimit(
    `login:ip:${ip}`,
    AUTH_RATE_LIMITS.login.limit,
    AUTH_RATE_LIMITS.login.windowMs,
  );
  if (!ipLimit.ok) return rateLimitedMessage(ipLimit.retryAfterSeconds);

  const emailLimit = rateLimit(
    `login:email:${email}`,
    AUTH_RATE_LIMITS.loginEmail.limit,
    AUTH_RATE_LIMITS.loginEmail.windowMs,
  );
  if (!emailLimit.ok) return rateLimitedMessage(emailLimit.retryAfterSeconds);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: authErrorMessage(error.message) };
  }

  if (!data.user) {
    return { error: "No se pudo iniciar sesión." };
  }

  const suspended = await assertActiveProfile(supabase, data.user.id);
  if (suspended) return suspended;

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", data.user.id)
    .maybeSingle();

  const next = formData.get("next");
  const safeNext =
    typeof next === "string" && next.startsWith("/") ? next : null;

  if (!profile?.onboarding_completed) {
    redirect(safeNext ?? "/onboarding");
  }

  redirect(safeNext ?? "/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

export async function logoutAllDevicesAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?message=Sesiones cerradas en todos los dispositivos");
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return mapZodErrors(parsed.error);
  }

  const ip = await clientIp();
  const limited = rateLimit(
    `forgot:${ip}`,
    AUTH_RATE_LIMITS.forgotPassword.limit,
    AUTH_RATE_LIMITS.forgotPassword.windowMs,
  );
  if (!limited.ok) return rateLimitedMessage(limited.retryAfterSeconds);

  const supabase = await createClient();
  const origin = await getOrigin();

  // Always return the same message to avoid email enumeration.
  await supabase.auth.resetPasswordForEmail(parsed.data.email.toLowerCase(), {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  return {
    success:
      "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.",
  };
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return mapZodErrors(parsed.error);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: authErrorMessage(error.message) };
  }

  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?message=Contraseña actualizada. Inicia sesión.");
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return mapZodErrors(parsed.error);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Tu sesión ha expirado." };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    return { error: "La contraseña actual es incorrecta." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: authErrorMessage(error.message) };
  }

  // Invalidate every session so stolen sessions cannot persist after a password change.
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?message=Contraseña actualizada. Inicia sesión nuevamente.");
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return mapZodErrors(parsed.error);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión ha expirado." };
  }

  const blocked = await assertActiveProfile(supabase, user.id);
  if (blocked) return blocked;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      timezone: parsed.data.timezone,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "No se pudo actualizar el perfil." };
  }

  return { success: "Perfil actualizado." };
}

export async function deleteAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = deleteAccountSchema.safeParse({
    confirmation: formData.get("confirmation"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return mapZodErrors(parsed.error);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Tu sesión ha expirado." };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });

  if (verifyError) {
    return { error: "La contraseña es incorrecta." };
  }

  const { error } = await supabase.rpc("delete_own_account");

  if (error) {
    return { error: "No se pudo eliminar la cuenta." };
  }

  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?message=Cuenta eliminada correctamente");
}

export async function resendVerificationAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  return {
    success: "La verificación por correo está desactivada. Puedes iniciar sesión normalmente.",
  };
}

export async function createFirstAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = firstAccountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    currency: formData.get("currency"),
    initialBalance: formData.get("initialBalance"),
  });

  if (!parsed.success) {
    return mapZodErrors(parsed.error);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión ha expirado." };
  }

  const blocked = await assertActiveProfile(supabase, user.id);
  if (blocked) return blocked;

  const nature =
    parsed.data.type === "credit_card" || parsed.data.type === "loan"
      ? "liability"
      : "asset";

  const { error } = await supabase.from("financial_accounts").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    nature,
    currency: parsed.data.currency.toUpperCase(),
    initial_balance: parsed.data.initialBalance,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya tienes una cuenta con ese nombre." };
    }
    return { error: error.message || "No se pudo crear la cuenta financiera." };
  }

  await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  redirect("/dashboard");
}

export async function skipOnboardingAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const blocked = await assertActiveProfile(supabase, user.id);
    if (blocked) {
      redirect("/login?message=Tu cuenta está suspendida");
    }

    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
  }

  redirect("/dashboard");
}
