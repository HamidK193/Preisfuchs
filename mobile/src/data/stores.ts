export type StoreId = 'lidl' | 'aldi' | 'aldi_nord' | 'rewe' | 'edeka' | 'kaufland' | 'penny' | 'netto' | 'norma';

// Handelskette mit Logo (Wikimedia Commons, gemeinfrei, Marke des Haendlers).
export type Chain = {
  id: StoreId;
  name: string;
  logo: number;
  // retailers.normalized_name in Supabase.
  retailer: string;
  // Erkennt die Kette an den OpenStreetMap-Tags brand, name oder operator (Fallback).
  pattern: RegExp;
};

// Reihenfolge wichtig: Aldi Nord vor Aldi Sued pruefen, sonst wird Aldi Nord als Aldi Sued erkannt.
export const chains: Chain[] = [
  { id: 'lidl', name: 'Lidl', logo: require('@/assets/images/stores/lidl.png'), retailer: 'lidl', pattern: /\blidl\b/i },
  { id: 'aldi_nord', name: 'Aldi Nord', logo: require('@/assets/images/stores/aldi_nord.png'), retailer: 'aldi nord', pattern: /aldi\s*nord/i },
  { id: 'aldi', name: 'Aldi Süd', logo: require('@/assets/images/stores/aldi.png'), retailer: 'aldi sued', pattern: /aldi\s*s(ü|ue|u)d/i },
  { id: 'rewe', name: 'Rewe', logo: require('@/assets/images/stores/rewe.png'), retailer: 'rewe', pattern: /\brewe\b/i },
  { id: 'edeka', name: 'Edeka', logo: require('@/assets/images/stores/edeka.png'), retailer: 'edeka', pattern: /\bedeka\b|e[\s-]center/i },
  { id: 'kaufland', name: 'Kaufland', logo: require('@/assets/images/stores/kaufland.png'), retailer: 'kaufland', pattern: /\bkaufland\b/i },
  { id: 'penny', name: 'Penny', logo: require('@/assets/images/stores/penny.png'), retailer: 'penny', pattern: /\bpenny\b/i },
  { id: 'netto', name: 'Netto', logo: require('@/assets/images/stores/netto.png'), retailer: 'netto marken-discount', pattern: /netto\s*marken/i },
  { id: 'norma', name: 'Norma', logo: require('@/assets/images/stores/norma.png'), retailer: 'norma', pattern: /\bnorma\b/i },
];

export function getChain(id: StoreId): Chain {
  const chain = chains.find((item) => item.id === id);
  if (!chain) {
    throw new Error(`Unbekannte Kette: ${id}`);
  }
  return chain;
}

// Eine einzelne Filiale, z. B. aus OpenStreetMap.
export type Branch = {
  key: string;
  chainId: StoreId;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  // Rohwert aus OpenStreetMap, z. B. "Mo-Sa 07:00-22:00".
  openingHours?: string;
};

// Kette mit ihrer naechsten Filiale im Umkreis.
export type Store = {
  id: StoreId;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  openingHours?: string;
  branchCount: number;
};

// Mittelpunkt des Ausgangsstandorts 72070 Tuebingen.
export const DEFAULT_CENTER = { latitude: 48.5216, longitude: 9.0576 };

// Beispielposition: Entfernung in km in eine Himmelsrichtung vom Mittelpunkt.
function examplePosition(bearingDeg: number, distanceKm: number) {
  const rad = (bearingDeg * Math.PI) / 180;
  const latitude = DEFAULT_CENTER.latitude + (distanceKm * Math.cos(rad)) / 111.32;
  const longitude =
    DEFAULT_CENTER.longitude + (distanceKm * Math.sin(rad)) / (111.32 * Math.cos((DEFAULT_CENTER.latitude * Math.PI) / 180));
  return { latitude, longitude };
}

function exampleStore(id: StoreId, address: string, bearing: number, distanceKm: number, branchCount: number): Store {
  return {
    id,
    name: getChain(id).name,
    address,
    ...examplePosition(bearing, distanceKm),
    distanceKm,
    openingHours: 'Mo-Sa 07:00-22:00',
    branchCount,
  };
}

// Ausgangswerte, bis der Nutzer einen Standort sucht. Danach ersetzt die Suche
// in OpenStreetMap diese Liste durch die Filialen am gewaehlten Standort.
export const DEMO_STORES: Store[] = [
  exampleStore('lidl', 'Herrenberger Str. 34, Tübingen', 250, 1.2, 3),
  exampleStore('aldi', 'Reutlinger Str. 12, Tübingen', 80, 1.8, 2),
  exampleStore('rewe', 'Wilhelmstr. 12, Tübingen', 10, 2.4, 2),
  exampleStore('edeka', 'Lustnauer Tor 4, Tübingen', 130, 3.1, 2),
  exampleStore('kaufland', 'Schaffhausenstr. 101, Tübingen', 200, 3.8, 1),
  exampleStore('penny', 'Schleifmühleweg 3, Tübingen', 300, 4.2, 1),
];

export const DEMO_BRANCHES: Branch[] = DEMO_STORES.map((store) => ({
  key: `demo-${store.id}`,
  chainId: store.id,
  address: store.address,
  latitude: store.latitude,
  longitude: store.longitude,
  distanceKm: store.distanceKm,
  openingHours: store.openingHours,
}));

// Kurzer Hinweis wie "bis 22:00" fuer Listen; leer, wenn keine Zeiten bekannt sind.
export function closingLabel(raw?: string): string {
  const hours = parseOpeningHours(raw);
  return hours ? `bis ${hours.openUntil}` : '';
}

// Liest einfache Oeffnungszeiten wie "Mo-Sa 07:00-22:00" aus.
export function parseOpeningHours(raw?: string): { opensAt: string; openUntil: string; sunday: boolean } | undefined {
  if (!raw) return undefined;
  const match = raw.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!match) return undefined;
  const pad = (time: string) => time.padStart(5, '0');
  return { opensAt: pad(match[1]), openUntil: pad(match[2]), sunday: /\bSu\b/.test(raw) && !/Su\s+off/i.test(raw) };
}
