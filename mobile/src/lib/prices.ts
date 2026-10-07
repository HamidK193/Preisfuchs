import { categories, type PriceObservation, type Product, type ProductInfo } from '@/data/products';
import { chains, type StoreId } from '@/data/stores';
import { supabase } from '@/lib/supabase';

// Oeffentliche, freigegebene Preise (View current_price_observations, Quelle meist Open Prices, ODbL).
type PriceRow = {
  product_id: string;
  article_id: string;
  article_name: string | null;
  brand_name: string | null;
  package: { unit?: string; total?: string; original?: string } | null;
  retailer_name: string;
  price: number;
  regular_price: number | null;
  observed_at: string;
  valid_until: string | null;
  source: string | null;
  source_url: string | null;
  location_label: string | null;
};

type ProductRow = { id: string; name: string; category: string; package_size: string };

type ArticleRow = { id: string; gtin: string | null };

// Produktdaten aus Open Food Facts (ODbL); Bilder nur nach Pruefung (image_reviewed).
type OffRow = {
  gtin: string;
  nutriscore_grade: string | null;
  nutriments: Record<string, number> | null;
  labels_tags: string[] | null;
  image_url: string | null;
  image_reviewed: boolean;
  image_attribution: string | null;
};

const LABELS: Record<string, string> = {
  'en:vegan': 'Vegan',
  'en:vegetarian': 'Vegetarisch',
  'en:organic': 'Bio',
  'en:no-gmos': 'Ohne Gentechnik',
  'en:no-lactose': 'Laktosefrei',
  'en:gluten-free': 'Glutenfrei',
  'en:fair-trade': 'Fairtrade',
};

function infoFromOff(off: OffRow): ProductInfo {
  const n = off.nutriments ?? {};
  const grade = off.nutriscore_grade?.toUpperCase();
  return {
    nutriScore: grade && 'ABCDE'.includes(grade) && grade.length === 1 ? (grade as ProductInfo['nutriScore']) : undefined,
    labels: [...new Set((off.labels_tags ?? []).map((tag) => LABELS[tag]).filter((label): label is string => Boolean(label)))],
    ean: off.gtin,
    nutrition: {
      energyKcal: n['energy-kcal_100g'],
      fat: n.fat_100g,
      carbs: n.carbohydrates_100g,
      sugar: n.sugars_100g,
      protein: n.proteins_100g,
      salt: n.salt_100g,
    },
    source: 'Produktdaten: Open Food Facts (ODbL)',
  };
}

// Kategorien der Datenbank auf die Kategorien der App abbilden.
const CATEGORY_MAP: Record<string, string> = {
  Molkerei: 'milch',
  Frische: 'milch',
  Obst: 'obst',
  Gemüse: 'obst',
  Backwaren: 'brot',
  Backen: 'vorrat',
  Trockenware: 'vorrat',
  Getränke: 'getraenke',
  Süßigkeiten: 'snacks',
  Tiefkühl: 'tiefkuehl',
  Fleisch: 'fleisch',
  Drogerie: 'drogerie',
};

// Preise aelter als 30 Tage gelten als "moeglicherweise veraltet".
export const STALE_AFTER_DAYS = 30;

