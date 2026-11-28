// Offline smoke checks when Jest is not installed. No network or native UI claims.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let ranges = [];
const row = (i) => ({ gtin: String(i), name: `TEST Milch ${i}`, brand: 'TEST', quantity: '500 g', image_url: null,
  image_attribution: null, source_url: 'https://world.openfoodfacts.org/product/test', categories_tags: ['en:dairies'], labels_tags: [] });
const client = { from(table) {
  assert.equal(table, 'off_products');
  return { select() { return this; }, order(value) { assert.equal(value, 'gtin'); return this; },
    range(start, end) { ranges.push([start, end]); this.start = start; return this; },
    async returns() { return { data: Array.from({ length: this.start === 0 ? 1000 : 200 }, (_, i) => row(this.start + i)), error: null }; } };
} };
function load(file) {
  const filename = path.join(root, file);
  const mod = new Module(filename, module);
  mod.require = (id) => id === '@/lib/supabase' ? { supabase: client } : require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, ignoreDeprecations: '6.0' },
  }).outputText, filename);
  return mod.exports;
}
(async () => {
  const catalog = load('src/lib/catalog.ts');
  const { groupByMarket } = load('src/lib/search-results.ts');
  const data = await catalog.loadCatalog();
  assert.equal(data.length, 1200);
  assert.deepEqual(ranges, [[0, 999], [1000, 1999]]);
  assert(data.every((p) => p.prices.length === 0));
  assert.equal(data[0].unitAmount, 0.5);
  const items = Array.from({ length: 10000 }, (_, i) => catalog.catalogProduct(row(i)));
  const start = performance.now();
  const result = catalog.searchCatalog(items, 'MILCH 99');
  const elapsed = performance.now() - start;
  assert.equal(result.length, 280); assert(elapsed < 100, `${elapsed} ms`);
  const priced = { ...data[0], id: 'observed-article', prices: [
    { storeId: 'lidl', price: 2, source: 'TEST Quelle', observedAt: '2026-11-27', demo: false },
    { storeId: 'rewe', price: 3, source: 'TEST Quelle', observedAt: '2026-11-26', demo: false },
  ] };
  const joined = catalog.mergeCatalog(data, [priced]);
  assert.equal(joined.length, 1200); assert.equal(joined[0].id, priced.id);
  assert.deepEqual(joined[0].prices, priced.prices); assert.deepEqual(joined[1].prices, []);
  const groups = groupByMarket([priced], ['lidl']);
  assert.equal(groups.length, 1); assert.equal(groups[0].observedAt, '2026-11-27');
  assert.equal(groups[0].items[0].observation.source, 'TEST Quelle');
  const home = fs.readFileSync(path.join(root, 'src/app/(tabs)/index.tsx'), 'utf8');
  assert(home.split('\n').length <= 100);
  console.log(`Core smoke checks passed: 1,200 paged test records, no invented prices, market grouping, Home <=100 lines; 10,000-record cold search ${elapsed.toFixed(2)} ms. Synthetic fixtures; no real Supabase or native UI verification.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
