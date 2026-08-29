"use client";

import { cn } from "@/lib/utils/cn";
import { useState, type ReactNode } from "react";

export function Collapsible({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-3 text-sm font-medium text-text-secondary hover:text-text"
        aria-expanded={open}
      >
        {label}
        <span className="text-xs text-text-muted">{open ? "Ocultar" : "Mostrar"}</span>
      </button>
      {open ? <div className="pb-4">{children}</div> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </h2>
      {action}
    </div>
  );
}
