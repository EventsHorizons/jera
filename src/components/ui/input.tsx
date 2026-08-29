import { cn } from "@/lib/utils/cn";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-text-secondary">{label}</span>
      <input
        id={inputId}
        className={cn(
          "h-10 rounded-[10px] border border-border bg-surface px-3 text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}
