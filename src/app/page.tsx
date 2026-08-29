import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <span className="font-serif text-lg font-semibold text-primary">FinControl</span>
        <div className="flex gap-3">
          <Link href="/login" className="text-sm text-text-secondary hover:text-text">
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="fc-btn-ai px-4 py-2 text-sm"
          >
            Crear cuenta
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          Control financiero personal, claro y privado
        </h1>
        <p className="mt-4 text-lg text-text-secondary">
          Un lugar único para saber cuánto dinero tienes, dónde está, de dónde
          viene, en qué lo gastas y qué compromisos financieros tienes.
        </p>
        <div className="mt-8 flex gap-3">
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
