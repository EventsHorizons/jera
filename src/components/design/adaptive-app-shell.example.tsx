/**
 * Reference: adaptive shell (mobile bottom-bar + desktop sidebar).
 * Live implementation: app-shell.tsx, mobile-quick-entry-dock.tsx, command-palette.tsx
 */
import { BalanceCard } from "@/components/finance/balance-card";
import { QuickEntryBar } from "@/components/finance/quick-entry-bar";
import { LayoutGrid, Receipt, Target, Wallet } from "lucide-react";

const DEMO_ACCOUNTS = [{ value: "1", label: "Principal" }];
const DEMO_CATEGORIES = [{ value: "1", label: "Comida" }];

export function AdaptiveAppShellExample() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#09090B]">
      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-52 md:flex-col md:border-r md:border-zinc-200/80 md:bg-white">
        <div className="flex items-center gap-2 border-b border-zinc-200/80 px-5 py-4 text-sm font-semibold">
          <Wallet className="h-4 w-4" strokeWidth={1.75} />
          FinControl
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {[
            { icon: LayoutGrid, label: "Inicio" },
            { icon: Receipt, label: "Movimientos" },
            { icon: Target, label: "Presupuesto" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600"
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </div>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div className="md:pl-52">
        <header className="sticky top-0 flex items-center gap-3 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur">
          <span className="text-sm font-semibold md:hidden">FinControl</span>
          <button
            type="button"
            className="hidden flex-1 items-center justify-between rounded-full border border-zinc-200/80 bg-zinc-100/80 px-4 py-2 text-sm text-zinc-500 md:flex md:max-w-md"
          >
            Registrar gasto…
            <kbd className="rounded-md border border-zinc-200/80 bg-white px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
        </header>

        <main className="mx-auto grid max-w-6xl grid-cols-12 gap-6 px-4 py-6 pb-36 md:pb-8">
          <div className="col-span-12 space-y-6 lg:col-span-8">
            <QuickEntryBar accounts={DEMO_ACCOUNTS} categories={DEMO_CATEGORIES} className="hidden md:block" />
            <div className="grid gap-3 sm:grid-cols-3">
              <BalanceCard label="Balance actual" value="$12,450.00" icon={Wallet} />
              <BalanceCard
                label="Gastos del mes"
                value="$2,180.00"
                subtitle="Hoy: $45.00"
                tone="expense"
              />
              <BalanceCard label="Ingresos del mes" value="$4,200.00" tone="income" />
            </div>
          </div>
        </main>

        {/* Mobile thumb-zone dock */}
        <div className="fixed bottom-14 left-0 right-0 border-t border-zinc-200/80 bg-white/95 px-3 py-2 backdrop-blur md:hidden">
          <QuickEntryBar
            accounts={DEMO_ACCOUNTS}
            categories={DEMO_CATEGORIES}
            variant="dock"
            showHints={false}
          />
        </div>

        {/* Mobile bottom nav — 3 tabs */}
        <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-zinc-200/80 bg-white/95 py-2 md:hidden">
          {["Inicio", "Movimientos", "Presupuesto"].map((label) => (
            <span key={label} className="text-[10px] font-medium text-zinc-500">
              {label}
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}
