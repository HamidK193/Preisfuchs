import type { Product, PriceObservation } from '@/data/products';
import type { StoreId } from '@/data/stores';

export type MarketGroup = { storeId: StoreId; observedAt: string; items: { product: Product; observation: PriceObservation }[] };
export function groupByMarket(products: Product[], storeIds: StoreId[]): MarketGroup[] {
  const groups = new Map<StoreId, MarketGroup>();
  for (const product of products) for (const observation of product.prices) {
    if (!storeIds.includes(observation.storeId)) continue;
    const group = groups.get(observation.storeId) ?? { storeId: observation.storeId, observedAt: observation.observedAt, items: [] };
    group.observedAt = group.observedAt > observation.observedAt ? group.observedAt : observation.observedAt;
    group.items.push({ product, observation });
    groups.set(group.storeId, group);
  }
  return [...groups.values()].map((group) => ({ ...group, items: group.items.sort((a, b) => a.observation.price - b.observation.price || a.product.id.localeCompare(b.product.id)) }));
}
