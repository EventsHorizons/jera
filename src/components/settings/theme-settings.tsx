"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { THEME_LABELS, type ThemeMode } from "@/lib/ui/theme";
import { cn } from "@/lib/utils/cn";
import { Monitor, Moon, Sun } from "lucide-react";

const OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: "light",
    label: THEME_LABELS.light,
    description: "Fondo claro, verde mineral profundo.",
    icon: Sun,
  },
  {
    value: "dark",
    label: THEME_LABELS.dark,
    description: "Bosque nocturno con acentos luminosos.",
    icon: Moon,
  },
  {
    value: "system",
    label: THEME_LABELS.system,
    description: "Sigue la preferencia del dispositivo.",
    icon: Monitor,
  },
];

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="fc-panel max-w-lg space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-text">Apariencia</h2>
        <p className="mt-1 text-sm text-text-secondary">
          El modo oscuro tiene su propia paleta: más profunda, tranquila y con
          verde mineral luminoso para el progreso.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition",
                active
                  ? "border-primary bg-primary-soft ring-1 ring-primary/20"
                  : "border-border/80 bg-surface hover:bg-surface-muted",
              )}
              aria-pressed={active}
            >
              <span
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-lg",
                  active
                    ? "bg-primary text-on-primary"
                    : "bg-surface-muted text-text-secondary",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span>
                <span className="block text-sm font-medium text-text">
                  {opt.label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">
                  {opt.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
