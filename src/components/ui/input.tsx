import { cn } from "@/lib/utils/cn";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium leading-none text-text-secondary">{label}</span>
      <input
        id={inputId}
        className={cn(
          "h-11 min-h-11 rounded-xl border border-border/80 bg-surface px-4 text-text outline-none transition focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}
