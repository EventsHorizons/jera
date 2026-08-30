"use client";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils/cn";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ActionMenuItem =
  | {
      type?: "button";
      label: string;
      icon?: ReactNode;
      onClick: () => void;
      destructive?: boolean;
      disabled?: boolean;
    }
  | {
      type: "link";
      label: string;
      icon?: ReactNode;
      href: string;
      destructive?: boolean;
    }
  | {
      type: "form";
      label: string;
      icon?: ReactNode;
      action: (formData: FormData) => void | Promise<void>;
      hiddenFields: Record<string, string>;
      destructive?: boolean;
      disabled?: boolean;
      confirmMessage?: string;
    };

export function ActionMenu({
  label,
  items,
  align = "end",
}: {
  label: string;
  items: ActionMenuItem[];
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (items.length === 0) return null;

  return (
    <div ref={rootRef} className="relative inline-flex">
      <IconButton
        label={label}
        variant="ghost"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
      </IconButton>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute top-full z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-border/80 bg-surface py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => {
            const itemClass = cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-surface-muted",
              item.destructive
                ? "text-expense hover:bg-expense-soft/40"
                : "text-text",
            );

            if (item.type === "link") {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  role="menuitem"
                  className={itemClass}
                  onClick={close}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            }

            if (item.type === "form") {
              return (
                <form
                  key={item.label}
                  action={item.action}
                  className="block"
                  onSubmit={(e) => {
                    if (
                      item.confirmMessage &&
                      !window.confirm(item.confirmMessage)
                    ) {
                      e.preventDefault();
                      return;
                    }
                    close();
                  }}
                >
                  {Object.entries(item.hiddenFields).map(([k, v]) => (
                    <input key={k} type="hidden" name={k} value={v} />
                  ))}
                  <button
                    type="submit"
                    role="menuitem"
                    disabled={item.disabled}
                    className={itemClass}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </form>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={itemClass}
                onClick={() => {
                  item.onClick();
                  close();
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
