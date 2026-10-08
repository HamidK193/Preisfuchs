import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { getChain, type Branch, type Store, type StoreId } from '@/data/stores';
import { addRealProducts, type Product } from '@/data/products';
import type { CartLine } from '@/lib/pricing';
import { loadRealProducts } from '@/lib/prices';

export type Location = {
  street: string;
  plz: string;
  city: string;
  radiusKm: number;
  latitude: number;
  longitude: number;
};

export type NotificationSettings = {
  priceAlerts: boolean;
  cartChanges: boolean;
  weeklyOffers: boolean;
  weekday: 'Mo' | 'Di' | 'Mi' | 'Do' | 'Fr' | 'Sa';
  quietHours: boolean;
};

export type ConsentSettings = {
  personalizedAds: boolean;
  analytics: boolean;
};

export type PriceAlarm = {
  productId: string;
  targetPrice: number;
  storeIds: StoreId[];
  push: boolean;
};

type PersistedState = {
  cart: CartLine[];
  favorites: string[];
  checked: string[];
  location: Location;
  // Naechste Filiale je Kette und alle Filialen am gewaehlten Standort.
  stores: Store[];
  branches: Branch[];
  // true, sobald ein Standort festgelegt und seine Maerkte gesucht wurden.
  storesFromOsm: boolean;
  activeStoreIds: StoreId[];
  notifications: NotificationSettings;
  consent: ConsentSettings;
  alarms: PriceAlarm[];
  // true nach dem Onboarding (Intro, Einwilligung, Standort, Maerkte, Mitteilungen).
  onboarded: boolean;
  recentSearches: string[];
};

// Herkunft der angezeigten echten Preise:
// live = gerade geladen, cached = ohne Verbindung aus dem Zwischenspeicher, offline = nur Demo-Daten.
export type PriceDataStatus = { kind: 'live' | 'cached' | 'offline' | 'demo'; loadedAt?: string; reloading: boolean };

type AppState = PersistedState & {
  addToCart: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  toggleChecked: (productId: string) => void;
  clearChecked: () => void;
  toggleFavorite: (productId: string) => void;
  setLocation: (location: Location, nearby: { stores: Store[]; branches: Branch[] }) => void;
  getStore: (id: StoreId) => Store;
  toggleStore: (storeId: StoreId) => void;
  updateNotifications: (changes: Partial<NotificationSettings>) => void;
  updateConsent: (changes: Partial<ConsentSettings>) => void;
  saveAlarm: (alarm: PriceAlarm) => void;
  removeAlarm: (productId: string) => void;
  resetAllData: () => void;
  completeOnboarding: () => void;
  addRecentSearch: (term: string) => void;
  removeRecentSearch: (term: string) => void;
  priceData: PriceDataStatus;
  reloadPrices: () => void;
  cartCount: number;
  // true, sobald der gespeicherte Zustand geladen ist.
  loaded: boolean;
};

// Kostenlose Version: hoechstens 3 Preisalarme (siehe docs/MONETARISIERUNG.md).
export const FREE_ALARM_LIMIT = 3;

const STORAGE_KEY = 'preisfuchs-state-v1';
// Zuletzt geladene echte Preise fuer die Nutzung ohne Verbindung.
const PRICE_CACHE_KEY = 'preisfuchs-prices-v1';
const MAX_RECENT_SEARCHES = 6;

type PriceCache = { loadedAt: string; products: Product[] };

// Echte Preise laden; ohne Verbindung die zuletzt gespeicherten verwenden.
async function fetchPrices(): Promise<Omit<PriceDataStatus, 'reloading'>> {
  try {
    const real = await loadRealProducts();
    if (real.length === 0) return { kind: 'demo' };
    addRealProducts(real);
    const cache: PriceCache = { loadedAt: new Date().toISOString(), products: real };
    AsyncStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache)).catch(() => undefined);
    return { kind: 'live', loadedAt: cache.loadedAt };
  } catch {
    const raw = await AsyncStorage.getItem(PRICE_CACHE_KEY).catch(() => null);
    if (!raw) return { kind: 'offline' };
    const cache = JSON.parse(raw) as PriceCache;
    addRealProducts(cache.products);
    return { kind: 'cached', loadedAt: cache.loadedAt };
  }
}

const initialState: PersistedState = {
  cart: [
    { productId: 'butter_250', quantity: 1 },
    { productId: 'milk_15', quantity: 2 },
    { productId: 'bananas_1kg', quantity: 1 },
    { productId: 'pasta_500', quantity: 2 },
  ],
  favorites: ['coffee_500', 'butter_250'],
  checked: [],
  // Kein Standard-Standort: die App fragt beim ersten Start danach.
  location: { street: '', plz: '', city: '', radiusKm: 5, latitude: 0, longitude: 0 },
  stores: [],
  branches: [],
  storesFromOsm: false,
  activeStoreIds: [],
  notifications: { priceAlerts: true, cartChanges: true, weeklyOffers: true, weekday: 'Mo', quietHours: true },
  consent: { personalizedAds: false, analytics: false },
  alarms: [],
  onboarded: false,
  recentSearches: [],
};

