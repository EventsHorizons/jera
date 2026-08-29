export const BASE_CURRENCIES = [
  { value: "USD", label: "USD — Dólar" },
  { value: "COP", label: "COP — Peso colombiano" },
  { value: "MXN", label: "MXN — Peso mexicano" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "ARS", label: "ARS — Peso argentino" },
  { value: "CLP", label: "CLP — Peso chileno" },
  { value: "PEN", label: "PEN — Sol" },
  { value: "BRL", label: "BRL — Real" },
  { value: "GBP", label: "GBP — Libra" },
] as const;

export type CurrencyCode = (typeof BASE_CURRENCIES)[number]["value"];

export function isCurrencyCode(value: string): value is CurrencyCode {
  return BASE_CURRENCIES.some((c) => c.value === value);
}
