import * as Linking from 'expo-linking';

import type { Product } from '@/data/products';
import type { CartLine } from '@/lib/pricing';
import type { ShoppingList } from '@/state/app-state';

// Teilen ohne Konto: die Liste steckt im Link (Artikel-ID*Menge, durch Komma getrennt).
// Wer den Link in Preisfuchs oeffnet, kann sie als eigene Liste uebernehmen.
export function shareLink(list: ShoppingList): string {
  const items = list.lines.map((line) => `${line.productId}*${line.quantity}`).join(',');
  return Linking.createURL('liste', { queryParams: { n: list.name, e: list.emoji, a: items } });
}

export function parseSharedItems(raw: string | undefined): CartLine[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => {
      const [productId, quantity] = part.split('*');
      return { productId, quantity: Math.max(1, Math.min(99, Number.parseInt(quantity, 10) || 1)) };
    })
    .filter((line) => line.productId);
}

export function shareText(list: ShoppingList, products: Product[]): string {
  const rows = list.lines.map((line) => {
    const product = products.find((item) => item.id === line.productId);
    const label = product ? `${product.brand} ${product.name} (${product.packageSize})`.trim() : line.productId;
    return `• ${line.quantity} × ${label}`;
  });
  return [`${list.emoji} ${list.name}`, ...rows].join('\n');
}
