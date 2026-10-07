import type { StoreId } from './stores';

export type PriceSource = 'Prospekt' | 'Open Prices' | 'Community';

export type PriceObservation = {
  storeId: StoreId;
  price: number;
  regularPrice?: number;
  source: PriceSource;
  observedAt: string; // ISO-Datum
  validUntil?: string;
  // true fuer erfundene Demo-Preise; echte Beobachtungen kommen aus Supabase.
  demo: boolean;
  // Echte Beobachtungen: Beleg und Ort der Beobachtung.
  sourceUrl?: string;
  locationLabel?: string;
};

export type Category = {
  id: string;
  label: string;
  imageUrl: string;
};

// Produktinfos wie bei Open Food Facts (Demo-Werte oder echte Daten aus off_products).
export type ProductInfo = {
  nutriScore?: 'A' | 'B' | 'C' | 'D' | 'E';
  labels: string[];
  ingredients?: string;
  ean: string;
  // pro 100 g bzw. 100 ml; fehlende Werte bleiben leer
  nutrition: Partial<Record<'energyKcal' | 'fat' | 'carbs' | 'sugar' | 'protein' | 'salt', number>>;
  // Quelle der Produktdaten, z. B. "Open Food Facts (ODbL)"
  source?: string;
};

export type Product = {
  id: string;
  // Barcode; bei echten Produkten aus der Datenbank, noetig fuer Preismeldungen.
  gtin?: string;
  name: string;
  brand: string;
  categoryId: string;
  packageSize: string;
  unitAmount: number; // Menge in kg bzw. l fuer den Grundpreis
  unit: 'kg' | 'l' | 'Stk';
  imageUrl: string;
  // Gesetzt, wenn das Bild aus Open Food Facts stammt (CC BY-SA, Hinweis anzeigen).
  imageCredit?: string;
  keywords?: string[];
  info?: ProductInfo;
  prices: PriceObservation[];
  // Durchschnittspreise der letzten 8 Wochen (aelteste zuerst).
  history: number[];
};

