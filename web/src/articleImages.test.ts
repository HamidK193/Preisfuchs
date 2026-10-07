import { describe, expect, it } from "vitest";
import { verifiedImageFor } from "./articleImages";
import type { GroceryProduct } from "./data";

describe("reviewed article images", () => {
  const product: GroceryProduct = { id: "article:oil", articleId: "4e41d6c7-b843-57b1-982e-78a77e096939",
    name: "Bio Sonnenblumenöl", category: "Trockenware", packageSize: "500 ml", symbolName: "basket", prices: [],
    package: { amount: "5E+2", unit: "ml", count: 1, total: "5E+2", original: "500 ml" } };
  it("uses a reviewed photo only for the exact article and selling pack", () => {
    expect(verifiedImageFor(product)?.license).toBe("CC BY-SA 3.0");
    expect(verifiedImageFor({ ...product, articleId: "another-article" })).toBeUndefined();
    expect(verifiedImageFor({ ...product, package: { ...product.package!, count: 2 } })).toBeUndefined();
    expect(verifiedImageFor({ ...product, package: { ...product.package!, amount: "1000" } })).toBeUndefined();
    expect(verifiedImageFor({ ...product, package: undefined })).toBeUndefined();
  });
});
