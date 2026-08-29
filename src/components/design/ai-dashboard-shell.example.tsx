/**
 * Lugh — AI-style dashboard shell (reference implementation).
 * Used as design system reference; live UI is in dashboard/page.tsx + app-shell.tsx.
 */
import { LughLogo } from "@/components/brand/lugh-logo";
import { ArrowUp, Sparkles } from "lucide-react";

export function AiDashboardShellExample() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#09090B]">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-200/80 bg-white/90 px-6 py-3 backdrop-blur">
        <LughLogo size="sm" />
        <button type="button" className="fc-btn-ai">
          + Agregar gasto
        </button>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-6 py-8">
        <div className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-4 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
          <Sparkles className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
          <input
            type="text"
            placeholder='Ej. "Almuerzo $25 en restaurante"'
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-xs font-medium text-zinc-500">Balance total</p>
            <p className="mt-4 font-mono text-2xl font-semibold tabular-nums tracking-tight">
              $12,450.00
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-xs font-medium text-zinc-500">Gastos del mes</p>
            <p className="mt-4 font-mono text-2xl font-semibold tabular-nums tracking-tight text-rose-600">
              $2,180.00
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-xs font-medium text-zinc-500">Ingresos del mes</p>
            <p className="mt-4 font-mono text-2xl font-semibold tabular-nums tracking-tight text-green-600">
              $4,200.00
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
