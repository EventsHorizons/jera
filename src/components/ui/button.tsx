import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger";
  loading?: boolean;
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

export function Button({
  className,
  variant = "primary",
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium transition active:scale-[0.98] disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Cargando..." : children}
    </button>
  );
}
