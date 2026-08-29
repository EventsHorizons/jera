import { cn } from "@/lib/utils/cn";

type LogoSize = "sm" | "md" | "lg";

type JeraLogoProps = {
  showWordmark?: boolean;
  size?: LogoSize;
  className?: string;
  wordmarkClassName?: string;
};

const iconBox = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
} as const;

const badgeBox = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-9 w-9 rounded-xl",
  lg: "h-11 w-11 rounded-xl",
} as const;

const textSizes = {
  sm: "text-sm tracking-[-0.02em]",
  md: "text-base tracking-[-0.025em]",
  lg: "text-lg tracking-[-0.03em]",
} as const;

/**
 * Geometric Elder Futhark ᛃ (Jera) — harvest / year cycle.
 * Two interlocking diamonds, crisp at 16–44px.
 */
export function JeraMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: LogoSize;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(iconBox[size], "shrink-0", className)}
      aria-hidden
    >
      {/* Upper season */}
      <path d="M12 2L19 9.2L12 12.4L5 9.2L12 2Z" fill="currentColor" />
      {/* Lower season — overlaps to form the cycle */}
      <path d="M12 11.6L19 14.8L12 22L5 14.8L12 11.6Z" fill="currentColor" />
    </svg>
  );
}

/** Alias for existing imports */
export function JeraIcon(props: { className?: string; size?: LogoSize }) {
  return <JeraMark {...props} />;
}

export function JeraLogo({
  showWordmark = true,
  size = "md",
  className,
  wordmarkClassName,
}: JeraLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center bg-zinc-900 text-white",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
          badgeBox[size],
        )}
      >
        <JeraMark size={size === "lg" ? "md" : "sm"} />
      </span>
      {showWordmark ? (
        <span
          className={cn(
            "font-semibold text-text",
            textSizes[size],
            wordmarkClassName,
          )}
        >
          Jera
        </span>
      ) : null}
    </span>
  );
}
