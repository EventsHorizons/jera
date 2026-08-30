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
    <article className={cn("fc-panel flex flex-col gap-4", className)}>
      <div className="flex items-center gap-2">
        {Icon ? (
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              tone === "income" && "text-income",
              tone === "expense" && "text-text-muted",
              tone === "default" && "text-text-muted",
            )}
            strokeWidth={1.75}
            aria-hidden
          />
        ) : null}
        <p className="text-xs font-medium leading-none text-text-secondary">{label}</p>
      </div>
      <div className="flex flex-col gap-2">
        <p
          className={cn(
            "fc-mono-amount text-2xl font-semibold leading-none tracking-tight md:text-3xl",
            tone === "income" && "text-income",
            tone === "expense" && "text-text",
            tone === "default" && "text-text",
          )}
        >
          {value}
        </p>
        {subtitle ? (
          <p className="text-xs leading-none text-text-muted">{subtitle}</p>
        ) : null}
      </div>
    </article>
  );
}
