import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getChain, type Branch, type Store, type StoreId } from '@/data/stores';
import { addRealProducts, products, type Product } from '@/data/products';
import { buildInbox, type InboxItem } from '@/lib/inbox';
import { tripSummary, type CartLine, type CompletedTrip } from '@/lib/pricing';
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

// Eine Einkaufsliste; der Warenkorb zeigt immer die aktive Liste.
export type ShoppingList = {
  id: string;
  name: string;
  emoji: string;
  lines: CartLine[];
  checked: string[];
  createdAt: string;
};

type PersistedState = {
  lists: ShoppingList[];
  activeListId: string;
  favorites: string[];
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
  trips: CompletedTrip[];
  // Gelesene bzw. entfernte Eintraege der Benachrichtigungs-Inbox.
  inboxRead: string[];
  inboxDismissed: string[];
};

// Herkunft der angezeigten echten Preise:
// live = gerade geladen, cached = ohne Verbindung aus dem Zwischenspeicher, offline = nur Demo-Daten.
export type PriceDataStatus = { kind: 'live' | 'cached' | 'offline' | 'demo'; loadedAt?: string; reloading: boolean };

type AppState = PersistedState & {
  // Artikel und erledigte Artikel der aktiven Liste.
  cart: CartLine[];
  checked: string[];
  activeList: ShoppingList;
  createList: (name: string, emoji: string, lines?: CartLine[]) => string;
  updateList: (id: string, changes: Pick<ShoppingList, 'name' | 'emoji'>) => void;
  deleteList: (id: string) => void;
  setActiveList: (id: string) => void;
  // Speichert die erledigten Artikel als abgeschlossenen Einkauf und entfernt sie aus der Liste.
  finishShopping: (storeId: StoreId) => CompletedTrip | undefined;
  inbox: InboxItem[];
  unreadCount: number;
  markInboxRead: (ids: string[]) => void;
  dismissInboxItem: (id: string) => void;
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
const MAX_TRIPS = 50;
const MAX_INBOX_IDS = 200;
const FIRST_LIST_ID = 'wocheneinkauf';

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

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
  lists: [
    {
      id: FIRST_LIST_ID,
      name: 'Wocheneinkauf',
      emoji: '🛒',
      lines: [
        { productId: 'butter_250', quantity: 1 },
        { productId: 'milk_15', quantity: 2 },
        { productId: 'bananas_1kg', quantity: 1 },
        { productId: 'pasta_500', quantity: 2 },
      ],
      checked: [],
      createdAt: '2026-10-02T00:00:00.000Z',
    },
  ],
  activeListId: FIRST_LIST_ID,
  favorites: ['coffee_500', 'butter_250'],
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
  trips: [],
  inboxRead: [],
  inboxDismissed: [],
};

type SavedState = Partial<PersistedState> & { cart?: CartLine[]; checked?: string[] };

// Aeltere Versionen hatten nur einen Warenkorb: er wird zur ersten Liste.
function restoreLists(saved: SavedState): Pick<PersistedState, 'lists' | 'activeListId'> {
  if (saved.lists && saved.lists.length > 0) {
    const active = saved.lists.find((list) => list.id === saved.activeListId) ?? saved.lists[0];
    return { lists: saved.lists, activeListId: active.id };
  }
  const first = initialState.lists[0];
  return {
    lists: [{ ...first, lines: saved.cart ?? first.lines, checked: saved.checked ?? [] }],
    activeListId: first.id,
  };
}

