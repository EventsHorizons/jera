import { JeraLogo } from "@/components/brand/jera-logo";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand/constants";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const configMissing = !isSupabaseConfigured();

  if (!configMissing) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background text-text">
      <header className="flex h-16 items-center justify-between border-b border-border/80 bg-surface px-4 sm:px-6">
        <JeraLogo size="md" />
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center text-sm text-text-secondary hover:text-text"
          >
            Iniciar sesión
          </Link>
          <Link href="/register" className="fc-btn-ai">
            Crear cuenta
          </Link>
        </div>
      </header>

      {configMissing || params.error === "config" ? (
        <div className="border-b border-warning/30 bg-warning-soft px-4 py-4 text-sm text-warning sm:px-6">
          La app en producción necesita variables de Supabase en Vercel (Settings → Environment
          Variables):{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>,{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_SITE_URL</code>,{" "}
          <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code>.
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-semibold tracking-tight">
          {APP_NAME} — {APP_TAGLINE.toLowerCase()}
        </h1>
        <p className="mt-4 text-lg text-text-secondary">
          Un lugar único para saber cuánto dinero tienes, dónde está, de dónde viene, en qué lo
          gastas y qué compromisos financieros tienes.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/register" className="fc-btn-ai">
            Empezar gratis
          </Link>
          <Link href="/login" className="fc-btn-ai-secondary">
            Ya tengo cuenta
          </Link>
        </div>
      </main>
    </div>
  );
}
