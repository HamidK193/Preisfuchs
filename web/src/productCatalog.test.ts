import { describe, expect, it } from "vitest";
import seedProducts from "../../data/standard_products.json";
import { categories, demoProducts } from "./data";
import { cleanProductName, containsRetailerName } from "./productCatalog";
import { productImageOverrides } from "./productImages";

describe("product catalog quality", () => {
  it("loads every central seed product into the local web catalog", () => {
    expect(seedProducts).toHaveLength(76);
    expect(demoProducts).toHaveLength(seedProducts.length);
    expect(new Set(demoProducts.map((product) => product.id))).toEqual(
      new Set(seedProducts.map((product) => product.id))
    );
  });

  it("uses only navigable categories", () => {
    const categoryIds = new Set(categories.map((category) => category.id));
    expect(seedProducts.every((product) => categoryIds.has(product.category))).toBe(true);
    expect(categories.every((category) => seedProducts.some((product) => product.category === category.id))).toBe(true);
  });

  it("keeps retailer chains out of displayed product names", () => {
    expect(seedProducts.filter((product) => containsRetailerName(product.name))).toEqual([]);
    expect(demoProducts.filter((product) => containsRetailerName(product.name))).toEqual([]);
    expect(cleanProductName("Lidl: Milbona H-Milch 1,5%" )).toBe("Milbona H-Milch 1,5%");
    expect(cleanProductName("REWE Regional Äpfel")).toBe("Regional Äpfel");
    expect(cleanProductName("Butter bei E-Center")).toBe("Butter");
  });

  it("has one intentional image assignment for every seed product", () => {
    const seedIds = new Set(seedProducts.map((product) => product.id));
    const imageIds = new Set(Object.keys(productImageOverrides));
    expect(imageIds).toEqual(seedIds);
    expect(demoProducts.every((product) => Boolean(product.imageUrl))).toBe(true);
    expect(Object.values(productImageOverrides).every((url) =>
      url.startsWith("https://") || url.startsWith("/product-images/")
    )).toBe(true);
  });
});
