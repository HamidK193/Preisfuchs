import { describe, expect, it } from "vitest";
import type { GroceryProduct, PriceObservation } from "./data";
import {
  buildCartLines,
  buildSingleStorePlans,
  buildSplitPlan,
  filterProductsForComparison,
  getBestRetailerPrices,
  isObservationActive,
  isObservationStale
} from "./comparison";

const now = new Date("2026-08-28T12:00:00+02:00");

function price(overrides: Partial<PriceObservation> & Pick<PriceObservation, "id" | "retailer" | "price">): PriceObservation {
  return {
    storeLocation: "Baden-Württemberg",
    observedAt: "2026-08-28T08:00:00Z",
    source: "Testquelle",
    sourceDetail: "Test",
    confidence: 0.8,
    ...overrides
  };
}

function product(id: string, prices: PriceObservation[]): GroceryProduct {
  return {
    id,
    name: id,
    category: "Test",
    packageSize: "1 Stück",
    symbolName: "cart",
    prices
  };
}

describe("Preisbeobachtungen", () => {
  it("combines a single-store basket only from the same observed location", () => {
    const items = [
      product("a", [price({ id: "a", retailer: "Lidl", locationSourceRef: "op:one", storeLocation: "Stuttgart", price: 1 })]),
      product("b", [price({ id: "b", retailer: "Lidl", locationSourceRef: "op:two", storeLocation: "Ulm", price: 2 })])
    ];
    const lines = buildCartLines({ a: 1, b: 1 }, items, []);
    const plans = buildSingleStorePlans(lines, []);
    expect(plans).toHaveLength(2);
    expect(plans.every(plan => !plan.complete && plan.missingCount === 1)).toBe(true);
    expect(buildSplitPlan(lines)).toMatchObject({ complete: true, retailerCount: 2, total: 3 });
  });

  it("never assigns an observed location price to another nearby branch", () => {
    const item = product("a", [price({ id: "a", retailer: "Lidl", locationSourceRef: "op:one", storeLocation: "Ulm", price: 1 })]);
    const stores = [{ id: "nearby", retailer: "Lidl", name: "Lidl Stuttgart", address: "Stuttgart", openingHours: "", lat: 48, lon: 9, distanceKm: 1 }];
    expect(getBestRetailerPrices(item, stores, now)[0]).toMatchObject({ storeLocation: "Ulm" });
    expect(getBestRetailerPrices(item, stores, now)[0].store).toBeUndefined();
  });

  it("excludes invalid and future observation dates", () => {
    expect(isObservationActive(price({ id: "bad", retailer: "Lidl", price: 1, observedAt: "invalid" }), now)).toBe(false);
    expect(isObservationActive(price({ id: "future", retailer: "Lidl", price: 1, observedAt: "2099-01-01" }), now)).toBe(false);
  });

  it("verwendet je Händler die neueste Beobachtung statt des historischen Tiefstpreises", () => {
    const item = product("milch", [
      price({ id: "old", retailer: "Lidl", price: 0.79, observedAt: "2026-08-01T08:00:00Z" }),
      price({ id: "new", retailer: "Lidl", price: 1.09, observedAt: "2026-08-28T08:00:00Z" })
    ]);

    expect(getBestRetailerPrices(item, [], now)).toMatchObject([{ id: "new", price: 1.09 }]);
  });

  it("vergleicht die neueste reguläre Beobachtung mit einem weiterhin gültigen App-Preis", () => {
    const item = product("milch", [
      price({ id: "regular-old", retailer: "Lidl", price: 0.79, observedAt: "2026-08-01T08:00:00Z" }),
      price({ id: "app-active", retailer: "Lidl", price: 0.89, observedAt: "2026-08-25T08:00:00Z", requiresApp: true, validUntil: "2026-08-30" }),
      price({ id: "regular-new", retailer: "Lidl", price: 1.09, observedAt: "2026-08-28T08:00:00Z" })
    ]);

    expect(getBestRetailerPrices(item, [], now)).toMatchObject([{ id: "app-active", price: 0.89 }]);
  });

  it("bevorzugt bei gleichem Preis die Variante ohne App-Bedingung", () => {
    const item = product("butter", [
      price({ id: "regular", retailer: "Edeka", price: 1.99 }),
      price({ id: "app", retailer: "Edeka", price: 1.99, requiresApp: true })
    ]);

    expect(getBestRetailerPrices(item, [], now)).toMatchObject([{ id: "regular" }]);
  });

  it("schließt abgelaufene und noch nicht gültige Angebote aus", () => {
    expect(isObservationActive(price({ id: "expired", retailer: "Rewe", price: 1, validUntil: "2026-08-27" }), now)).toBe(false);
    expect(isObservationActive(price({ id: "future", retailer: "Rewe", price: 1, validFrom: "2026-08-29" }), now)).toBe(false);
  });

  it("markiert mehr als 14 Tage alte Beobachtungen als möglicherweise veraltet", () => {
    expect(isObservationStale(price({ id: "old", retailer: "Lidl", price: 1, observedAt: "2026-08-13T08:00:00Z" }), now)).toBe(true);
    expect(isObservationStale(price({ id: "recent", retailer: "Lidl", price: 1, observedAt: "2026-08-20T08:00:00Z" }), now)).toBe(false);
  });

  it("nimmt App- und personalisierte Preise nur nach getrenntem Opt-in auf", () => {
    const item = product("kaffee", [
      price({ id: "regular", retailer: "Edeka", price: 5.99 }),
      price({ id: "app", retailer: "Edeka", price: 4.99, requiresApp: true }),
      price({ id: "personal", retailer: "Edeka", price: 3.99, requiresApp: true, personalized: true })
    ]);

    const regularOnly = filterProductsForComparison([item], {
      includeAppDiscounts: false,
      includePersonalizedDiscounts: false
    }, now)[0];
    const publicApp = filterProductsForComparison([item], {
      includeAppDiscounts: true,
      includePersonalizedDiscounts: false
    }, now)[0];
    const all = filterProductsForComparison([item], {
      includeAppDiscounts: true,
      includePersonalizedDiscounts: true
    }, now)[0];

    expect(regularOnly.prices.map((entry) => entry.id)).toEqual(["regular"]);
    expect(publicApp.prices.map((entry) => entry.id)).toEqual(["regular", "app"]);
    expect(all.prices.map((entry) => entry.id)).toEqual(["regular", "app", "personal"]);
  });
});