// Uebernimmt gespeicherte Werte und fuellt fehlende Felder aus aelteren Versionen auf.
function restore(raw: string): PersistedState {
  const saved = JSON.parse(raw) as Partial<PersistedState>;
  if (!saved.storesFromOsm) {
    return { ...initialState, cart: saved.cart ?? initialState.cart, favorites: saved.favorites ?? initialState.favorites };
  }
  return {
    ...initialState,
    ...saved,
    // Wer schon vor dem Onboarding einen Standort hatte, sieht es nicht noch einmal.
    onboarded: saved.onboarded ?? true,
    location: { ...initialState.location, ...saved.location },
    notifications: { ...initialState.notifications, ...saved.notifications },
    consent: { ...initialState.consent, ...saved.consent },
  };
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [loaded, setLoaded] = useState(false);
  const [priceData, setPriceData] = useState<PriceDataStatus>({ kind: 'demo', reloading: false });

  useEffect(() => {
    const savedState = AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          setState(restore(raw));
        }
      })
      .catch(() => undefined);
    // Echte Preise aus Supabase vor dem ersten Anzeigen laden; ohne Netz den Zwischenspeicher bzw. Demo-Daten.
    const realPrices = fetchPrices().then((status) => setPriceData({ ...status, reloading: false }));
    Promise.all([savedState, realPrices]).finally(() => setLoaded(true));
  }, []);

  const reloadPrices = () => {
    setPriceData((current) => ({ ...current, reloading: true }));
    fetchPrices().then((status) => setPriceData({ ...status, reloading: false }));
  };

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
    }
  }, [state, loaded]);

  const setQuantity = (productId: string, quantity: number) =>
    setState((current) => ({
      ...current,
      cart:
        quantity <= 0
          ? current.cart.filter((line) => line.productId !== productId)
          : current.cart.map((line) => (line.productId === productId ? { ...line, quantity } : line)),
      checked: quantity <= 0 ? current.checked.filter((id) => id !== productId) : current.checked,
    }));

  const value: AppState = {
    ...state,
    loaded,
    cartCount: state.cart.reduce((sum, line) => sum + line.quantity, 0),
    addToCart: (productId, quantity = 1) =>
      setState((current) => {
        const existing = current.cart.find((line) => line.productId === productId);
        const cart = existing
          ? current.cart.map((line) =>
              line.productId === productId ? { ...line, quantity: line.quantity + quantity } : line,
            )
          : [...current.cart, { productId, quantity }];
        return { ...current, cart };
      }),
    setQuantity,
    toggleChecked: (productId) =>
      setState((current) => ({
        ...current,
        checked: current.checked.includes(productId)
          ? current.checked.filter((id) => id !== productId)
          : [...current.checked, productId],
      })),
    clearChecked: () =>
      setState((current) => ({
        ...current,
        cart: current.cart.filter((line) => !current.checked.includes(line.productId)),
        checked: [],
      })),
    toggleFavorite: (productId) =>
      setState((current) => ({
        ...current,
        favorites: current.favorites.includes(productId)
          ? current.favorites.filter((id) => id !== productId)
          : [...current.favorites, productId],
      })),
    // Neuer Standort: gefundene Ketten ersetzen die bisherigen Maerkte und werden aktiv.
    setLocation: (location, nearby) =>
      setState((current) => ({
        ...current,
        location,
        stores: nearby.stores,
        branches: nearby.branches,
        storesFromOsm: true,
        activeStoreIds: nearby.stores.map((store) => store.id),
      })),
    getStore: (id) =>
      state.stores.find((store) => store.id === id) ?? {
        id,
        name: getChain(id).name,
        address: 'Nicht im Umkreis',
        latitude: state.location.latitude,
        longitude: state.location.longitude,
        distanceKm: Number.NaN,
        branchCount: 0,
      },
    toggleStore: (storeId) =>
      setState((current) => {
        const active = current.activeStoreIds.includes(storeId);
        // Mindestens ein Markt bleibt aktiv, sonst gibt es nichts zu vergleichen.
        if (active && current.activeStoreIds.length === 1) {
          return current;
        }
        return {
          ...current,
          activeStoreIds: active
            ? current.activeStoreIds.filter((id) => id !== storeId)
            : [...current.activeStoreIds, storeId],
        };
      }),
    updateNotifications: (changes) =>
      setState((current) => ({ ...current, notifications: { ...current.notifications, ...changes } })),
    updateConsent: (changes) => setState((current) => ({ ...current, consent: { ...current.consent, ...changes } })),
    saveAlarm: (alarm) =>
      setState((current) => ({
        ...current,
        alarms: [...current.alarms.filter((item) => item.productId !== alarm.productId), alarm],
      })),
    removeAlarm: (productId) =>
      setState((current) => ({ ...current, alarms: current.alarms.filter((item) => item.productId !== productId) })),
    resetAllData: () =>
      setState({ ...initialState, cart: [], favorites: [], alarms: [] }),
    completeOnboarding: () => setState((current) => ({ ...current, onboarded: true })),
    addRecentSearch: (term) => {
      const clean = term.trim();
      if (clean.length < 2) return;
      setState((current) => ({
        ...current,
        recentSearches: [clean, ...current.recentSearches.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(
          0,
          MAX_RECENT_SEARCHES,
        ),
      }));
    },
    removeRecentSearch: (term) =>
      setState((current) => ({ ...current, recentSearches: current.recentSearches.filter((item) => item !== term) })),
    priceData,
    reloadPrices,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState muss innerhalb von AppStateProvider genutzt werden.');
  }
  return context;
}
