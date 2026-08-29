import { cn } from "@/lib/utils/cn";

type LughLogoProps = {
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  wordmarkClassName?: string;
};

const iconSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
} as const;

const textSizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
} as const;

/** Minimal spear mark — upward lance inspired by Lugh. */
export function LughIcon({ className, size = "md" }: { className?: string; size?: keyof typeof iconSizes }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(iconSizes[size], "shrink-0", className)}
      aria-hidden
    >
      <path
        d="M12 2.5L17.5 11H14.25V21H9.75V11H6.5L12 2.5Z"
        fill="currentColor"
      />
      <path
        d="M8 21.5H16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LughLogo({
  showWordmark = true,
  size = "md",
  className,
  wordmarkClassName,
}: LughLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <LughIcon size={size === "lg" ? "md" : "sm"} />
      </span>
      {showWordmark ? (
        <span
          className={cn(
            "font-semibold tracking-tight text-text",
            textSizes[size],
            wordmarkClassName,
          )}
        >
          Lugh
        </span>
      ) : null}
    </span>
  );
}
