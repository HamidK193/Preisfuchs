import { catalogProduct, loadCatalog, loadCatalogPage, mergeCatalog, searchCatalog } from '@/lib/catalog';
import { groupByMarket } from '@/lib/search-results';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/data/products';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
const row = (index: number) => ({ gtin: String(index), name: `TEST Milch ${index}`, brand: 'TEST', quantity: '500 g',
  image_url: 'https://images.openfoodfacts.org/test/front.jpg', image_thumb_url: 'https://images.openfoodfacts.org/test/small.jpg',
  image_attribution: 'OFF contributors', source_url: 'https://world.openfoodfacts.org/product/test', categories_tags: ['en:dairies'], labels_tags: [] });

test('E4: all catalog pages are read, including over 500 genuine returned records, with no invented observations', async () => {
  const ranges: number[][] = [];
  const query = { select: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), range: jest.fn((start, end) => { ranges.push([start, end]); return query; }),
    returns: jest.fn(async () => ({ data: Array.from({ length: ranges.length === 1 ? 1000 : 200 }, (_, i) => row(i + (ranges.length - 1) * 1000)), error: null })) };
  (supabase!.from as jest.Mock).mockReturnValue(query);
  const products = await loadCatalog();
  expect(products).toHaveLength(1200);
  expect(ranges).toEqual([[0, 999], [1000, 1999]]);
  expect(products.every((p) => p.prices.length === 0)).toBe(true);
  expect(products[0].imageCredit).toContain('CC BY-SA 3.0');
  expect(products[0].imageThumbUrl).toContain('small.jpg');
});

test('E4: a failed catalog read rejects so app-state can use its local cache', async () => {
  const query = { select: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), range: jest.fn().mockReturnThis(), returns: jest.fn(async () => ({ error: { message: 'offline' }, data: null })) };
  (supabase!.from as jest.Mock).mockReturnValue(query);
  await expect(loadCatalogPage(0)).rejects.toThrow('offline');
});

test('E4: server search matches name and brand tokens with ordered paging', async () => {
  const query = { select: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), or: jest.fn().mockReturnThis(), range: jest.fn().mockReturnThis(), returns: jest.fn(async () => ({ data: [], error: null })) };
  (supabase!.from as jest.Mock).mockReturnValue(query);
  await loadCatalogPage(2, 'TEST Milch');
  expect(query.or.mock.calls).toEqual([['name.ilike.%TEST%,brand.ilike.%TEST%'], ['name.ilike.%Milch%,brand.ilike.%Milch%']]);
  expect(query.range).toHaveBeenCalledWith(2000, 2999);
  expect(searchCatalog([catalogProduct(row(1))], 'TEST Milch')).toHaveLength(1);
});

test('E4: merging preserves real observations and identity, never copies demo prices into the catalog', () => {
  const product = catalogProduct(row(1));
  const priced: Product = { ...product, id: 'article-id', prices: [{ storeId: 'lidl', price: 2, source: 'Open Prices', observedAt: '2026-11-27', demo: false }] };
  const merged = mergeCatalog([product, catalogProduct(row(2))], [priced]);
  expect(merged).toHaveLength(2);
  expect(merged[0].id).toBe('article-id');
  expect(merged[0].prices).toEqual(priced.prices);
  expect(merged[1].prices).toEqual([]);
});

test('E4: searching the maximum loaded 10,000 records takes less than 100 ms', () => {
  const products = Array.from({ length: 10000 }, (_, i) => catalogProduct(row(i)));
  const start = performance.now();
  expect(searchCatalog(products, 'MILCH 99')).toHaveLength(280);
  expect(performance.now() - start).toBeLessThan(100);
});

test('E6: grouping uses each market observation, keeps source/date and sorts stably', () => {
  const a = catalogProduct(row(1)), b = catalogProduct(row(2));
  a.prices = [{ storeId: 'lidl', price: 3, source: 'Open Prices', observedAt: '2026-11-27', demo: false },
    { storeId: 'rewe', price: 4, source: 'Community', observedAt: '2026-11-26', demo: false }];
  b.prices = [{ storeId: 'lidl', price: 2, source: 'Open Prices', observedAt: '2026-11-25', demo: false }];
  const groups = groupByMarket([a, b], ['lidl']);
  expect(groups).toHaveLength(1);
  expect(groups[0].observedAt).toBe('2026-11-27');
  expect(groups[0].items.map((item) => item.product.id)).toEqual([b.id, a.id]);
  expect(groups[0].items[0].observation).toBe(b.prices[0]);
  expect(a.prices[0].price).toBe(3);
});