// Alle Daten in dieser Datei sind DEMO-Daten fuer das Design-MVP.
// Sie sind keine echten Marktpreise und werden in der App als Demo markiert.
export const DEMO_DATA_DATE = '2026-10-02';

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=480&q=80`;

export const categories: Category[] = [
  { id: 'obst', label: 'Obst & Gemüse', imageUrl: img('photo-1540420773420-3366772f4999') },
  { id: 'milch', label: 'Milch & Käse', imageUrl: img('photo-1628088062854-d1870b4553da') },
  { id: 'brot', label: 'Brot & Back', imageUrl: img('photo-1509440159596-0249088772ff') },
  { id: 'vorrat', label: 'Vorrat', imageUrl: img('photo-1586201375761-83865001e31c') },
  { id: 'getraenke', label: 'Getränke', imageUrl: img('photo-1544145945-f90425340c7e') },
  { id: 'snacks', label: 'Süßes', imageUrl: img('photo-1582058091505-f87a2e55a40f') },
  { id: 'tiefkuehl', label: 'Tiefkühl', imageUrl: img('photo-1580915411954-282cb1b0d780') },
  { id: 'fleisch', label: 'Fleisch & Wurst', imageUrl: img('photo-1607623814075-e51df1bdc82f') },
  { id: 'drogerie', label: 'Drogerie', imageUrl: img('photo-1583947215259-38e31be8751f') },
];

type Seed = Omit<Product, 'prices' | 'history'> & {
  prices: [StoreId, number, number?, PriceSource?][];
};

const seeds: Seed[] = [
  {
    id: 'butter_250',
    name: 'Irische Butter',
    brand: 'Kerrygold',
    categoryId: 'milch',
    packageSize: '250 g',
    unitAmount: 0.25,
    unit: 'kg',
    imageUrl: img('photo-1589985270826-4b7bb135bc9d'),
    prices: [
      ['lidl', 1.49, 2.49, 'Prospekt'],
      ['aldi', 1.69],
      ['penny', 1.89],
      ['rewe', 2.29, undefined, 'Open Prices'],
      ['edeka', 2.49],
      ['kaufland', 2.49],
    ],
  },
  {
    id: 'milk_15',
    name: 'H-Milch 1,5 %',
    brand: 'Weihenstephan',
    categoryId: 'milch',
    packageSize: '1 l',
    unitAmount: 1,
    unit: 'l',
    imageUrl: img('photo-1628088062854-d1870b4553da'),
    keywords: ['milch'],
    prices: [
      ['aldi', 1.15, undefined, 'Open Prices'],
      ['lidl', 1.19],
      ['rewe', 1.29, 1.79, 'Prospekt'],
      ['edeka', 1.49],
    ],
  },
  {
    id: 'eggs_10',
    name: 'Eier Bodenhaltung',
    brand: 'Gut & Günstig',
    categoryId: 'milch',
    packageSize: '10 Stück',
    unitAmount: 10,
    unit: 'Stk',
    imageUrl: img('photo-1582722872445-44dc5f7e3c8f'),
    prices: [
      ['lidl', 2.19],
      ['aldi', 2.19],
      ['kaufland', 2.29],
      ['rewe', 2.59, undefined, 'Open Prices'],
    ],
  },
  {
    id: 'bananas_1kg',
    name: 'Bananen',
    brand: 'Chiquita',
    categoryId: 'obst',
    packageSize: '1 kg',
    unitAmount: 1,
    unit: 'kg',
    imageUrl: img('photo-1571771894821-ce9b6c11b08e'),
    prices: [
      ['aldi', 1.29, 1.69, 'Prospekt'],
      ['lidl', 1.39],
      ['penny', 1.49],
      ['edeka', 1.99],
    ],
  },
  {
    id: 'pasta_500',
    name: 'Spaghetti N.5',
    brand: 'Barilla',
    categoryId: 'vorrat',
    packageSize: '500 g',
    unitAmount: 0.5,
    unit: 'kg',
    imageUrl: img('photo-1551462147-ff29053bfc14'),
    prices: [
      ['rewe', 0.99, 1.99, 'Prospekt'],
      ['kaufland', 1.29],
      ['edeka', 1.49],
      ['lidl', 1.59, undefined, 'Open Prices'],
    ],
  },
  {
    id: 'coffee_500',
    name: 'Caffè Crema Bohnen',
    brand: 'Lavazza',
    categoryId: 'vorrat',
    packageSize: '1 kg',
    unitAmount: 1,
    unit: 'kg',
    imageUrl: img('photo-1447933601403-0c6688de566e'),
    keywords: ['kaffee', 'espresso'],
    prices: [
      ['kaufland', 9.99, 15.99, 'Prospekt'],
      ['lidl', 11.99],
      ['aldi', 12.49],
      ['rewe', 13.99, undefined, 'Open Prices'],
      ['edeka', 14.49],
    ],
  },
  {
    id: 'bread_500',
    name: 'Buttertoast',
    brand: 'Golden Toast',
    categoryId: 'brot',
    packageSize: '500 g',
    unitAmount: 0.5,
    unit: 'kg',
    imageUrl: img('photo-1509440159596-0249088772ff'),
    prices: [
      ['penny', 1.49],
      ['lidl', 1.59],
      ['rewe', 1.79, undefined, 'Open Prices'],
    ],
  },
  {
    id: 'water_6x15',
    name: 'Mineralwasser Medium',
    brand: 'Gerolsteiner',
    categoryId: 'getraenke',
    packageSize: '6 × 1,5 l',
    unitAmount: 9,
    unit: 'l',
    imageUrl: img('photo-1544145945-f90425340c7e'),
    prices: [
      ['kaufland', 4.49, 5.49, 'Prospekt'],
      ['rewe', 4.99],
      ['edeka', 5.29],
    ],
  },
  {
    id: 'chocolate_100',
    name: 'Alpenmilch Schokolade',
    brand: 'Milka',
    categoryId: 'snacks',
    packageSize: '100 g',
    unitAmount: 0.1,
    unit: 'kg',
    imageUrl: img('photo-1582058091505-f87a2e55a40f'),
    prices: [
      ['penny', 0.88, 1.49, 'Prospekt'],
      ['lidl', 0.99],
      ['aldi', 0.99],
      ['rewe', 1.29, undefined, 'Open Prices'],
    ],
  },
  {
    id: 'pizza_ristorante',
    name: 'Pizza Ristorante Salame',
    brand: 'Dr. Oetker',
    categoryId: 'tiefkuehl',
    packageSize: '320 g',
    unitAmount: 0.32,
    unit: 'kg',
    imageUrl: img('photo-1580915411954-282cb1b0d780'),
    prices: [
      ['edeka', 1.99, 3.49, 'Prospekt'],
      ['kaufland', 2.29],
      ['rewe', 2.79],
    ],
  },
  {
    id: 'detergent_18',
    name: 'Universal Megaperls',
    brand: 'Persil',
    categoryId: 'drogerie',
    packageSize: '18 WL',
    unitAmount: 18,
    unit: 'Stk',
    imageUrl: img('photo-1583947215259-38e31be8751f'),
    prices: [
      ['kaufland', 4.99, 6.99, 'Prospekt'],
      ['rewe', 5.69],
      ['edeka', 5.99],
    ],
  },
  {
    id: 'oats_500',
    name: 'Zarte Haferflocken',
    brand: 'Kölln',
    categoryId: 'vorrat',
    packageSize: '500 g',
    unitAmount: 0.5,
    unit: 'kg',
    imageUrl: img('photo-1586201375761-83865001e31c'),
    prices: [
      ['aldi', 1.49],
      ['lidl', 1.49, undefined, 'Open Prices'],
      ['edeka', 1.89],
    ],
  },
];

// Deterministischer Demo-Verlauf, damit der Preisindikator etwas zeigen kann.
function demoHistory(seed: Seed): number[] {
  const regular = Math.max(...seed.prices.map(([, price, regularPrice]) => regularPrice ?? price));
  const cheapest = Math.min(...seed.prices.map(([, price]) => price));
  const base = (regular + cheapest) / 2;
  return Array.from({ length: 8 }, (_, week) => {
    const wave = Math.sin((week + seed.id.length) * 1.3) * 0.08;
    return Math.round(base * (1 + wave) * 100) / 100;
  });
}

// Demo-Produktinfos fuer einige Artikel; die uebrigen zeigen "Produktinfos folgen".
const infos: Record<string, ProductInfo> = {
  butter_250: {
    nutriScore: 'E',
    labels: ['Weidemilch', 'Vegetarisch'],
    ingredients: 'Butter (aus Milch), Speisesalz.',
    ean: '5011038133184',
    nutrition: { energyKcal: 740, fat: 82, carbs: 0.7, sugar: 0.7, protein: 0.7, salt: 1.2 },
  },
  milk_15: {
    nutriScore: 'A',
    labels: ['Vegetarisch'],
    ingredients: 'Milch, ultrahocherhitzt, 1,5 % Fett.',
    ean: '4008452011004',
    nutrition: { energyKcal: 47, fat: 1.5, carbs: 4.9, sugar: 4.9, protein: 3.4, salt: 0.13 },
  },
  pasta_500: {
    nutriScore: 'A',
    labels: ['Vegan'],
    ingredients: 'Hartweizengrieß, Wasser.',
    ean: '8076800195057',
    nutrition: { energyKcal: 359, fat: 2, carbs: 71, sugar: 3.5, protein: 13, salt: 0.01 },
  },
  coffee_500: {
    labels: ['Vegan'],
    ingredients: '100 % Kaffeebohnen, geröstet (Arabica und Robusta).',
    ean: '8000070038783',
    nutrition: { energyKcal: 2, fat: 0, carbs: 0, sugar: 0, protein: 0.1, salt: 0 },
  },
  bananas_1kg: {
    nutriScore: 'A',
    labels: ['Vegan'],
    ingredients: 'Bananen.',
    ean: '4011800568109',
    nutrition: { energyKcal: 89, fat: 0.3, carbs: 20, sugar: 17, protein: 1.1, salt: 0 },
  },
  chocolate_100: {
    nutriScore: 'E',
    labels: ['Vegetarisch'],
    ingredients: 'Zucker, Kakaobutter, Magermilchpulver, Kakaomasse, Süßmolkenpulver, Butterreinfett, Haselnussmasse, Emulgator (Sojalecithine), Aroma.',
    ean: '7622210449283',
    nutrition: { energyKcal: 539, fat: 30, carbs: 58, sugar: 57, protein: 6.3, salt: 0.37 },
  },
};

export const products: Product[] = seeds.map((seed) => ({
  ...seed,
  info: infos[seed.id],
  prices: seed.prices.map(([storeId, price, regularPrice, source]) => ({
    storeId,
    price,
    regularPrice,
    source: source ?? 'Prospekt',
    observedAt: DEMO_DATA_DATE,
    validUntil: regularPrice ? '2026-10-10' : undefined,
    demo: true,
  })),
  history: demoHistory(seed),
}));

// Ersetzt bzw. ergaenzt Produkte durch echte Beobachtungen aus Supabase (beim App-Start).
export function addRealProducts(realProducts: Product[]) {
  for (const real of realProducts) {
    const index = products.findIndex((product) => product.id === real.id);
    if (index >= 0) {
      products[index] = real;
    } else {
      products.unshift(real);
    }
  }
}

export function getProduct(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}
