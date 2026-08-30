import { STORAGE_KEYS } from "@/lib/brand/constants";

export type ThemeMode = "light" | "dark" | "system";

export const THEME_LABELS: Record<ThemeMode, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema",
};

export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.theme);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

export function resolveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(mode: ThemeMode) {
  const dark = resolveDark(mode);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function persistTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, mode);
  } catch {
    /* ignore */
  }
  applyTheme(mode);
}

/** Inline script — evita flash antes de hidratar React. */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(STORAGE_KEYS.theme)};var t=localStorage.getItem(k);var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=t==='dark'||((t==='system'||!t)&&d);document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light'}catch(e){}})();`;
