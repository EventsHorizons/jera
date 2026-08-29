import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger";
  size?: "default" | "sm" | "icon";
  loading?: boolean;
  icon?: ReactNode;
};

const variants = {
  primary:
    "bg-zinc-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-zinc-800 disabled:bg-zinc-300",
  secondary:
    "border border-border/80 bg-surface-muted text-text hover:bg-zinc-100",
  tertiary: "bg-surface-muted text-text hover:bg-zinc-200/80 disabled:opacity-60",
  ghost: "text-text-secondary hover:bg-surface-muted hover:text-text",
  danger: "bg-expense text-white hover:bg-expense/90",
};

const sizes = {
  default: "h-11 min-h-11 rounded-xl px-5 text-sm",
  sm: "h-9 min-h-9 rounded-lg px-3 text-xs",
  icon: "h-9 w-9 min-h-9 min-w-9 rounded-xl p-0",
};

export function Button({
  className,
  variant = "primary",
  size = "default",
  loading,
  icon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const showIconOnly = size === "icon" && icon && !children;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition active:scale-[0.98] disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="text-sm">…</span>
      ) : showIconOnly ? (
        icon
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}
