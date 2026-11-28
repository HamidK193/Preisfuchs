import type { Product } from '@/data/products';
import { supabase } from '@/lib/supabase';

export type CatalogRow = {
  gtin: string; name: string; brand: string | null; quantity: string | null;
  image_url: string | null; image_thumb_url?: string | null;
  image_attribution: string | null; source_url: string;
  categories_tags: string[]; labels_tags: string[];
};
export const CATALOG_PAGE_SIZE = 1000;
export const CATALOG_LIMIT = 10000;

export function catalogProduct(row: CatalogRow): Product {
  const tags = row.categories_tags.join(' ');
  const categoryId = /dair|milk|cheese|yogurt/.test(tags) ? 'milch'
    : /fruit|vegetable/.test(tags) ? 'obst' : /bread|bakery/.test(tags) ? 'brot'
    : /beverage|drink/.test(tags) ? 'getraenke' : /snack|chocolate|sweet/.test(tags) ? 'snacks'
    : /frozen/.test(tags) ? 'tiefkuehl' : /meat|fish/.test(tags) ? 'fleisch' : 'vorrat';
  const pack = row.quantity?.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)$/i);
  const amount = pack ? Number(pack[1].replace(',', '.')) : 0;
  const unit = pack?.[2].toLowerCase();
  return {
    id: `gtin_${row.gtin}`, gtin: row.gtin, name: row.name, brand: row.brand ?? '', categoryId,
    packageSize: row.quantity ?? 'Packung unbekannt',
    unitAmount: amount > 0 ? amount / (unit === 'g' || unit === 'ml' ? 1000 : 1) : 1,
    unit: unit === 'kg' || unit === 'g' ? 'kg' : unit === 'l' || unit === 'ml' ? 'l' : 'Stk',
    imageUrl: row.image_url ?? row.image_thumb_url ?? '', imageThumbUrl: row.image_thumb_url ?? undefined,
    imageCredit: row.image_url || row.image_thumb_url
      ? `Open Food Facts · ${row.image_attribution ?? 'Open Food Facts contributors'} · CC BY-SA 3.0` : undefined,
    imageSourcePage: row.source_url,
    info: { ean: row.gtin, labels: row.labels_tags.includes('en:organic') ? ['Bio'] : [], nutrition: {}, source: 'Open Food Facts (ODbL)' },
    prices: [], history: [],
  };
}

export async function loadCatalogPage(page: number, query = ''): Promise<Product[]> {
  if (!supabase) return [];
  let request = supabase.from('off_products').select('*').order('gtin');
  // PostgREST OR syntax has delimiters: remove them, along with wildcard escapes.
  const term = query.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim();
  if (query.trim() && !term) return [];
  for (const word of term.split(/\s+/).filter(Boolean)) {
    request = request.or(`name.ilike.%${word}%,brand.ilike.%${word}%`);
  }
  const { data, error } = await request.range(page * CATALOG_PAGE_SIZE, (page + 1) * CATALOG_PAGE_SIZE - 1).returns<CatalogRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).filter((row) => row.gtin && row.name.trim()).map(catalogProduct);
}

export async function loadCatalog(): Promise<Product[]> {
  const result: Product[] = [];
  for (let page = 0; result.length < CATALOG_LIMIT; page++) {
    const batch = await loadCatalogPage(page);
    result.push(...batch);
    if (batch.length < CATALOG_PAGE_SIZE) break;
  }
  return result;
}

export function mergeCatalog(catalog: Product[], priced: Product[]): Product[] {
  const byGtin = new Map(priced.filter((p) => p.gtin).map((p) => [p.gtin, p]));
  const merged = catalog.map((p) => {
    const observation = byGtin.get(p.gtin);
    return observation ? { ...p, ...observation, imageUrl: p.imageUrl || observation.imageUrl,
      imageThumbUrl: p.imageThumbUrl, imageCredit: p.imageCredit ?? observation.imageCredit, imageSourcePage: p.imageSourcePage } : p;
  });
  const ids = new Set(merged.map((p) => p.id));
  return [...merged, ...priced.filter((p) => !ids.has(p.id))];
}

const textCache = new WeakMap<Product, string>();
export function searchCatalog(items: Product[], query: string): Product[] {
  const words = query.trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
  if (!words.length) return items;
  return items.filter((p) => {
    let text = textCache.get(p);
    if (!text) { text = [p.name, p.brand, ...(p.keywords ?? [])].join(' ').toLocaleLowerCase('de'); textCache.set(p, text); }
    return words.every((word) => text.includes(word));
  });
}
