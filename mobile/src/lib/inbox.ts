import type { Product } from '@/data/products';
import type { StoreId } from '@/data/stores';
import { discountPercent, formatEuro, offerWeekLabel, sortedPrices } from '@/lib/pricing';
import type { NotificationSettings, PriceAlarm } from '@/state/app-state';

// Eintrag der Benachrichtigungs-Inbox. Wird aus den aktuellen Preisen abgeleitet,
// nicht verschickt; gespeichert werden nur gelesene und entfernte IDs.
export type InboxItem = {
  id: string;
  kind: 'alarm' | 'offers';
  title: string;
  text: string;
  productId?: string;
  // ISO-Datum, ab dem der Eintrag gilt (Beobachtung bzw. Wochenbeginn).
  date: string;
  read: boolean;
};

function mondayOf(today: Date): string {
  const monday = new Date(today);
  const weekday = today.getDay();
  monday.setDate(today.getDate() + (weekday === 0 ? 1 : 1 - weekday));
  return monday.toISOString().slice(0, 10);
}

export function buildInbox({
  products,
  alarms,
  activeStoreIds,
  notifications,
  today = new Date(),
}: {
  products: Product[];
  alarms: PriceAlarm[];
  activeStoreIds: StoreId[];
  notifications: NotificationSettings;
  today?: Date;
}): InboxItem[] {
  const items: InboxItem[] = [];

  if (notifications.priceAlerts) {
    for (const alarm of alarms) {
      const product = products.find((item) => item.id === alarm.productId);
      if (!product) continue;
      const storeIds = alarm.storeIds.length > 0 ? alarm.storeIds : activeStoreIds;
      const hit = product.prices
        .filter((price) => storeIds.includes(price.storeId) && price.price <= alarm.targetPrice)
        .sort((a, b) => a.price - b.price)[0];
      if (!hit) continue;
      items.push({
        // Neuer Eintrag, sobald eine andere Beobachtung den Wunschpreis erreicht.
        id: `alarm:${product.id}:${hit.storeId}:${hit.price}:${hit.observedAt}`,
        kind: 'alarm',
        title: `Preisalarm: ${product.brand} ${product.name}`,
        text: `${formatEuro(hit.price)} beobachtet (Wunschpreis ${formatEuro(alarm.targetPrice)}). Quelle: ${hit.source}${hit.demo ? ', Demo' : ''}.`,
        productId: product.id,
        date: hit.observedAt.slice(0, 10),
        read: false,
      });
    }
  }

  if (notifications.weeklyOffers) {
    const offers = products.filter((product) => discountPercent(sortedPrices(product, activeStoreIds)[0]) !== undefined);
    if (offers.length > 0) {
      const week = offerWeekLabel(today);
      items.push({
        id: `offers:${week}`,
        kind: 'offers',
        title: `Angebote ${week}`,
        text: `${offers.length} ${offers.length === 1 ? 'Angebot' : 'Angebote'} in deinen Märkten. Preise laut Quelle, ohne Gewähr.`,
        date: mondayOf(today),
        read: false,
      });
    }
  }

  return items.sort((a, b) => b.date.localeCompare(a.date));
}