export function isStale(observedAt: string, now = new Date()): boolean {
  return now.getTime() - new Date(observedAt).getTime() > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

function chainFor(retailerName: string): StoreId | undefined {
  return chains.find((chain) => chain.pattern.test(retailerName))?.id;
}

function packageOf(row: PriceRow): { amount: number; unit: Product['unit']; label: string } {
  const total = Number(row.package?.total ?? NaN);
  const unit = row.package?.unit;
  const label = row.package?.original ?? '';
  if (Number.isFinite(total) && (unit === 'g' || unit === 'ml')) {
    return { amount: total / 1000, unit: unit === 'g' ? 'kg' : 'l', label };
  }
  if (Number.isFinite(total) && (unit === 'kg' || unit === 'l')) {
    return { amount: total, unit, label };
  }
  return { amount: 1, unit: 'Stk', label: label || '1 Stück' };
}

// Laedt echte Preise und baut daraus Produkte. Ohne Verbindung: leere Liste, die App zeigt Demo-Daten.
export async function loadRealProducts(): Promise<Product[]> {
  if (!supabase) return [];
  const [prices, catalog] = await Promise.all([
    supabase
      .from('current_price_observations')
      .select('product_id,article_id,article_name,brand_name,package,retailer_name,price,regular_price,observed_at,valid_until,source,source_url,location_label')
      .returns<PriceRow[]>(),
    supabase.from('products').select('id,name,category,package_size').returns<ProductRow[]>(),
  ]);
  if (prices.error || !prices.data) return [];
  const productInfo = new Map((catalog.data ?? []).map((row) => [row.id, row]));

  // Barcode je Artikel und passende Open-Food-Facts-Daten.
  const articleIds = [...new Set(prices.data.map((row) => row.article_id))];
  const articles = articleIds.length
    ? await supabase.from('catalog_articles').select('id,gtin').in('id', articleIds).returns<ArticleRow[]>()
    : { data: [] as ArticleRow[] };
  const gtinByArticle = new Map((articles.data ?? []).map((row) => [row.id, row.gtin]));
  const gtins = [...new Set([...gtinByArticle.values()].filter((gtin): gtin is string => Boolean(gtin)))];
  const off = gtins.length
    ? await supabase
        .from('off_products')
        .select('gtin,nutriscore_grade,nutriments,labels_tags,image_url,image_reviewed,image_attribution')
        .in('gtin', gtins)
        .returns<OffRow[]>()
    : { data: [] as OffRow[] };
  const offByGtin = new Map((off.data ?? []).map((row) => [row.gtin, row]));

  const byArticle = new Map<string, PriceRow[]>();
  for (const row of prices.data) {
    byArticle.set(row.article_id, [...(byArticle.get(row.article_id) ?? []), row]);
  }

  const result: Product[] = [];
  for (const rows of byArticle.values()) {
    const first = rows[0];
    const pack = packageOf(first);
    const categoryId = CATEGORY_MAP[productInfo.get(first.product_id)?.category ?? ''] ?? 'vorrat';
    const observations: PriceObservation[] = [];
    for (const row of rows) {
      const storeId = chainFor(row.retailer_name);
      if (!storeId) continue;
      observations.push({
        storeId,
        price: Number(row.price),
        regularPrice: row.regular_price ? Number(row.regular_price) : undefined,
        source: 'Open Prices',
        observedAt: row.observed_at.slice(0, 10),
        validUntil: row.valid_until ?? undefined,
        demo: false,
        sourceUrl: row.source_url ?? undefined,
        locationLabel: row.location_label ?? undefined,
      });
    }
    if (observations.length === 0) continue;
    // Mehrere Beobachtungen je Kette: die neueste behalten.
    const latest = new Map<StoreId, PriceObservation>();
    for (const observation of observations.sort((a, b) => b.observedAt.localeCompare(a.observedAt))) {
      if (!latest.has(observation.storeId)) latest.set(observation.storeId, observation);
    }
    const prices = [...latest.values()];
    const gtin = gtinByArticle.get(first.article_id);
    const offRow = gtin ? offByGtin.get(gtin) : undefined;
    const reviewedImage = offRow?.image_reviewed && offRow.image_url ? offRow.image_url : undefined;
    result.push({
      id: first.product_id,
      name: first.article_name ?? productInfo.get(first.product_id)?.name ?? first.product_id,
      brand: first.brand_name ?? '',
      categoryId,
      packageSize: pack.label || productInfo.get(first.product_id)?.package_size || '',
      unitAmount: pack.amount,
      unit: pack.unit,
      imageUrl: reviewedImage ?? categories.find((category) => category.id === categoryId)?.imageUrl ?? categories[0].imageUrl,
      imageCredit: reviewedImage ? `Foto: ${offRow?.image_attribution ?? 'Open Food Facts contributors'}, CC BY-SA 3.0` : undefined,
      info: offRow ? infoFromOff(offRow) : undefined,
      prices,
      // Kein Wochenverlauf vorhanden: die beobachteten Preise als Verlauf nutzen.
      history: prices.map((price) => price.price),
    });
  }
  return result;
}
