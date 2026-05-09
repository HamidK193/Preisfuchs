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

const retailerAliases: Record<string, string[]> = {
  "aldi sued": ["aldi", "aldi sued", "aldi sud", "aldi süd", "aldi süd"],
  lidl: ["lidl"],
  rewe: ["rewe"],
  edeka: ["edeka", "e center", "e-center"],
  kaufland: ["kaufland"]
};

export async function loadNearbyStores(postcode: string, radiusKm: number): Promise<StoreInfo[]> {
  const center = await geocodePostcode(postcode);
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: new URLSearchParams({ data: buildOverpassQuery(center.lat, center.lon, radiusKm) })
  });

  if (!response.ok) {
    throw new Error("Maerkte konnten nicht geladen werden.");
  }

  const payload = (await response.json()) as OverpassResponse;
  return payload.elements
    .map((element) => mapOverpassElement(element, center.lat, center.lon))
    .filter((store): store is StoreInfo => Boolean(store))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 80);
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
    `https://nominatim.openstreetmap.org/search?format=json&countrycodes=de&postalcode=${encodeURIComponent(postcode)}&limit=1`,
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
    lon: Number(first.lon)
  };
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
    openingHours: tags.opening_hours ?? "Oeffnungszeiten nicht hinterlegt",
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
  if (normalized.includes("aldi")) return "Aldi Sued";
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
