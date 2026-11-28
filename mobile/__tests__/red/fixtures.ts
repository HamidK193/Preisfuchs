import type { Product } from '@/data/products';
import type { Store } from '@/data/stores';

// Deliberately synthetic TEST fixtures; never imported by the application.
export const testProduct: Product = {
  id: 'ux-test-product', gtin: '0000000000000', name: 'TEST Produkt', brand: 'TEST',
  categoryId: 'milch', packageSize: '500 g', unitAmount: 0.5, unit: 'kg',
  imageUrl: 'https://images.openfoodfacts.org/test/front.jpg',
  imageCredit: 'Open Food Facts contributors, CC BY-SA 3.0',
  history: [2.5, 2],
  prices: [
    { storeId: 'rewe', price: 3, source: 'Open Prices', observedAt: '2026-11-27', demo: false },
    { storeId: 'lidl', price: 1, source: 'Open Prices', observedAt: '2026-11-26', demo: false },
    { storeId: 'aldi', price: 2, source: 'Community', observedAt: '2026-11-25', demo: false },
  ],
};

export const testStores: Store[] = [
  { id: 'rewe', name: 'Rewe', address: 'TEST 3', distanceKm: 3, latitude: 0, longitude: 0, branchCount: 1 },
  { id: 'lidl', name: 'Lidl', address: 'TEST 1', distanceKm: 1, latitude: 0, longitude: 0, branchCount: 1 },
  { id: 'aldi', name: 'Aldi Süd', address: 'TEST 2', distanceKm: 2, latitude: 0, longitude: 0, branchCount: 1 },
];

export const mockState = {
  cartCount: 3, location: { plz: '10115', city: 'Berlin', radiusKm: 10 }, unreadCount: 0,
  addToCart: jest.fn(), toggleFavorite: jest.fn(), completeOnboarding: jest.fn(),
  activeStoreIds: ['lidl', 'aldi', 'rewe'], favorites: [], alarms: [], stores: testStores,
  getStore: (id: string) => testStores.find((store) => store.id === id),
  storesFromOsm: false, onboarded: false,
  consent: { personalizedAds: false, analytics: false }, updateConsent: jest.fn(),
  notifications: { priceAlerts: false, cartChanges: false, weeklyOffers: false },
  updateNotifications: jest.fn(), toggleStore: jest.fn(),
  priceData: { kind: 'cached', loadedAt: '2026-11-27T12:00:00Z', reloading: false },
  reloadPrices: jest.fn(),
};
