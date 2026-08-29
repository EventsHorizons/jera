import { convertAmount, type FxRates } from "@/lib/finance/fx";
import { isCurrencyCode, type CurrencyCode } from "@/lib/finance/currencies";
import { STORAGE_KEYS } from "@/lib/brand/constants";

const CACHE_TTL_MS = 60 * 60 * 1000;

type CachePayload = {
  rates: FxRates;
  asOf: string;
  fetchedAt: number;
};

function readCache(): CachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.fxCache);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed?.rates || !parsed.fetchedAt) return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rates: FxRates, asOf: string) {
  if (typeof window === "undefined") return;
  const payload: CachePayload = { rates, asOf, fetchedAt: Date.now() };
  localStorage.setItem(STORAGE_KEYS.fxCache, JSON.stringify(payload));
}

/** Merge into existing cache so repeated symbol sets reuse rates. */
function mergeCache(rates: FxRates, asOf: string) {
  const existing = readCache();
  const merged = { ...(existing?.rates ?? {}), ...rates };
  writeCache(merged, asOf);
  return merged;
}

export async function getClientFxRates(symbols: string[]): Promise<FxRates> {
  const needed = [
    ...new Set(
      symbols
        .map((s) => s.toUpperCase())
        .filter((s) => s !== "USD" && isCurrencyCode(s as CurrencyCode)),
    ),
  ];
  const cached = readCache();
  if (cached && needed.every((s) => typeof cached.rates[s] === "number")) {
    return cached.rates;
  }

  const res = await fetch(`/api/fx?symbols=${needed.join(",") || "EUR"}`);
  if (!res.ok) {
    if (cached) return cached.rates;
    throw new Error("No se pudieron obtener las tasas de cambio.");
  }
  const data = (await res.json()) as { rates?: FxRates; asOf?: string };
  return mergeCache(data.rates ?? {}, data.asOf ?? new Date().toISOString());
}

/**
 * Convert with explicit failure when a required rate is missing.
 * Avoids silent wrong amounts (previous bug).
 */
export function convertAmountStrict(
  amount: number,
  from: string,
  to: string,
  rates: FxRates,
): number | null {
  const a = from.toUpperCase();
  const b = to.toUpperCase();
  if (a === b) return amount;
  const fromRate = a === "USD" ? 1 : rates[a];
  const toRate = b === "USD" ? 1 : rates[b];
  if (!fromRate || !toRate) return null;
  return convertAmount(amount, a, b, rates);
}

export function peekCachedRates(): FxRates {
  return readCache()?.rates ?? {};
}
