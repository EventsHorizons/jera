import { cn } from "@/lib/utils/cn";

type LogoSize = "sm" | "md" | "lg";

type JeraLogoProps = {
  showWordmark?: boolean;
  size?: LogoSize;
  className?: string;
  wordmarkClassName?: string;
};

const badgeBox = {
  sm: "h-8 w-8 rounded-lg text-[15px]",
  md: "h-9 w-9 rounded-xl text-[17px]",
  lg: "h-11 w-11 rounded-xl text-[20px]",
} as const;

const iconOnly = {
  sm: "text-[15px]",
  md: "text-[17px]",
  lg: "text-[20px]",
} as const;

const textSizes = {
  sm: "text-sm tracking-[-0.02em]",
  md: "text-base tracking-[-0.025em]",
  lg: "text-lg tracking-[-0.03em]",
} as const;

const RUNE = "ᛃ";

const runeFont =
  "font-['Segoe_UI_Symbol','Noto_Sans_Runic','Apple_Symbols','DejaVu_Sans',sans-serif]";

/** Elder Futhark rune ᛃ (Jera) — the actual Unicode glyph. */
export function JeraMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: LogoSize;
}) {
  return (
    <span
      className={cn(
        "inline-flex select-none items-center justify-center leading-none",
        runeFont,
        iconOnly[size],
        className,
      )}
      aria-hidden
    >
      {RUNE}
    </span>
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
          "inline-flex items-center justify-center bg-zinc-900 font-medium text-white",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
          runeFont,
          badgeBox[size],
        )}
        aria-hidden
      >
        {RUNE}
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
