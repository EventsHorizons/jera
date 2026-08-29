import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

type BalanceCardProps = {
  label: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: "default" | "income" | "expense";
  className?: string;
};

export function BalanceCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone = "default",
  className,
}: BalanceCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-surface px-4 py-4",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {Icon ? (
          <Icon
            className={cn(
              "h-3.5 w-3.5",
              tone === "income" && "text-income",
              tone === "expense" && "text-expense",
              tone === "default" && "text-text-muted",
            )}
            strokeWidth={1.75}
          />
        ) : null}
        <p className="text-xs font-medium text-text-secondary">{label}</p>
      </div>
      <p
        className={cn(
          "fc-mono-amount mt-2 text-2xl font-semibold tracking-tight",
          tone === "income" && "text-income",
          tone === "expense" && "text-expense",
          tone === "default" && "text-text",
        )}
      >
        {value}
      </p>
      {subtitle ? (
        <p className="mt-1 text-xs text-text-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}
