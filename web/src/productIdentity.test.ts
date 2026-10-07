import { describe, expect, it } from "vitest";
import { inferBrandIdentity, resolveOfferIdentity } from "./productIdentity";

const magerquark = {
  baseProductId: "quark_500",
  baseName: "Magerquark",
  basePackageSize: "500 g"
};

describe("product identity", () => {
  it("groups private labels into one generic basket product", () => {
    const verified = { articleVerified: true, observedPackageSize: "500 g", comparisonKey: "group:verified-quark" };
    const milbona = resolveOfferIdentity({ ...magerquark, ...verified, articleId: "a", observedName: "Milbona Magerquark 500 g" });
    const ja = resolveOfferIdentity({ ...magerquark, ...verified, articleId: "b", observedName: "ja! Magerquark 500 g" });
    const kClassic = resolveOfferIdentity({ ...magerquark, ...verified, articleId: "c", observedName: "K-Classic Magerquark 500 g" });

    expect([milbona, ja, kClassic].map((identity) => identity.key)).toEqual([
      "group:verified-quark",
      "group:verified-quark",
      "group:verified-quark"
    ]);
    expect([milbona, ja, kClassic].every((identity) => identity.isGeneric)).toBe(true);
  });

  it("keeps a manufacturer product separate", () => {
    const generic = resolveOfferIdentity({
      baseProductId: "chips_175",
      baseName: "Kartoffelchips",
      basePackageSize: "175 g",
      observedName: "Snack Day Kartoffelchips Paprika 175 g"
    });
    const branded = resolveOfferIdentity({
      baseProductId: "chips_175",
      baseName: "Kartoffelchips",
      basePackageSize: "175 g",
      observedName: "funny-frisch Chipsfrisch Oriental 175 g"
    });

    expect(generic.reviewRequired).toBe(true);
    expect(branded).toMatchObject({
      isGeneric: false,
      brand: "funny-frisch",
      displayName: "funny-frisch Chipsfrisch Oriental 175 g"
    });
    expect(branded.key).not.toBe(generic.key);
  });

  it("retains source brands without approving an unverified merge", () => {
    const manufacturer = resolveOfferIdentity({
      ...magerquark,
      observedName: "Bärenhof Magerquark 500 g",
      explicitBrandName: "Bärenhof",
      explicitBrandType: "manufacturer"
    });
    const privateLabel = resolveOfferIdentity({
      ...magerquark,
      observedName: "Marktliebe Magerquark 500 g",
      explicitBrandName: "Marktliebe",
      explicitBrandType: "private_label"
    });

    expect(manufacturer.isGeneric).toBe(false);
    expect(privateLabel.isGeneric).toBe(false);
    expect(privateLabel.reviewRequired).toBe(true);
  });

  it("keeps organic status, fat levels and ambiguous descriptions out of the base group", () => {
    for (const observedName of ["Milbona Bio Magerquark 500 g", "Milbona Speisequark 20% 500 g", "Milbona Speisequark 40% 500 g", "Milbona Quark 500 g"]) {
      const identity = resolveOfferIdentity({ ...magerquark, observedName });
      expect(identity.isBaseProduct).toBe(false);
      expect(identity.reviewRequired).toBe(true);
      expect(identity.displayName).toBe(observedName);
    }
  });

  it("does not infer organic bananas or fruit from a source search slot", () => {
    const base = { baseProductId: "bananas_1kg", baseName: "Bio Bananen lose", basePackageSize: "1 kg" };
    for (const observedName of ["Bananen lose", "Bananen-Süßigkeiten", "Schoko-Bananen"]) {
      expect(resolveOfferIdentity({ ...base, observedName })).toMatchObject({ isBaseProduct: false, reviewRequired: true, displayName: observedName });
    }
  });

  it("never treats a brand substring or an unknown brand as a private label", () => {
    expect(inferBrandIdentity("Soja Naturjoghurt").type).toBe("unknown");
    expect(inferBrandIdentity("Oryzalin unbekannt").type).toBe("unknown");
    const first = resolveOfferIdentity({ ...magerquark, observedName: "Bärenhof Magerquark", observationId: "one" });
    const second = resolveOfferIdentity({ ...magerquark, observedName: "Bärenhof Magerquark", observationId: "two" });
    expect(first.key).not.toBe(second.key);
    expect(first.reviewRequired).toBe(true);
  });

  it("recognizes Kinder Joy across retailers without merging other Kinder products", () => {
    const base = { baseProductId: "chocolate", baseName: "Schokolade", basePackageSize: "20 g", observedPackageSize: "20 g", articleVerified: true, articleId: "joy" };
    const joy = resolveOfferIdentity({ ...base, observedName: "Kinder Joy 20 g" });
    expect(joy).toMatchObject({ brand: "Kinder", isGeneric: false });
    expect(joy.key).toBe(resolveOfferIdentity({ ...base, observedName: "Kinder Joy 20 g" }).key);
    expect(joy.key).not.toBe(resolveOfferIdentity({ ...base, articleId: "surprise", observedName: "Kinder Überraschung 20 g" }).key);
  });
});
