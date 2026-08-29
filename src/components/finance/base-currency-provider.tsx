"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { updateBaseCurrencyAction } from "@/app/actions/gamification";
import { STORAGE_KEYS } from "@/lib/brand/constants";
import { BASE_CURRENCIES } from "@/lib/finance/currencies";
import { useRouter } from "next/navigation";

type Ctx = {
  baseCurrency: string;
  setBaseCurrency: (code: string) => void;
  pending: boolean;
};

const BaseCurrencyContext = createContext<Ctx | null>(null);

export function useBaseCurrency() {
  const ctx = useContext(BaseCurrencyContext);
  if (!ctx) {
    throw new Error("useBaseCurrency must be used within BaseCurrencyProvider");
  }
  return ctx;
}

export function useBaseCurrencyOptional() {
  return useContext(BaseCurrencyContext);
}

export function BaseCurrencyProvider({
  initial,
  children,
}: {
  initial: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [baseCurrency, setLocal] = useState(() => {
    if (typeof window === "undefined") return initial.toUpperCase();
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.baseCurrencyOverride);
      return (stored || initial).toUpperCase();
    } catch {
      return initial.toUpperCase();
    }
  });

  useEffect(() => {
    setLocal(initial.toUpperCase());
  }, [initial]);

  const setBaseCurrency = useCallback(
    (code: string) => {
      const next = code.toUpperCase();
      setLocal(next);
      try {
        localStorage.setItem(STORAGE_KEYS.baseCurrencyOverride, next);
      } catch {
        /* ignore */
      }
      window.dispatchEvent(
        new CustomEvent("jera:base-currency", { detail: { currency: next } }),
      );
      startTransition(async () => {
        const fd = new FormData();
        fd.set("baseCurrency", next);
        await updateBaseCurrencyAction({}, fd);
        router.refresh();
      });
    },
    [router],
  );

  const value = useMemo(
    () => ({ baseCurrency, setBaseCurrency, pending }),
    [baseCurrency, setBaseCurrency, pending],
  );

  return (
    <BaseCurrencyContext.Provider value={value}>
      {children}
    </BaseCurrencyContext.Provider>
  );
}

export function BaseCurrencySwitcher({ className }: { className?: string }) {
  const { baseCurrency, setBaseCurrency, pending } = useBaseCurrency();
  return (
    <label className={className}>
      <span className="sr-only">Moneda base</span>
      <select
        value={baseCurrency}
        disabled={pending}
        onChange={(e) => setBaseCurrency(e.target.value)}
        className="h-9 rounded-lg border border-border/80 bg-surface-muted px-2 text-xs font-medium text-text"
        aria-label="Cambiar moneda base"
      >
        {BASE_CURRENCIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.value}
          </option>
        ))}
      </select>
    </label>
  );
}
