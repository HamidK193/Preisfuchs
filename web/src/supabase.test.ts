import { describe, expect, it } from "vitest";
import { buildVariantProductId, mapProducts, type PriceObservationRow, type ProductRow } from "./supabase";

describe("stabile Produktvarianten", () => {
  it("behält die Katalog-ID nur für die echte Basisvariante", () => {
    expect(buildVariantProductId("milk_15", "milk 1 l", true)).toBe("milk_15");
    expect(buildVariantProductId("milk_15", "andere milch 1 l", false)).toMatch(/^milk_15__/);
  });

  it("ändert die Varianten-ID nicht durch eine andere Sortierreihenfolge", () => {
    const before = buildVariantProductId("milk_15", "milk_15 milbona h milch 1 l", false);
    const after = buildVariantProductId("milk_15", "milk_15 milbona h milch 1 l", false);

    expect(after).toBe(before);
  });
});

describe("Produktgruppierung", () => {
  const baseProduct: ProductRow = {
    id: "quark_500",
    name: "Magerquark",
    category: "Molkerei",
    package_size: "500 g"
  };

  function observed(overrides: Partial<PriceObservationRow> & Pick<PriceObservationRow, "id" | "product_name" | "retailer_name" | "price">): PriceObservationRow {
    return {
      product_id: "quark_500",
      unit_price: null,
      unit: null,
      observed_at: "2026-08-29T08:00:00Z",
      source: "Test",
      source_url: null,
      confidence: 1,
      ...overrides
    };
  }

  it("bündelt bestätigte Eigenmarken, ohne die Merkmale des Suchprodukts zu erben", () => {
    const verified = { article_review_status: "verified" as const, comparison_key: "group:quark", package: { amount: "500", unit: "g", count: 1, total: "500", original: "500 g" } };
    const products = mapProducts([baseProduct], [
      observed({ ...verified, article_id: "a", id: "lidl", product_name: "Milbona Magerquark 500 g", brand_name: "Milbona", brand_type: "private_label", retailer_name: "Lidl", price: 1.19 }),
      observed({ ...verified, article_id: "b", id: "rewe", product_name: "ja! Magerquark 500 g", brand_name: "ja!", brand_type: "private_label", retailer_name: "Rewe", price: 1.29 }),
      observed({ ...verified, article_id: "c", id: "kaufland", product_name: "K-Classic Magerquark 500 g", brand_name: "K-Classic", brand_type: "private_label", retailer_name: "Kaufland", price: 1.09 })
    ]);

    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({ id: "quark_500", name: "Magerquark", packageSize: "500 g" });
    expect(products[0].prices).toHaveLength(0);
    expect(products.find(product => product.id === "group:quark")?.prices).toHaveLength(3);
  });

  it("legt eine echte Herstellermarke als eigene Produktvariante an", () => {
    const chips: ProductRow = { id: "chips_175", name: "Kartoffelchips", category: "Süßigkeiten", package_size: "175 g" };
    const products = mapProducts([chips], [
      observed({ id: "private", product_id: "chips_175", product_name: "Snack Day Chips Paprika 175 g", brand_name: "Snack Day", brand_type: "private_label", retailer_name: "Lidl", price: 1.19 }),
      observed({ id: "brand", product_id: "chips_175", product_name: "funny-frisch Chipsfrisch Oriental 175 g", brand_name: "funny-frisch", brand_type: "manufacturer", retailer_name: "Rewe", price: 1.49 })
    ]);

    expect(products).toHaveLength(3);
    expect(products.find((product) => product.id === "chips_175")?.name).toBe("Kartoffelchips");
    expect(products.find((product) => product.brand === "funny-frisch")?.name).toBe("funny-frisch Chipsfrisch Oriental 175 g");
    expect(products.find((product) => product.id === "chips_175")?.prices).toHaveLength(0);
  });

  it("does not merge multipacks with the first inner package", () => {
    const products = mapProducts([baseProduct], [
      observed({ id: "multi", product_name: "Milbona Magerquark 2 × 500 g", retailer_name: "Lidl", price: 2.39 }),
      observed({ id: "single", product_name: "Milbona Magerquark 500 g", retailer_name: "Lidl", price: 1.29 })
    ]);
    expect(products.find((product) => product.prices.some(price => price.id === "single"))?.packageSize).toBe("500 g");
    expect(products.find((product) => product.packageSize === "2 × 500 g")?.prices.map((price) => price.id)).toEqual(["multi"]);
  });

  it("keeps a verified article ID across retailers and different source slots", () => {
    const verified = { article_id: "global-joy", article_name: "Kinder Joy", article_review_status: "verified" as const,
      package: { amount: "20", unit: "g", count: 1, total: "20", original: "20 g" } };
    const rows = [
      observed({ ...verified, id: "one", product_name: "Kinder Joy", retailer_name: "Lidl", price: 1.2 }),
      observed({ ...verified, id: "two", product_id: "another-slot", product_name: "Kinder Joy", retailer_name: "Rewe", price: 1.3 })
    ];
    const products = mapProducts([baseProduct, { ...baseProduct, id: "another-slot" }], rows);
    expect(products.find(product => product.id === "article:global-joy")?.prices).toHaveLength(2);
    const corrected = mapProducts([baseProduct], [{ ...rows[0], id: "new-price", product_name: "Changed source title" }]);
    expect(corrected.find(product => product.prices.length)?.id).toBe("article:global-joy");
    expect(corrected.find(product => product.prices.length)?.prices[0].storeLocation).toBe("Standort nicht belegt");
  });

  it("classifies banana sweets before fruit and avoids ice inside rice", () => {
    const banana: ProductRow = { id: "bananas_1kg", name: "Bio Bananen lose", category: "Obst", package_size: "1 kg" };
    const products = mapProducts([banana], [
      observed({ id: "sweets", product_id: banana.id, product_name: "Bananen-Süßigkeiten 200 g", retailer_name: "Lidl", price: 1.99 }),
      observed({ id: "chocolate", product_id: banana.id, product_name: "Schoko-Bananen 200 g", retailer_name: "Lidl", price: 1.99 })
    ]);
    expect(products.filter((product) => product.prices.length).map((product) => product.category)).toEqual(["Süßigkeiten", "Süßigkeiten"]);
    const rice = mapProducts([{ id: "rice_1kg", name: "Basmati Reis", category: "Trockenware", package_size: "1 kg" }], [
      observed({ id: "rice", product_id: "rice_1kg", product_name: "Oryza Basmati Reis 1 kg", retailer_name: "Rewe", price: 2.99 })
    ]);
    expect(rice.find((product) => product.prices.length)?.category).toBe("Trockenware");
  });
});
