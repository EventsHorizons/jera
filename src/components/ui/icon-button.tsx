"use client";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: "ghost" | "secondary" | "danger";
  size?: "sm" | "md";
  tooltip?: boolean;
  children: ReactNode;
};

const variants = {
  ghost:
    "text-text-secondary hover:bg-surface-muted hover:text-text focus-visible:ring-2 focus-visible:ring-zinc-900/10",
  secondary:
    "border border-border/80 bg-surface text-text-secondary hover:bg-surface-muted hover:text-text focus-visible:ring-2 focus-visible:ring-zinc-900/10",
  danger:
    "text-text-muted hover:bg-expense-soft hover:text-expense focus-visible:ring-2 focus-visible:ring-expense/20",
};

const sizes = {
  sm: "h-8 w-8 min-h-8 min-w-8 rounded-lg",
  md: "h-9 w-9 min-h-9 min-w-9 rounded-xl",
};

export function IconButton({
  label,
  variant = "ghost",
  size = "md",
  tooltip = true,
  className,
  children,
  type = "button",
  ...props
}: IconButtonProps) {
  const button = (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );

  if (!tooltip) return button;
  return <Tooltip label={label}>{button}</Tooltip>;
}
