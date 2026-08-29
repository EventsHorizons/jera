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
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-text-secondary">{label}</span>
      <select
        id={selectId}
        className={cn(
          "h-10 rounded-[10px] border border-border bg-surface px-3 text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
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
