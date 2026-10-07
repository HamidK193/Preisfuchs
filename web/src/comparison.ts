import type { GroceryProduct, PriceObservation } from "./data";
import { findNearestStore, type StoreInfo } from "./stores";

export type Cart = Record<string, number>;

export type PriceWithStore = PriceObservation & {
  store?: StoreInfo;
};

export type CartLine = {
  product: GroceryProduct;
  quantity: number;
  bestPrice?: PriceWithStore;
};

export type ComparisonRow = {
  product: GroceryProduct;
  quantity: number;
  price?: PriceWithStore;
  lineTotal?: number;
};

export type SplitPlan = {
  rows: ComparisonRow[];
  total: number;
  retailerCount: number;
  availableCount: number;
  missingCount: number;
  staleCount: number;
  complete: boolean;
};

export type SingleStorePlan = {
  retailer: string;
  locationLabel?: string;
  total: number;
  availableCount: number;
  missingCount: number;
  staleCount: number;
  complete: boolean;
  rows: ComparisonRow[];
};

export type DiscountPreferences = {
  includeAppDiscounts: boolean;
  includePersonalizedDiscounts: boolean;
};

export function isObservationActive(price: PriceObservation, now = new Date()) {
  const observedAt = Date.parse(price.observedAt);
  if (!Number.isFinite(observedAt) || observedAt > now.getTime()) return false;
  if (price.validFrom && startOfDay(price.validFrom) > now.getTime()) return false;
  if (price.validUntil && endOfDay(price.validUntil) < now.getTime()) return false;
  return true;
}

export function isObservationEligible(
  price: PriceObservation,
  preferences: DiscountPreferences,
  now = new Date()
) {
  if (!isObservationActive(price, now)) return false;
  if (price.requiresApp && !preferences.includeAppDiscounts) return false;
  if (price.personalized && !preferences.includePersonalizedDiscounts) return false;
  return true;
}

export function isObservationStale(price: PriceObservation, now = new Date(), maxAgeDays = 14) {
  const observedAt = Date.parse(price.observedAt);
  if (Number.isNaN(observedAt)) return true;
  return now.getTime() - observedAt > maxAgeDays * 24 * 60 * 60 * 1_000;
}

export function filterProductsForComparison(
  products: GroceryProduct[],
  preferences: DiscountPreferences,
  now = new Date()
) {
  return products.map((product) => ({
    ...product,
    prices: product.prices.filter((price) => isObservationEligible(price, preferences, now))
  }));
}

export function getDisplayPrices(product: GroceryProduct, stores: StoreInfo[]): PriceWithStore[] {
  if (!stores.length) return product.prices;

  const nearbyRetailerPrices = product.prices
    .map((price) => ({
      ...price,
      store: price.locationSourceRef ? undefined : findNearestStore(price.retailer, stores)
    }))
    .filter((price) => Boolean(price.locationSourceRef || price.store));

  return nearbyRetailerPrices;
}

function latestPricesByStore(
  product: GroceryProduct,
  stores: StoreInfo[],
  now = new Date()
) {
  const sourcePrices = getDisplayPrices(product, stores).filter((price) => isObservationActive(price, now));
  const latestByPriceCondition = new Map<string, PriceWithStore>();

  sourcePrices.forEach((price) => {
    const key = `${purchaseLocationKey(price)}:${price.articleId ?? product.id}:${priceConditionKey(price)}`;
    const current = latestByPriceCondition.get(key);
    if (!current || isNewerOrCheaperOnSameDate(price, current)) {
      latestByPriceCondition.set(key, price);
    }
  });

  return [...latestByPriceCondition.values()];
}

export function getBestRetailerPrices(product: GroceryProduct, stores: StoreInfo[], now = new Date()) {
  const bestByRetailer = new Map<string, PriceWithStore>();
  latestPricesByStore(product, stores, now).forEach((price) => {
    const key = normalizeRetailer(price.retailer);
    const current = bestByRetailer.get(key);
    if (!current || isCheaperOrLessRestrictive(price, current)) {
      bestByRetailer.set(key, price);
    }
  });

  return Array.from(bestByRetailer.values());
}

export function buildCartLines(cart: Cart, products: GroceryProduct[], stores: StoreInfo[]): CartLine[] {
  return Object.entries(cart)
    .map<CartLine | null>(([productId, quantity]) => {
      const product = products.find((item) => item.id === productId);
      if (!product || quantity <= 0) return null;
      return {
        product,
        quantity,
        bestPrice: getCheapest(getBestRetailerPrices(product, stores))
      };
    })
    .filter((line): line is CartLine => line !== null);
}

