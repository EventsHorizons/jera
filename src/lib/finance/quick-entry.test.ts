import { describe, expect, it } from "vitest";
import { matchCategory, parseQuickEntry } from "./quick-entry";

describe("parseQuickEntry", () => {
  it("parses amount and description", () => {
    expect(parseQuickEntry("Almuerzo $25 en restaurante")).toEqual({
      amount: 25,
      description: "Almuerzo restaurante",
      currency: null,
    });
  });

  it("parses amount without dollar sign", () => {
    expect(parseQuickEntry("Uber 12.50")).toEqual({
      amount: 12.5,
      description: "Uber",
      currency: null,
    });
  });

  it("parses thousands with dot separator", () => {
    expect(parseQuickEntry("Almuerzo $25.000")).toEqual({
      amount: 25000,
      description: "Almuerzo",
      currency: null,
    });
  });

  it("returns null amount when missing", () => {
    expect(parseQuickEntry("solo texto")).toEqual({
      amount: null,
      description: "solo texto",
      currency: null,
    });
  });

  it("detects currency code", () => {
    expect(parseQuickEntry("Café 12.50 COP")).toEqual({
      amount: 12.5,
      description: "Café",
      currency: "COP",
    });
  });
});

describe("matchCategory", () => {
  const categories = [
    { id: "1", name: "Comida" },
    { id: "2", name: "Transporte" },
  ];

  it("matches by keyword hint", () => {
    expect(matchCategory("Almuerzo con Juan", categories)).toBe("1");
  });

  it("falls back to first category", () => {
    expect(matchCategory("Misc", categories)).toBe("1");
  });
});
