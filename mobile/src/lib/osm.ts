import { chains, type Branch, type Store, type StoreId } from '@/data/stores';
import { supabase } from '@/lib/supabase';

// Oeffentliche Overpass-API von OpenStreetMap (Daten: © OpenStreetMap-Mitwirkende, ODbL).
// Nur bei Nutzeraktion abfragen und das Ergebnis lokal speichern (Fair-Use-Regeln).
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function chainFor(tags: Record<string, string>): StoreId | undefined {
  const text = [tags.brand, tags.name, tags.operator].filter(Boolean).join(' ');
  return chains.find((chain) => chain.pattern.test(text))?.id;
}

function addressOf(tags: Record<string, string>): string {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const city = [tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ');
  return [street, city].filter(Boolean).join(', ') || 'Adresse nicht hinterlegt';
}

export type NearbyResult = { stores: Store[]; branches: Branch[] };

type Center = { latitude: number; longitude: number };

type StoreRow = {
  id: string;
  source_ref: string | null;
  street: string | null;
  postcode: string | null;
  city: string | null;
  opening_hours: string | null;
  latitude: number;
  longitude: number;
  retailers: { normalized_name: string } | null;
};

const PAGE_SIZE = 1000;
const MAX_PAGES = 5;

// Sucht Supermaerkte der bekannten Ketten im Umkreis und waehlt je Kette die naechste Filiale.
// Quelle: woechentlich aus OpenStreetMap importierte Filialen in Supabase; Overpass nur als Fallback.
export async function findNearbyStores(center: Center, radiusKm: number): Promise<NearbyResult> {
  const fromSupabase = await findStoresInSupabase(center, radiusKm).catch(() => undefined);
  const branches = fromSupabase ?? (await findStoresInOverpass(center, radiusKm));
  return summarize(branches);
}

async function findStoresInSupabase(center: Center, radiusKm: number): Promise<Branch[] | undefined> {
  if (!supabase) return undefined;
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos((center.latitude * Math.PI) / 180));
  const rows: StoreRow[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await supabase
      .from('stores')
      .select('id,source_ref,street,postcode,city,opening_hours,latitude,longitude,retailers(normalized_name)')
      .eq('is_active', true)
      .gte('latitude', center.latitude - latDelta)
      .lte('latitude', center.latitude + latDelta)
      .gte('longitude', center.longitude - lonDelta)
      .lte('longitude', center.longitude + lonDelta)
      .order('id')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .returns<StoreRow[]>();
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  const branches: Branch[] = [];
  for (const row of rows) {
    const chainId = chains.find((chain) => chain.retailer === row.retailers?.normalized_name)?.id;
    if (!chainId) continue;
    const distance = distanceKm(center, row);
    if (distance > radiusKm) continue;
    const street = row.street ?? '';
    const city = [row.postcode, row.city].filter(Boolean).join(' ');
    branches.push({
      key: row.source_ref ?? row.id,
      chainId,
      address: [street, city].filter(Boolean).join(', ') || 'Adresse nicht hinterlegt',
      latitude: row.latitude,
      longitude: row.longitude,
      distanceKm: Math.round(distance * 10) / 10,
      openingHours: row.opening_hours ?? undefined,
    });
  }
  return branches;
}

async function findStoresInOverpass(center: Center, radiusKm: number): Promise<Branch[]> {
  const radius = Math.round(radiusKm * 1000);
  const query = `[out:json][timeout:25];nwr["shop"~"^(supermarket|discount)$"](around:${radius},${center.latitude},${center.longitude});out center tags;`;

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Preisfuchs-App/1.0 (Testversion)' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!response.ok) {
    throw new Error(`OpenStreetMap antwortet mit ${response.status}`);
  }
  const data = (await response.json()) as { elements: OverpassElement[] };

  const branches: Branch[] = [];
  for (const element of data.elements) {
    const tags = element.tags ?? {};
    const chainId = chainFor(tags);
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    if (!chainId || latitude === undefined || longitude === undefined) continue;
    branches.push({
      key: `${element.type}-${element.id}`,
      chainId,
      address: addressOf(tags),
      latitude,
      longitude,
      distanceKm: Math.round(distanceKm(center, { latitude, longitude }) * 10) / 10,
      openingHours: tags.opening_hours,
    });
  }
  return branches;
}

function summarize(branches: Branch[]): NearbyResult {
  branches.sort((a, b) => a.distanceKm - b.distanceKm);

  const stores: Store[] = [];
  for (const chain of chains) {
    const ofChain = branches.filter((branch) => branch.chainId === chain.id);
    const nearest = ofChain[0];
    if (!nearest) continue;
    stores.push({
      id: chain.id,
      name: chain.name,
      address: nearest.address,
      latitude: nearest.latitude,
      longitude: nearest.longitude,
      distanceKm: nearest.distanceKm,
      openingHours: nearest.openingHours,
      branchCount: ofChain.length,
    });
  }
  stores.sort((a, b) => a.distanceKm - b.distanceKm);

  return { stores, branches };
}
