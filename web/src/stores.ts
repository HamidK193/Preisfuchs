import { supabase } from "./supabase";

export type StoreInfo = {
  id: string;
  retailer: string;
  name: string;
  address: string;
  openingHours: string;
  lat: number;
  lon: number;
  distanceKm: number;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
};

type OverpassElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OverpassElement[];
};

type CachedStoreLookup = {
  savedAt: number;
  stores: StoreInfo[];
  locationLabel?: string;
};

export type StoreSearchResult = {
  stores: StoreInfo[];
  locationLabel: string;
};

const STORE_CACHE_KEY = "preisfuchs-store-cache-v1";
const STORE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const NOMINATIM_BASE_URL = (
  (import.meta.env.VITE_NOMINATIM_BASE_URL as string | undefined) ?? "https://nominatim.openstreetmap.org"
).replace(/\/$/, "");
const OVERPASS_BASE_URL = (
  (import.meta.env.VITE_OVERPASS_BASE_URL as string | undefined) ?? "https://overpass-api.de"
).replace(/\/$/, "");

// "aldi nord" must come first: plain "aldi" otherwise maps Aldi Nord to Aldi Süd.
const retailerAliases: Record<string, string[]> = {
  "aldi nord": ["aldi nord"],
  "aldi sued": ["aldi", "aldi sued", "aldi sud", "aldi süd", "aldi süd"],
  lidl: ["lidl"],
  rewe: ["rewe"],
  edeka: ["edeka", "e center", "e-center"],
  kaufland: ["kaufland"]
};

const MAX_STORES = 80;
const SUPABASE_PAGE_SIZE = 1000;
const SUPABASE_MAX_PAGES = 5;

export type StoreRow = {
  source_ref: string | null;
  id: string;
  name: string;
  street: string | null;
  postcode: string | null;
  city: string | null;
  opening_hours: string | null;
  latitude: number;
  longitude: number;
  retailers: { name: string } | null;
};

export async function loadNearbyStores(postcode: string, radiusKm: number): Promise<StoreSearchResult> {
  const cacheKey = `${postcode}:${radiusKm}`;
  const cached = readCachedStores(cacheKey, postcode);
  if (cached) return cached;

  const center = await geocodePostcode(postcode);
  // Branches across Germany are imported weekly into Supabase; live Overpass is only the fallback.
  const stores = await loadStoresFromSupabase(center.lat, center.lon, radiusKm)
    .catch(() => null) ?? await loadStoresFromOverpass(center.lat, center.lon, radiusKm);
  const result = { stores, locationLabel: center.locationLabel };
  writeCachedStores(cacheKey, result);
  return result;
}

async function loadStoresFromSupabase(lat: number, lon: number, radiusKm: number): Promise<StoreInfo[] | null> {
  if (!supabase) return null;
  const radius = Math.max(1, Math.min(radiusKm, 50));
  const latDelta = radius / 111;
  const lonDelta = radius / (111 * Math.cos(toRadians(lat)));
  const rows: StoreRow[] = [];
  for (let page = 0; page < SUPABASE_MAX_PAGES; page += 1) {
    const { data, error } = await supabase
      .from("stores")
      .select("id,source_ref,name,street,postcode,city,opening_hours,latitude,longitude,retailers(name)")
      .eq("is_active", true)
      .gte("latitude", lat - latDelta).lte("latitude", lat + latDelta)
      .gte("longitude", lon - lonDelta).lte("longitude", lon + lonDelta)
      .order("id")
      .range(page * SUPABASE_PAGE_SIZE, (page + 1) * SUPABASE_PAGE_SIZE - 1)
      .returns<StoreRow[]>();
    if (error) throw error;
    rows.push(...data);
    if (data.length < SUPABASE_PAGE_SIZE) break;
  }
  return rows
    .map((row) => mapStoreRow(row, lat, lon))
    .filter((store) => store.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_STORES);
}

export function mapStoreRow(row: StoreRow, centerLat: number, centerLon: number): StoreInfo {
  const street = row.street ?? "";
  const cityLine = [row.postcode, row.city].filter(Boolean).join(" ");
  return {
    // Keep the former Overpass id format ("node-123") so cached and new ids match.
    id: row.source_ref?.replace("/", "-") ?? row.id,
    retailer: row.retailers?.name ?? row.name,
    name: row.name,
    address: [street, cityLine].filter(Boolean).join(", ") || "Adresse nicht hinterlegt",
    openingHours: row.opening_hours ?? "Öffnungszeiten nicht hinterlegt",
    lat: row.latitude,
    lon: row.longitude,
    distanceKm: distanceKm(centerLat, centerLon, row.latitude, row.longitude)
  };
}

async function loadStoresFromOverpass(lat: number, lon: number, radiusKm: number): Promise<StoreInfo[]> {
  const center = { lat, lon };
  const response = await fetch(`${OVERPASS_BASE_URL}/api/interpreter`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: new URLSearchParams({ data: buildOverpassQuery(center.lat, center.lon, radiusKm) })
  });

  if (!response.ok) {
    throw new Error("Märkte konnten nicht geladen werden.");
  }

  const payload = (await response.json()) as OverpassResponse;
  return payload.elements
    .map((element) => mapOverpassElement(element, center.lat, center.lon))
    .filter((store): store is StoreInfo => Boolean(store))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_STORES);
}

export function findNearestStore(retailer: string, stores: StoreInfo[]) {
  const normalizedRetailer = normalizeRetailer(retailer);
  return stores.find((store) => normalizeRetailer(store.retailer) === normalizedRetailer);
}

