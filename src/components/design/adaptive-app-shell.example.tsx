/**
 * Jera — Responsive layout reference
 *
 * Live: app-shell.tsx · expense-capture.tsx · dashboard/page.tsx
 *
 * Mobile nav: Inicio | Movimientos | + | Plan | Más
 * Desktop: sidebar + ⌘K expense capture
 */
import { JeraLogo } from "@/components/brand/jera-logo";
import { BalanceCard } from "@/components/finance/balance-card";
import { LayoutGrid, Plus, Receipt, Target, Wallet } from "lucide-react";

export function AdaptiveAppShellExample() {
  return (
    <div className="fc-app-root">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border/80 bg-surface sm:flex">
        <div className="flex h-16 items-center border-b border-border/80 px-4">
          <JeraLogo size="sm" />
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {[
            { icon: LayoutGrid, label: "Inicio" },
            { icon: Receipt, label: "Movimientos" },
            { icon: Target, label: "Plan" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm text-text-secondary"
            >
              <item.icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b border-border/80 px-4">
          <JeraLogo size="sm" className="sm:hidden" />
          <div className="hidden h-11 flex-1 items-center rounded-xl border border-border/80 bg-surface-muted px-4 text-sm text-text-muted sm:flex lg:max-w-md">
            Registrar gasto… · ⌘K
          </div>
        </header>

        <main className="fc-main space-y-6 pb-24">
          <h1 className="fc-page-title">Inicio</h1>
          <div className="fc-metric-grid">
            <BalanceCard label="Disponible" value="$1,200.00" icon={Wallet} />
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 flex h-14 items-center justify-around border-t border-border/80 bg-surface sm:hidden">
          <span className="text-[11px] text-text-muted">Inicio</span>
          <span className="text-[11px] text-text-muted">Movimientos</span>
          <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white">
            <Plus className="h-6 w-6" />
          </span>
          <span className="text-[11px] text-text-muted">Plan</span>
          <span className="text-[11px] text-text-muted">Más</span>
        </nav>
      </div>
    </div>
  );
}
