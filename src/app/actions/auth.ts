"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  AUTH_RATE_LIMITS,
  rateLimit,
  resetRateLimitsForKey,
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
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function getOrigin() {
  const headerStore = await headers();
  const originHeader = headerStore.get("origin");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const forwardedProto = headerStore.get("x-forwarded-proto") ?? "https";
  const host = headerStore.get("host");

  // Prefer the URL the user is actually on (localhost vs production).
  if (originHeader && /^https?:\/\//.test(originHeader)) {
    return originHeader.replace(/\/$/, "");
  }
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
  }
  if (host && !host.includes("localhost")) {
    return `https://${host}`.replace(/\/$/, "");
  }
  if (host) {
    return `http://${host}`.replace(/\/$/, "");
  }

  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
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
  const email = parsed.data.email.toLowerCase();

  // Create already-confirmed users via admin API so we never depend on
  // Supabase "Confirm email" / confirmation SMTP (rate limits + verify UI).
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("register admin client", err);
    return {
      error:
        "Configuración del servidor incompleta. Falta SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      display_name: parsed.data.displayName,
      terms_accepted_at: new Date().toISOString(),
      terms_version: "1.0",
    },
  });

  if (createError) {
    console.error("register createUser", createError.message);
    return { error: authErrorMessage(createError.message) };
  }

  if (!created.user) {
    return { error: "No se pudo crear la cuenta. Inténtalo de nuevo." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (signInError) {
    console.error("register signIn", signInError.message);
    return {
      error:
        "Cuenta creada, pero no se pudo iniciar sesión automáticamente. Prueba iniciar sesión.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return mapZodErrors(parsed.error);
    }

    const email = parsed.data.email.toLowerCase().trim();
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
      console.error("loginAction signIn", error.message, error.code);
      return { error: authErrorMessage(error.message) };
    }

    if (!data.user || !data.session) {
      return { error: "No se pudo iniciar sesión." };
    }

    // Ensure profile row exists (handles legacy users / failed signup triggers).
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_completed, status")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("loginAction profile", profileError.message);
    }

    if (!profile) {
      const displayName =
        (data.user.user_metadata?.display_name as string | undefined)?.trim() ||
        data.user.email?.split("@")[0] ||
        "Usuario";
      const { error: insertProfileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        display_name: displayName,
        terms_accepted_at: new Date().toISOString(),
        terms_version: "1.0",
      });
      if (insertProfileError) {
        console.error("loginAction bootstrap profile", insertProfileError.message);
        // Admin fallback if RLS blocks insert for edge cases.
        try {
          const admin = createAdminClient();
          await admin.from("profiles").upsert({
            id: data.user.id,
            display_name: displayName,
            terms_accepted_at: new Date().toISOString(),
            terms_version: "1.0",
          });
        } catch (err) {
          console.error("loginAction admin profile", err);
          await supabase.auth.signOut({ scope: "local" });
          return {
            error:
              "Tu usuario no tiene perfil. Contacta soporte o vuelve a registrarte.",
          };
        }
      }
    } else if (profile.status === "suspended") {
      await supabase.auth.signOut({ scope: "global" });
      return { error: "Tu cuenta está suspendida. Contacta soporte." };
    }

    resetRateLimitsForKey(`login:email:${email}`);
    resetRateLimitsForKey(`login:ip:${ip}`);

    // Critical for App Router: refresh cached layouts so middleware/session see cookies.
    revalidatePath("/", "layout");

    const next = formData.get("next");
    const safeNext =
      typeof next === "string" &&
      next.startsWith("/") &&
      !next.startsWith("//")
        ? next
        : null;

    const onboardingDone = profile?.onboarding_completed === true;
    redirect(safeNext ?? (onboardingDone ? "/dashboard" : "/onboarding"));
  } catch (err) {
    // redirect() throws a special Next.js error — rethrow it.
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: unknown }).digest === "string" &&
      String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("loginAction unexpected", err);
    return { error: "Ocurrió un error al iniciar sesión. Inténtalo de nuevo." };
  }
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function logoutAllDevicesAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  revalidatePath("/", "layout");
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

  const email = parsed.data.email.toLowerCase();
  const supabase = await createClient();
  const origin = await getOrigin();
  const redirectTo = `${origin}/auth/callback?next=/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error("resetPasswordForEmail", error.message, { redirectTo });
    const normalized = error.message.toLowerCase();
    if (
      normalized.includes("rate") ||
      normalized.includes("security purposes") ||
      normalized.includes("over_email")
    ) {
      return {
        error:
          "Supabase bloqueó el envío de correos (límite). Espera 1 hora o configura SMTP propio en Authentication → SMTP.",
      };
    }
    if (
      normalized.includes("redirect") ||
      normalized.includes("url") ||
      normalized.includes("not allowed")
    ) {
      return {
        error: `URL de redirección no permitida (${origin}). En Supabase → Authentication → URL Configuration agrega exactamente: ${origin} y ${origin}/**`,
      };
    }
    return { error: authErrorMessage(error.message) };
  }

  return {
    success:
      "Si el correo está registrado, el enlace ya salió. Revisa bandeja y spam. Si no llega, el SMTP gratuito de Supabase está saturado: espera o configura SMTP en el dashboard.",
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

  const { error } = await supabase.rpc("create_own_financial_account", {
    p_name: parsed.data.name,
    p_type: parsed.data.type,
    p_institution: null,
    p_currency: parsed.data.currency.toUpperCase(),
    p_initial_balance: parsed.data.initialBalance,
  });

  if (error) {
    console.error("createFirstAccountAction", error.message);
    if (error.code === "23505" || error.message.includes("duplicate")) {
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
