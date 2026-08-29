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
      className="fixed inset-0 z-[100] hidden items-start justify-center bg-zinc-900/20 px-4 pt-[15vh] backdrop-blur-sm md:flex"
      role="dialog"
      aria-modal="true"
      aria-label="Registrar gasto rápido"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border/80 bg-surface p-2 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Command className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Registrar gasto</span>
            <kbd className="rounded-md border border-border/80 bg-surface-muted px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-1.5 text-text-muted hover:bg-surface-muted hover:text-text"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <QuickEntryBar
          accounts={accounts}
          categories={categories}
          onSuccess={() => setOpen(false)}
          showHints={false}
        />
      </div>
    </div>
  );
}
