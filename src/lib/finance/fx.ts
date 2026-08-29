import { isCurrencyCode, type CurrencyCode } from "@/lib/finance/currencies";

export type FxRates = Record<string, number>;

/** Convert amount from `from` to `to` using rates quoted against `base`. */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: FxRates,
  quoteBase = "USD",
): number {
  const a = from.toUpperCase();
  const b = to.toUpperCase();
  if (a === b) return amount;
  const fromRate = a === quoteBase ? 1 : rates[a];
  const toRate = b === quoteBase ? 1 : rates[b];
  if (!fromRate || !toRate) return amount;
  const inBase = amount / fromRate;
  return inBase * toRate;
}

export function sumInCurrency(
  rows: Array<{ amount: number; currency: string }>,
  target: string,
  rates: FxRates,
): number {
  return rows.reduce(
    (acc, row) => acc + convertAmount(row.amount, row.currency, target, rates),
    0,
  );
}

/**
 * USD-quoted rates for the requested symbols.
 * Uses a free CDN feed that includes LatAm currencies (COP, ARS, CLP, PEN, …).
 */
export async function fetchUsdRates(symbols: string[]): Promise<FxRates> {
  const unique = [
    ...new Set(
      symbols
        .map((s) => s.toUpperCase())
        .filter((s) => s !== "USD" && isCurrencyCode(s as CurrencyCode)),
    ),
  ];
  if (unique.length === 0) return {};

  const url =
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json";
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`FX fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as { usd?: Record<string, number> };
  const usd = data.usd ?? {};
  const rates: FxRates = {};
  for (const symbol of unique) {
    const rate = usd[symbol.toLowerCase()];
    if (typeof rate === "number" && rate > 0) {
      rates[symbol] = rate;
    }
  }
  return rates;
}
