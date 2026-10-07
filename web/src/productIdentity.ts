export type BrandType = "manufacturer" | "private_label" | "unbranded" | "unknown";

const privateLabelBrands = [
  "Gut & Günstig", "Gut Bio", "Milbona", "Milsani", "K-Classic", "K-Bio",
  "REWE Regional", "REWE Beste Wahl", "ja!", "Snack Day", "Solevita", "Rio D'Oro",
  "Brölio", "WIFFKIDS", "Cucina Nobile", "Combino", "Fin Carré", "Alesto",
  "Sondey", "Chef Select", "Cien", "Crownfield", "Freshona", "Dulano", "Bellarom",
  "Snack Fun", "Choceur", "Grandessa", "Goldähren", "Meine Metzgerei", "Naturgut",
  "Food for Future", "BioBio"
];

const manufacturerBrands = [
  "Rügenwalder Mühle", "funny-frisch", "Dr. Oetker", "Coca-Cola", "Kellogg's",
  "Kellogg’s", "Kerrygold", "Langnese", "Schwartau", "Valensina", "Pringles",
  "Barilla", "Kölln", "Oryza", "Milka", "Haribo", "Katjes", "Leibniz", "Meggle",
  "Innocent", "Trolli", "Lay's", "Chiquita", "Iglo", "Volvic", "Persil", "Fairy",
  "Pampers", "HiPP", "Sheba", "Pedigree", "Harry", "ültje", "Kinder", "Ferrero"
];

export type BrandIdentity = {
  name?: string;
  type: BrandType;
};

export type OfferIdentityInput = {
  baseProductId: string;
  baseName: string;
  basePackageSize: string;
  observedName?: string | null;
  observedPackageSize?: string;
  explicitBrandName?: string | null;
  explicitBrandType?: BrandType | null;
  observationId?: string;
  articleId?: string | null;
  comparisonKey?: string | null;
  articleVerified?: boolean;
};

export type OfferIdentity = {
  key: string;
  displayName: string;
  packageSize: string;
  brand?: string;
  brandType: BrandType;
  isGeneric: boolean;
  isBaseProduct: boolean;
  reviewRequired?: boolean;
};

export function resolveOfferIdentity(input: OfferIdentityInput): OfferIdentity {
  const observedName = normalizeWhitespace(input.observedName ?? input.baseName);
  const packageSize = input.observedPackageSize ?? input.basePackageSize;
  const brand = inferBrandIdentity(observedName, input.explicitBrandName, input.explicitBrandType);

  if (input.articleVerified && input.articleId && input.observedPackageSize) {
    return {
      key: input.comparisonKey ?? `article:${input.articleId}`,
      displayName: observedName,
      packageSize,
      brand: brand.name,
      brandType: brand.type,
      isGeneric: Boolean(input.comparisonKey),
      isBaseProduct: false
    };
  }

  // Legacy names are display hints. They cannot prove Bio status, a recipe or a GTIN.
  return {
    key: `review:${input.baseProductId}:${input.observationId ?? normalizeIdentityKey(observedName)}:${normalizeIdentityKey(packageSize)}`,
    displayName: observedName,
    packageSize,
    brand: brand.name,
    brandType: brand.type,
    isGeneric: false,
    isBaseProduct: false,
    reviewRequired: true
  };
}

export function inferBrandIdentity(
  productName: string,
  explicitBrandName?: string | null,
  explicitBrandType?: BrandType | null
): BrandIdentity {
  const explicitName = normalizeWhitespace(explicitBrandName ?? "");
  if (explicitBrandType === "private_label") {
    return { name: explicitName || findBrand(productName, privateLabelBrands), type: "private_label" };
  }
  if (explicitBrandType === "manufacturer") {
    return { name: explicitName || findBrand(productName, manufacturerBrands), type: "manufacturer" };
  }

  const privateLabel = findBrand(`${explicitName} ${productName}`, privateLabelBrands);
  if (privateLabel) return { name: privateLabel, type: "private_label" };

  const manufacturer = findBrand(`${explicitName} ${productName}`, manufacturerBrands);
  if (manufacturer) return { name: manufacturer, type: "manufacturer" };

  return { name: explicitName || undefined, type: explicitBrandType ?? "unknown" };
}

function findBrand(value: string, brands: string[]) {
  const normalizedValue = ` ${normalizeIdentityKey(value)} `;
  return brands
    .slice()
    .sort((left, right) => right.length - left.length)
    .find((brand) => normalizedValue.includes(` ${normalizeIdentityKey(brand)} `));
}


function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeIdentityKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
