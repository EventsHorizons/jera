"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const QUICK_FILTERS = [
  { type: "", label: "Todos" },
  { type: "expense", label: "Gastos" },
  { type: "income", label: "Ingresos" },
  { type: "transfer", label: "Transferencias" },
] as const;

export function TransactionQuickFilters({ activeType }: { activeType?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(type: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (type) params.set("type", type);
    else params.delete("type");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_FILTERS.map((filter) => {
        const active = (activeType ?? "") === filter.type;
        return (
          <Link
            key={filter.label}
            href={hrefFor(filter.type)}
            className={cn(
              "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition active:scale-[0.98]",
              active
                ? "bg-zinc-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "border border-border/80 bg-surface text-text-secondary hover:bg-surface-muted hover:text-text",
            )}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
