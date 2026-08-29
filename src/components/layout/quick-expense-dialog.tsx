"use client";

import { QuickExpenseForm } from "@/components/finance/quick-expense-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useEffect, useState } from "react";

type Option = { value: string; label: string };

export function QuickExpenseDialog({
  accounts,
  categories,
  className,
}: {
  accounts: Option[];
  categories: Option[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className={cn("gap-1.5", className)}>
        + Agregar gasto
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-text/30 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-expense-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="fc-card w-full max-w-md p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="quick-expense-title" className="font-serif text-lg font-semibold">
                Añadir gasto
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-text-muted hover:bg-surface-muted hover:text-text"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <QuickExpenseForm
              accounts={accounts}
              categories={categories}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

export function QuickExpenseFab({
  accounts,
  categories,
}: {
  accounts: Option[];
  categories: Option[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-2xl font-light text-white shadow-[0_4px_20px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-zinc-800 active:scale-95 md:hidden"
        aria-label="Añadir gasto"
      >
        +
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-text/30 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="fc-card w-full max-w-md p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold">Añadir gasto</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-text-muted hover:bg-surface-muted"
              >
                ✕
              </button>
            </div>
            <QuickExpenseForm
              accounts={accounts}
              categories={categories}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
