import { cn } from "@/lib/utils/cn";

type JeraLogoProps = {
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  wordmarkClassName?: string;
};

const badgeSizes = {
  sm: "h-8 w-8 text-base",
  md: "h-9 w-9 text-lg",
  lg: "h-10 w-10 text-xl",
} as const;

const textSizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
} as const;

/** Elder Futhark rune ᛃ (Jera) — harvest, cycles, reward. */
export function JeraIcon({
  className,
  size = "md",
}: {
  className?: string;
  size?: keyof typeof badgeSizes;
}) {
  const runeSizes = { sm: "text-sm", md: "text-base", lg: "text-lg" } as const;
  return (
    <span
      className={cn(
        "inline-flex leading-none select-none",
        runeSizes[size],
        className,
      )}
      aria-hidden
    >
      ᛃ
    </span>
  );
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
          "inline-flex items-center justify-center rounded-xl bg-zinc-900 font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
          badgeSizes[size],
        )}
      >
        <JeraIcon size={size === "lg" ? "md" : "sm"} />
      </span>
      {showWordmark ? (
        <span
          className={cn(
            "font-semibold tracking-tight text-text",
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