function buildOverpassQuery(lat: number, lon: number, radiusKm: number) {
  const radiusMeters = Math.max(1, Math.min(radiusKm, 50)) * 1000;
  return `
    [out:json][timeout:25];
    (
      node["shop"~"supermarket|discount_supermarket"](around:${radiusMeters},${lat},${lon});
      way["shop"~"supermarket|discount_supermarket"](around:${radiusMeters},${lat},${lon});
      relation["shop"~"supermarket|discount_supermarket"](around:${radiusMeters},${lat},${lon});
    );
    out center tags;
  `;
}

async function geocodePostcode(postcode: string) {
  const response = await fetch(
    `${NOMINATIM_BASE_URL}/search?format=json&addressdetails=1&countrycodes=de&postalcode=${encodeURIComponent(postcode)}&limit=1`,
    {
      headers: {
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error("PLZ konnte nicht gefunden werden.");
  }

  const results = (await response.json()) as NominatimResult[];
  const first = results[0];
  if (!first) {
    throw new Error("PLZ konnte nicht gefunden werden.");
  }

  return {
    lat: Number(first.lat),
    lon: Number(first.lon),
    locationLabel: locationLabelForPostcode(postcode, first)
  };
}

function readCachedStores(cacheKey: string, postcode: string): StoreSearchResult | undefined {
  try {
    const raw = window.localStorage.getItem(STORE_CACHE_KEY);
    if (!raw) return undefined;
    const cache = JSON.parse(raw) as Record<string, CachedStoreLookup>;
    const entry = cache[cacheKey];
    if (!entry || Date.now() - entry.savedAt > STORE_CACHE_TTL_MS || !isStoreList(entry.stores)) return undefined;
    return {
      stores: entry.stores,
      locationLabel: entry.locationLabel || inferLocationLabel(entry.stores, postcode)
    };
  } catch {
    return undefined;
  }
}

function inferLocationLabel(stores: StoreInfo[], postcode: string) {
  for (const store of stores) {
    const match = store.address.match(new RegExp(`\\b${postcode}\\s+([^,]+)`, "i"));
    if (match?.[1]) return match[1].trim();
  }
  return "Ort";
}

function writeCachedStores(cacheKey: string, result: StoreSearchResult) {
  try {
    const raw = window.localStorage.getItem(STORE_CACHE_KEY);
    const current = raw ? JSON.parse(raw) as Record<string, CachedStoreLookup> : {};
    const entries = Object.entries({
      ...current,
      [cacheKey]: { savedAt: Date.now(), stores: result.stores, locationLabel: result.locationLabel }
    })
      .filter(([, entry]) => entry && typeof entry.savedAt === "number" && Date.now() - entry.savedAt <= STORE_CACHE_TTL_MS)
      .sort((left, right) => right[1].savedAt - left[1].savedAt)
      .slice(0, 20);
    window.localStorage.setItem(STORE_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Location lookup still works when storage is disabled or contains stale data.
  }
}

function locationLabelForPostcode(postcode: string, result: NominatimResult) {
  const place = result.address?.city
    ?? result.address?.town
    ?? result.address?.village
    ?? result.address?.municipality;
  if (place) return place;

  const displayPart = result.display_name
    .split(",")
    .map((part) => part.trim())
    .find((part) => part && part !== postcode && !/^Deutschland$/i.test(part));
  return displayPart ?? "Ort";
}

function isStoreList(value: unknown): value is StoreInfo[] {
  return Array.isArray(value) && value.every((store) =>
    store
    && typeof store.id === "string"
    && typeof store.retailer === "string"
    && typeof store.name === "string"
    && typeof store.address === "string"
    && typeof store.openingHours === "string"
    && typeof store.lat === "number"
    && typeof store.lon === "number"
    && typeof store.distanceKm === "number"
  );
}

function mapOverpassElement(element: OverpassElement, centerLat: number, centerLon: number): StoreInfo | null {
  const tags = element.tags ?? {};
  const name = tags.name ?? tags.brand ?? "Unbekannter Markt";
  const retailer = detectRetailer(tags.brand ?? name);
  if (!retailer) {
    return null;
  }

  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") {
    return null;
  }

  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const cityLine = [tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" ");
  const address = [street, cityLine].filter(Boolean).join(", ") || "Adresse nicht hinterlegt";

  return {
    id: `${element.type}-${element.id}`,
    retailer,
    name,
    address,
    openingHours: tags.opening_hours ?? "Öffnungszeiten nicht hinterlegt",
    lat,
    lon,
    distanceKm: distanceKm(centerLat, centerLon, lat, lon)
  };
}

function detectRetailer(value: string) {
  const normalized = normalizeText(value);
  for (const [retailer, aliases] of Object.entries(retailerAliases)) {
    if (aliases.some((alias) => normalized.includes(normalizeText(alias)))) {
      return retailerTitle(retailer);
    }
  }
  return null;
}

function normalizeRetailer(value: string) {
  return detectRetailer(value) ?? retailerTitle(normalizeText(value));
}

function retailerTitle(value: string) {
  const normalized = normalizeText(value);
  if (normalized.includes("aldi nord")) return "Aldi Nord";
  if (normalized.includes("aldi")) return "Aldi Süd";
  if (normalized.includes("lidl")) return "Lidl";
  if (normalized.includes("rewe")) return "Rewe";
  if (normalized.includes("edeka") || normalized.includes("e center")) return "Edeka";
  if (normalized.includes("kaufland")) return "Kaufland";
  return value;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}
