"use client";

import {
  applyTheme,
  persistTheme,
  readStoredTheme,
  type ThemeMode,
} from "@/lib/ui/theme";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeContextValue = {
  theme: ThemeMode;
  resolved: "light" | "dark";
  setTheme: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  const syncResolved = useCallback((mode: ThemeMode) => {
    const dark =
      mode === "dark" ||
      (mode === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setResolved(dark ? "dark" : "light");
    applyTheme(mode);
  }, []);

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    syncResolved(stored);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readStoredTheme() === "system") syncResolved("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [syncResolved]);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      setThemeState(mode);
      persistTheme(mode);
      syncResolved(mode);
    },
    [syncResolved],
  );

  const value = useMemo(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

export function useThemeOptional() {
  return useContext(ThemeContext);
}
