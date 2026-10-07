import type { PriceObservation, Product } from '@/data/products';
import type { StoreId } from '@/data/stores';

export type CartLine = { productId: string; quantity: number };

export type PriceLevel = 'günstig' | 'normal' | 'teuer';

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function formatEuro(value: number): string {
  return euro.format(value);
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}

const dayMonth = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.`;

// Angebotswoche Montag bis Samstag, z. B. "05.10.–10.10."; sonntags die kommende Woche.
export function offerWeekLabel(today: Date = new Date()): string {
  const monday = new Date(today);
  const weekday = today.getDay(); // 0 = Sonntag
  monday.setDate(today.getDate() + (weekday === 0 ? 1 : 1 - weekday));
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return `${dayMonth(monday)}–${dayMonth(saturday)}`;
}

// Preise nur aus den aktiven Maerkten; hat keiner einen Preis, alle anzeigen statt nichts.
export function sortedPrices(product: Product, storeIds?: StoreId[]): PriceObservation[] {
  const active = storeIds ? product.prices.filter((price) => storeIds.includes(price.storeId)) : product.prices;
  return [...(active.length > 0 ? active : product.prices)].sort((a, b) => a.price - b.price);
}

export function cheapestPrice(product: Product, storeIds?: StoreId[]): PriceObservation {
  return sortedPrices(product, storeIds)[0];
}

export function unitPriceLabel(product: Product, price: number): string {
  const unitLabel = product.unit === 'Stk' ? 'Stk' : product.unit;
  return `${formatEuro(price / product.unitAmount)}/${unitLabel}`;
}

export function discountPercent(observation: PriceObservation): number | undefined {
  if (!observation.regularPrice || observation.regularPrice <= observation.price) {
    return undefined;
  }
  return Math.round((1 - observation.price / observation.regularPrice) * 100);
}

// Vergleicht den guenstigsten Preis mit dem Durchschnitt der letzten 8 Wochen.
export function priceLevel(product: Product, storeIds?: StoreId[]): { level: PriceLevel; percentVsAverage: number } {
  const average = product.history.reduce((sum, value) => sum + value, 0) / product.history.length;
  const current = cheapestPrice(product, storeIds).price;
  const percentVsAverage = Math.round((current / average - 1) * 100);
  if (percentVsAverage <= -10) {
    return { level: 'günstig', percentVsAverage };
  }
  if (percentVsAverage >= 10) {
    return { level: 'teuer', percentVsAverage };
  }
  return { level: 'normal', percentVsAverage };
}

export type StoreTotal = {
  storeId: StoreId;
  total: number;
  availableCount: number;
  missingProductIds: string[];
};

// Summe pro Markt; fehlende Artikel werden nicht mitgezaehlt, sondern ausgewiesen.
export function totalsPerStore(lines: CartLine[], products: Product[], storeIds: StoreId[]): StoreTotal[] {
  return storeIds
    .map((storeId) => {
      let total = 0;
      const missingProductIds: string[] = [];
      for (const line of lines) {
        const product = products.find((item) => item.id === line.productId);
        const observation = product?.prices.find((price) => price.storeId === storeId);
        if (observation) {
          total += observation.price * line.quantity;
        } else {
          missingProductIds.push(line.productId);
        }
      }
      return {
        storeId,
        total: Math.round(total * 100) / 100,
        availableCount: lines.length - missingProductIds.length,
        missingProductIds,
      };
    })
    .sort((a, b) => b.availableCount - a.availableCount || a.total - b.total);
}

export type SplitPlan = {
  storeIds: [StoreId, StoreId];
  total: number;
  assignments: Record<string, StoreId>;
};

// Bestes Paar aus zwei Maerkten, das alle Artikel abdeckt.
export function bestTwoStoreSplit(lines: CartLine[], products: Product[], storeIds: StoreId[]): SplitPlan | undefined {
  let best: SplitPlan | undefined;
  for (let i = 0; i < storeIds.length; i += 1) {
    for (let j = i + 1; j < storeIds.length; j += 1) {
      const pair: [StoreId, StoreId] = [storeIds[i], storeIds[j]];
      let total = 0;
      const assignments: Record<string, StoreId> = {};
      let complete = true;
      for (const line of lines) {
        const product = products.find((item) => item.id === line.productId);
        const options = product?.prices.filter((price) => pair.includes(price.storeId)) ?? [];
        if (options.length === 0) {
          complete = false;
          break;
        }
        const cheapest = options.reduce((a, b) => (a.price <= b.price ? a : b));
        total += cheapest.price * line.quantity;
        assignments[line.productId] = cheapest.storeId;
      }
      if (complete && (!best || total < best.total)) {
        best = { storeIds: pair, total: Math.round(total * 100) / 100, assignments };
      }
    }
  }
  return best;
}
