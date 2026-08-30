import { cn } from "@/lib/utils/cn";

type ProgressBarProps = {
  value: number;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
  animate?: boolean;
};

export function ProgressBar({
  value,
  className,
  trackClassName,
  fillClassName,
  animate = true,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("fc-progress-track", trackClassName, className)}>
      <div
        className={cn(
          "fc-progress-fill",
          animate && "fc-progress-fill-animate",
          fillClassName,
        )}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