// Uebernimmt gespeicherte Werte und fuellt fehlende Felder aus aelteren Versionen auf.
function restore(raw: string): PersistedState {
  const { cart, checked, ...saved } = JSON.parse(raw) as SavedState;
  const lists = restoreLists({ ...saved, cart, checked });
  if (!saved.storesFromOsm) {
    return { ...initialState, ...lists, favorites: saved.favorites ?? initialState.favorites };
  }
  return {
    ...initialState,
    ...saved,
    ...lists,
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

  // Aendert nur die aktive Liste.
  const updateActive = (change: (list: ShoppingList) => ShoppingList) =>
    setState((current) => ({
      ...current,
      lists: current.lists.map((list) => (list.id === current.activeListId ? change(list) : list)),
    }));

  const setQuantity = (productId: string, quantity: number) =>
    updateActive((list) => ({
      ...list,
      lines:
        quantity <= 0
          ? list.lines.filter((line) => line.productId !== productId)
          : list.lines.map((line) => (line.productId === productId ? { ...line, quantity } : line)),
      checked: quantity <= 0 ? list.checked.filter((id) => id !== productId) : list.checked,
    }));

  const activeList = state.lists.find((list) => list.id === state.activeListId) ?? state.lists[0];

  // Inbox aus ausgeloesten Preisalarmen und Wochenangeboten; nur gelesen/entfernt wird gespeichert.
  const { alarms, activeStoreIds, notifications, inboxRead, inboxDismissed } = state;
  const inbox = useMemo(
    () =>
      buildInbox({ products, alarms, activeStoreIds, notifications })
        .filter((item) => !inboxDismissed.includes(item.id))
        .map((item) => ({ ...item, read: inboxRead.includes(item.id) })),
    // products aendert sich nur, wenn Preise neu geladen wurden (priceData).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alarms, activeStoreIds, notifications, inboxRead, inboxDismissed, priceData],
  );

  const value: AppState = {
    ...state,
    loaded,
    cart: activeList.lines,
    checked: activeList.checked,
    activeList,
    cartCount: activeList.lines.reduce((sum, line) => sum + line.quantity, 0),
    addToCart: (productId, quantity = 1) =>
      updateActive((list) => {
        const existing = list.lines.find((line) => line.productId === productId);
        const lines = existing
          ? list.lines.map((line) =>
              line.productId === productId ? { ...line, quantity: line.quantity + quantity } : line,
            )
          : [...list.lines, { productId, quantity }];
        return { ...list, lines };
      }),
    setQuantity,
    toggleChecked: (productId) =>
      updateActive((list) => ({
        ...list,
        checked: list.checked.includes(productId)
          ? list.checked.filter((id) => id !== productId)
          : [...list.checked, productId],
      })),
    clearChecked: () =>
      updateActive((list) => ({
        ...list,
        lines: list.lines.filter((line) => !list.checked.includes(line.productId)),
        checked: [],
      })),
    createList: (name, emoji, lines = []) => {
      const list: ShoppingList = { id: newId(), name, emoji, lines, checked: [], createdAt: new Date().toISOString() };
      setState((current) => ({ ...current, lists: [...current.lists, list], activeListId: list.id }));
      return list.id;
    },
    updateList: (id, changes) =>
      setState((current) => ({
        ...current,
        lists: current.lists.map((list) => (list.id === id ? { ...list, ...changes } : list)),
      })),
    deleteList: (id) =>
      setState((current) => {
        // Mindestens eine Liste bleibt bestehen.
        if (current.lists.length <= 1) return current;
        const lists = current.lists.filter((list) => list.id !== id);
        return { ...current, lists, activeListId: current.activeListId === id ? lists[0].id : current.activeListId };
      }),
    setActiveList: (id) => setState((current) => ({ ...current, activeListId: id })),
    finishShopping: (storeId) => {
      const done = activeList.lines.filter((line) => activeList.checked.includes(line.productId));
      if (done.length === 0) return undefined;
      const trip: CompletedTrip = {
        id: newId(),
        listName: activeList.name,
        storeId,
        finishedAt: new Date().toISOString(),
        ...tripSummary(done, products, storeId, activeStoreIds),
      };
      setState((current) => ({
        ...current,
        trips: [trip, ...current.trips].slice(0, MAX_TRIPS),
        lists: current.lists.map((list) =>
          list.id === activeList.id
            ? { ...list, lines: list.lines.filter((line) => !list.checked.includes(line.productId)), checked: [] }
            : list,
        ),
      }));
      return trip;
    },
    inbox,
    unreadCount: inbox.filter((item) => !item.read).length,
    markInboxRead: (ids) =>
      setState((current) => ({
        ...current,
        inboxRead: [...new Set([...current.inboxRead, ...ids])].slice(-MAX_INBOX_IDS),
      })),
    dismissInboxItem: (id) =>
      setState((current) => ({ ...current, inboxDismissed: [...current.inboxDismissed, id].slice(-MAX_INBOX_IDS) })),
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
      setState({ ...initialState, lists: [{ ...initialState.lists[0], lines: [] }], favorites: [], alarms: [] }),
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
