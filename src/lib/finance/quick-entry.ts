export type CategoryOption = { id: string; name: string };

const KEYWORD_HINTS: Record<string, string[]> = {
  comida: ["almuerzo", "cena", "restaurante", "super", "mercado", "café", "coffee"],
  transporte: ["uber", "taxi", "gasolina", "metro", "bus", "parking"],
  hogar: ["luz", "agua", "internet", "alquiler", "renta"],
  ocio: ["netflix", "spotify", "cine", "bar"],
  salud: ["farmacia", "doctor", "gym", "gimnasio"],
};

export function parseQuickEntry(input: string): {
  amount: number | null;
  description: string;
} {
  const trimmed = input.trim();
  if (!trimmed) return { amount: null, description: "" };

  const amountMatch =
    trimmed.match(
      /(?:^|\s)\$?\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:usd|mxn|eur|cop)?(?:\s|$)/i,
    ) ?? null;

  if (!amountMatch) {
    return { amount: null, description: trimmed };
  }

  let raw = amountMatch[1];
  if (raw.includes(".") && raw.includes(",")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    raw = raw.replace(/\./g, "");
  } else {
    raw = raw.replace(",", ".");
  }
  const amount = Number.parseFloat(raw);
  const description = trimmed
    .replace(amountMatch[0], " ")
    .replace(/\ben\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    description: description || "Gasto",
  };
}

export function matchCategory(
  description: string,
  categories: CategoryOption[],
  fallbackId?: string,
): string | undefined {
  if (categories.length === 0) return fallbackId;

  const lower = description.toLowerCase();

  for (const cat of categories) {
    const catLower = cat.name.toLowerCase();
    if (lower.includes(catLower) || catLower.includes(lower)) {
      return cat.id;
    }
  }

  for (const [hintKey, words] of Object.entries(KEYWORD_HINTS)) {
    if (!words.some((w) => lower.includes(w))) continue;
    const match = categories.find((c) => c.name.toLowerCase().includes(hintKey));
    if (match) return match.id;
  }

  return fallbackId ?? categories[0]?.id;
}
