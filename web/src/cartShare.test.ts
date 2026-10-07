import { describe, expect, it } from "vitest";
import { buildCartShareUrl, decodeCart, encodeCart, sanitizeCart } from "./cartShare";

describe("geteilte Warenkörbe", () => {
  it("kodiert und dekodiert Produktmengen verlustfrei", () => {
    const cart = { milk_15: 2, "pasta__variant-1": 3 };
    expect(decodeCart(encodeCart(cart))).toEqual(cart);
  });

  it("verwirft ungültige, übergroße und unbekannte Einträge", () => {
    const allowed = new Set(["milk_15"]);
    expect(sanitizeCart({ milk_15: 2, unknown: 1, negative: -1, huge: 100, decimal: 1.5 }, allowed)).toEqual({ milk_15: 2 });
    expect(decodeCart("__proto__:2,constructor:1,milk_15:3", allowed)).toEqual({ milk_15: 3 });
  });

  it("erhält andere URL-Parameter und ersetzt einen alten Warenkorb", () => {
    const url = new URL(buildCartShareUrl(
      { milk_15: 2 },
      "https://preisfuchs.example/?demo=app-rabatte&cart=old:1",
      { includeAppDiscounts: true, includePersonalizedDiscounts: false }
    ));
    expect(url.searchParams.get("demo")).toBe("app-rabatte");
    expect(url.searchParams.get("app")).toBe("1");
    expect(url.searchParams.has("personalized")).toBe(false);
    expect(decodeCart(url.searchParams.get("cart"))).toEqual({ milk_15: 2 });
  });
});
