"use client";

import { QuickEntryBar } from "@/components/finance/quick-entry-bar";

type Option = { value: string; label: string };

/** Thumb-zone dock — mobile only, sits above bottom nav. */
export function MobileQuickEntryDock({
  accounts,
  categories,
}: {
  accounts: Option[];
  categories: Option[];
}) {
  return (
    <div className="fc-mobile-dock fixed left-0 right-0 z-50 border-t border-border/80 bg-surface/95 px-4 py-2 backdrop-blur sm:hidden">
      <QuickEntryBar
        accounts={accounts}
        categories={categories}
        variant="dock"
        showHints={false}
      />
    </div>
  );
}
