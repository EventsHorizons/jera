import { cn } from "@/lib/utils/cn";
import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
};

export function Select({
  label,
  error,
  options,
  className,
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium leading-none text-text-secondary">{label}</span>
      <select
        id={selectId}
        className={cn(
          "h-11 min-h-11 rounded-xl border border-border/80 bg-surface px-4 text-text outline-none transition focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5",
          error && "border-danger",
          className,
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}
