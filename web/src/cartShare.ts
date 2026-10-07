import type { Cart } from "./comparison";

const MAX_SHARED_ITEMS = 50;
const MAX_QUANTITY = 99;
const MAX_PRODUCT_ID_LENGTH = 200;
export const CART_STORAGE_KEY = "preisfuchs-cart-v1";

export function sanitizeCart(value: unknown, allowedProductIds?: ReadonlySet<string>): Cart {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>)
    .slice(0, MAX_SHARED_ITEMS)
    .reduce<Cart>((cart, [productId, rawQuantity]) => {
      const quantity = Number(rawQuantity);
      if (
        !productId ||
        isUnsafeProductId(productId) ||
        productId.length > MAX_PRODUCT_ID_LENGTH ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > MAX_QUANTITY ||
        (allowedProductIds && !allowedProductIds.has(productId))
      ) {
        return cart;
      }
      cart[productId] = quantity;
      return cart;
    }, {});
}

export function encodeCart(cart: Cart) {
  return Object.entries(sanitizeCart(cart))
    .map(([productId, quantity]) => `${encodeURIComponent(productId)}:${quantity}`)
    .join(",");
}

export function decodeCart(value: string | null, allowedProductIds?: ReadonlySet<string>): Cart {
  if (!value || value.length > 12_000) return {};

  const parsed = value.split(",").reduce<Record<string, number>>((cart, entry) => {
    const separator = entry.lastIndexOf(":");
    if (separator <= 0) return cart;
    try {
      cart[decodeURIComponent(entry.slice(0, separator))] = Number(entry.slice(separator + 1));
    } catch {
      return cart;
    }
    return cart;
  }, Object.create(null) as Record<string, number>);

  return sanitizeCart(parsed, allowedProductIds);
}

export function readInitialCart() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("cart")) return decodeCart(params.get("cart"));

  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (stored) return sanitizeCart(JSON.parse(stored));
  } catch {
    // Storage can be unavailable or contain stale data; start with an empty cart.
  }

  if (params.get("demo") === "app-rabatte") {
    return { bananas_1kg: 1, pears_1kg: 1, milk_15: 1, pasta_500: 1 };
  }
  return {};
}

export function persistCart(cart: Cart) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(sanitizeCart(cart)));
  } catch {
    // The app remains usable when browser storage is disabled.
  }
}

export function buildCartShareUrl(
  cart: Cart,
  currentUrl = window.location.href,
  preferences?: { includeAppDiscounts: boolean; includePersonalizedDiscounts: boolean }
) {
  const url = new URL(currentUrl);
  const encoded = encodeCart(cart);
  if (encoded) url.searchParams.set("cart", encoded);
  else url.searchParams.delete("cart");
  if (preferences?.includeAppDiscounts) url.searchParams.set("app", "1");
  else url.searchParams.delete("app");
  if (preferences?.includeAppDiscounts && preferences.includePersonalizedDiscounts) {
    url.searchParams.set("personalized", "1");
  } else {
    url.searchParams.delete("personalized");
  }
  return url.toString();
}

function isUnsafeProductId(value: string) {
  return value === "__proto__" || value === "prototype" || value === "constructor";
}
