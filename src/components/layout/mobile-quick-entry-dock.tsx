"use client";

import { QuickEntryBar } from "@/components/finance/quick-entry-bar";

type Option = { value: string; label: string };

/** Fixed thumb-zone entry bar — mobile only, sits above bottom nav. */
export function MobileQuickEntryDock({
  accounts,
  categories,
}: {
  accounts: Option[];
  categories: Option[];
}) {
  return (
    <div className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 border-t border-border/80 bg-surface/95 px-3 py-2 backdrop-blur md:hidden">
      <QuickEntryBar
        accounts={accounts}
        categories={categories}
        variant="dock"
        showHints={false}
      />
    </div>
  );
}
