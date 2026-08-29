/**
 * Jera — responsive grid + adaptive quick entry (mobile dock / desktop command).
 * Live implementation: app-shell.tsx, mobile-quick-entry-dock.tsx, command-palette.tsx
 */
import { JeraLogo } from "@/components/brand/jera-logo";
import { BalanceCard } from "@/components/finance/balance-card";
import { QuickEntryBar } from "@/components/finance/quick-entry-bar";
import { LayoutGrid, Receipt, Target, Wallet } from "lucide-react";

const DEMO_ACCOUNTS = [{ value: "1", label: "Principal" }];
const DEMO_CATEGORIES = [{ value: "1", label: "Comida" }];

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
            { icon: Target, label: "Presupuesto" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm text-text-secondary"
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-border/80 bg-surface px-4 sm:px-6">
          <div className="sm:hidden">
            <JeraLogo size="sm" />
          </div>
          <button
            type="button"
            className="hidden h-11 flex-1 items-center justify-between rounded-xl border border-border/80 bg-surface-muted px-4 text-sm text-text-muted sm:flex lg:max-w-md"
          >
            Registrar gasto…
            <kbd className="rounded-lg border border-border/80 bg-surface px-2 py-1 font-mono text-xs">
              ⌘K
            </kbd>
          </button>
        </header>

        <main className="fc-main">
          <div className="fc-bento-grid">
            <div className="col-span-12 space-y-6 lg:col-span-8">
              <QuickEntryBar
                accounts={DEMO_ACCOUNTS}
                categories={DEMO_CATEGORIES}
                className="hidden sm:block"
              />
              <div className="fc-bento-grid">
                <BalanceCard
                  label="Balance actual"
                  value="$12,450.00"
                  icon={Wallet}
                  className="col-span-12 sm:col-span-6 lg:col-span-4"
                />
                <BalanceCard
                  label="Gastos del mes"
                  value="$2,180.00"
                  subtitle="Hoy: $45.00"
                  tone="expense"
                  className="col-span-12 sm:col-span-6 lg:col-span-4"
                />
                <BalanceCard
                  label="Ingresos del mes"
                  value="$4,200.00"
                  tone="income"
                  className="col-span-12 sm:col-span-6 lg:col-span-4"
                />
              </div>
            </div>
          </div>
        </main>

        <div className="fc-mobile-dock fixed left-0 right-0 border-t border-border/80 bg-surface/95 px-4 py-2 backdrop-blur sm:hidden">
          <QuickEntryBar
            accounts={DEMO_ACCOUNTS}
            categories={DEMO_CATEGORIES}
            variant="dock"
            showHints={false}
          />
        </div>

        <nav className="fc-mobile-nav fixed bottom-0 left-0 right-0 border-t border-border/80 bg-surface/95 sm:hidden">
          <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-2">
            {["Inicio", "Movimientos", "Presupuesto"].map((label) => (
              <span
                key={label}
                className="flex min-h-11 min-w-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-text-muted"
              >
                {label}
              </span>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