describe("Warenkorbvergleich", () => {
  it("weist fehlende Preise aus und behandelt die Summe als Teilsumme", () => {
    const priced = product("brot", [price({ id: "bread", retailer: "Aldi Süd", price: 1.5 })]);
    const missing = product("salz", []);
    const lines = buildCartLines({ brot: 2, salz: 1 }, [priced, missing], []);
    const plan = buildSplitPlan(lines);

    expect(plan.total).toBe(3);
    expect(plan.availableCount).toBe(1);
    expect(plan.missingCount).toBe(1);
    expect(plan.complete).toBe(false);
    expect(plan.rows.find((row) => row.product.id === "salz")?.lineTotal).toBeUndefined();
  });

  it("sortiert vollständige Ein-Laden-Pläne vor billigeren Teilplänen", () => {
    const first = product("a", [
      price({ id: "a-lidl", retailer: "Lidl", price: 1 }),
      price({ id: "a-rewe", retailer: "Rewe", price: 2 })
    ]);
    const second = product("b", [price({ id: "b-rewe", retailer: "Rewe", price: 2 })]);
    const lines = buildCartLines({ a: 1, b: 1 }, [first, second], []);

    const plans = buildSingleStorePlans(lines, []);
    expect(plans[0]).toMatchObject({ retailer: "Rewe", total: 4, complete: true, missingCount: 0 });
    expect(plans[1]).toMatchObject({ retailer: "Lidl", total: 1, complete: false, missingCount: 1 });
  });
});
