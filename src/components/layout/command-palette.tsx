"use client";

import { QuickEntryBar } from "@/components/finance/quick-entry-bar";
import { Command, X } from "lucide-react";
import { useEffect, useState } from "react";

type Option = { value: string; label: string };

export function CommandPalette({
  accounts,
  categories,
}: {
  accounts: Option[];
  categories: Option[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] hidden items-start justify-center bg-zinc-900/20 px-4 pt-24 backdrop-blur-sm sm:flex"
      role="dialog"
      aria-modal="true"
      aria-label="Registrar gasto rápido"
      onClick={() => setOpen(false)}
    >
      <div
        className="fc-panel w-full max-w-lg p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Command className="h-4 w-4" strokeWidth={1.75} />
            <span>Registrar gasto</span>
            <kbd className="rounded-lg border border-border/80 bg-surface-muted px-2 py-1 font-mono text-xs">
              ⌘K
            </kbd>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fc-touch-target rounded-full text-text-muted hover:bg-surface-muted hover:text-text"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <QuickEntryBar
          accounts={accounts}
          categories={categories}
          variant="command"
          onSuccess={() => setOpen(false)}
          showHints={false}
        />
      </div>
    </div>
  );
}