export function buildSplitPlan(cartLines: CartLine[]): SplitPlan {
  const rows = cartLines.map<ComparisonRow>((line) => ({
    product: line.product,
    quantity: line.quantity,
    price: line.bestPrice,
    lineTotal: line.bestPrice ? line.bestPrice.price * line.quantity : undefined
  }));
  const pricedRows = rows.filter((row) => row.price);
  const retailers = new Set(pricedRows.map((row) => purchaseLocationKey(row.price!)));
  const missingCount = rows.length - pricedRows.length;
  const staleCount = pricedRows.filter((row) => row.price && isObservationStale(row.price)).length;

  return {
    rows,
    total: pricedRows.reduce((sum, row) => sum + (row.lineTotal ?? 0), 0),
    retailerCount: retailers.size,
    availableCount: pricedRows.length,
    missingCount,
    staleCount,
    complete: rows.length > 0 && missingCount === 0
  };
}

export function buildSingleStorePlans(cartLines: CartLine[], stores: StoreInfo[]): SingleStorePlan[] {
  const retailerKeys = new Set<string>();
  cartLines.forEach((line) => {
    latestPricesByStore(line.product, stores).forEach((price) => retailerKeys.add(purchaseLocationKey(price)));
  });

  return Array.from(retailerKeys)
    .map((retailerKey) => {
      const rows = cartLines.map<ComparisonRow>((line) => {
        const price = getCheapest(latestPricesByStore(line.product, stores).filter((candidate) =>
          purchaseLocationKey(candidate) === retailerKey
        ));
        return {
          product: line.product,
          quantity: line.quantity,
          price,
          lineTotal: price ? price.price * line.quantity : undefined
        };
      });
      const availableRows = rows.filter((row) => row.price);
      const missingCount = rows.length - availableRows.length;
      const staleCount = availableRows.filter((row) => row.price && isObservationStale(row.price)).length;
      return {
        retailer: availableRows[0]?.price?.retailer ?? retailerKey,
        locationLabel: availableRows[0]?.price?.locationSourceRef ? availableRows[0].price.storeLocation : undefined,
        total: availableRows.reduce((sum, row) => sum + (row.lineTotal ?? 0), 0),
        availableCount: availableRows.length,
        missingCount,
        staleCount,
        complete: rows.length > 0 && missingCount === 0,
        rows
      };
    })
    .sort((left, right) => {
      if (left.complete !== right.complete) return Number(right.complete) - Number(left.complete);
      if (left.missingCount !== right.missingCount) return left.missingCount - right.missingCount;
      return left.total - right.total;
    });
}

export function getFeaturedOffers(products: GroceryProduct[], stores: StoreInfo[]) {
  return products
    .map((product) => ({ product, price: getCheapest(getBestRetailerPrices(product, stores)) }))
    .filter((item): item is { product: GroceryProduct; price: PriceWithStore } => Boolean(item.price))
    .sort((left, right) => {
      const sourceScore = Number(right.price.offerType === "sale") - Number(left.price.offerType === "sale");
      return sourceScore || left.price.price - right.price.price;
    })
    .slice(0, 6);
}

export function getCheapest<T extends PriceObservation>(prices: T[]): T | undefined {
  return prices.slice().sort((left, right) => left.price - right.price)[0];
}

export function sameRetailer(left: string, right: string) {
  return normalizeRetailer(left) === normalizeRetailer(right);
}

function purchaseLocationKey(price: PriceObservation) {
  return `${normalizeRetailer(price.retailer)}:${price.locationSourceRef ?? "retailer-demo"}`;
}

export function normalizeRetailer(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9äöüß]+/g, " ").trim();
  if (normalized.includes("aldi")) return "aldi süd";
  if (normalized.includes("lidl")) return "lidl";
  if (normalized.includes("rewe")) return "rewe";
  if (normalized.includes("edeka") || normalized.includes("e center")) return "edeka";
  if (normalized.includes("kaufland")) return "kaufland";
  return normalized;
}

function isNewerOrCheaperOnSameDate(candidate: PriceWithStore, current: PriceWithStore) {
  const candidateTime = observationTime(candidate.observedAt);
  const currentTime = observationTime(current.observedAt);
  if (candidateTime !== currentTime) return candidateTime > currentTime;
  return candidate.price < current.price;
}

function priceConditionKey(price: PriceObservation) {
  if (price.personalized) return "personalized-app";
  if (price.requiresApp) return "public-app";
  return "public";
}

function isCheaperOrLessRestrictive(candidate: PriceWithStore, current: PriceWithStore) {
  if (candidate.price !== current.price) return candidate.price < current.price;
  return priceRestrictionRank(candidate) < priceRestrictionRank(current);
}

function priceRestrictionRank(price: PriceObservation) {
  if (price.personalized) return 2;
  if (price.requiresApp) return 1;
  return 0;
}

function observationTime(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function startOfDay(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return Number.NEGATIVE_INFINITY;
  parsed.setHours(0, 0, 0, 0);
  return parsed.getTime();
}

function endOfDay(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY;
  parsed.setHours(23, 59, 59, 999);
  return parsed.getTime();
}
