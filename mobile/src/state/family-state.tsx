import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState } from 'react-native';

import {
  createHousehold,
  deleteMyAccount,
  createSharedList,
  joinHousehold,
  leaveHousehold,
  loadHouseholds,
  loadSharedItems,
  loadSharedLists,
  pushListChanges,
  type Household,
  type HouseholdKind,
  type Member,
  type SharedList,
} from '@/lib/family';
import type { CartLine } from '@/lib/pricing';
import { supabase } from '@/lib/supabase';
import { useAppState, type ShoppingList } from '@/state/app-state';

type Snapshot = { lines: CartLine[]; checked: string[] };
type ItemMeta = Record<string, { addedBy: string | null; checkedBy: string | null }>;
export type SyncStatus = { syncedAt?: string; error?: boolean };

type FamilyState = {
  available: boolean;
  session: Session | null;
  households: Household[];
  members: Member[];
  sharedLists: SharedList[];
  loading: boolean;
  // Zuletzt erfolgreich abgeglichen bzw. Fehler, je gemeinsamer Liste.
  syncStatus: Record<string, SyncStatus>;
  itemMeta: Record<string, ItemMeta>;
  memberName: (userId: string | null | undefined) => string | undefined;
  refresh: () => Promise<void>;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  createGroup: (name: string, kind: HouseholdKind, emoji: string, displayName: string) => Promise<string>;
  joinGroup: (code: string, displayName: string) => Promise<string>;
  leaveGroup: (householdId: string) => Promise<void>;
  shareListWithGroup: (list: ShoppingList, householdId: string) => Promise<void>;
  openSharedList: (shared: SharedList) => Promise<void>;
};

const FamilyContext = createContext<FamilyState | null>(null);

function sameContent(a: Snapshot, b: Snapshot): boolean {
  const key = (value: Snapshot) =>
    JSON.stringify([
      [...value.lines].sort((x, y) => x.productId.localeCompare(y.productId)),
      [...value.checked].sort(),
    ]);
  return key(a) === key(b);
}

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { lists, createList, updateList, replaceListContent, setActiveList } = useAppState();
  const [session, setSession] = useState<Session | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [sharedLists, setSharedLists] = useState<SharedList[]>([]);
  // Nutzer, fuer den die Gruppen zuletzt geladen wurden.
  const [loadedFor, setLoadedFor] = useState<string | undefined>();
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatus>>({});
  const [itemMeta, setItemMeta] = useState<Record<string, ItemMeta>>({});
  // Letzter mit dem Server abgeglichener Stand je gemeinsamer Liste.
  const snapshots = useRef(new Map<string, Snapshot>());
  const listsRef = useRef(lists);
  useEffect(() => {
    listsRef.current = lists;
  }, [lists]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const applyGroups = useCallback(
    ([groups, shared]: [Awaited<ReturnType<typeof loadHouseholds>>, SharedList[]], forUser: string) => {
      setHouseholds(groups.households);
      setMembers(groups.members);
      setSharedLists(shared);
      setLoadedFor(forUser);
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!supabase || !userId) return;
    applyGroups(await Promise.all([loadHouseholds(), loadSharedLists()]), userId);
  }, [userId, applyGroups]);

  useEffect(() => {
    if (!supabase || !userId) return;
    Promise.all([loadHouseholds(), loadSharedLists()])
      .then((result) => applyGroups(result, userId))
      .catch(() => setLoadedFor(userId));
  }, [userId, applyGroups]);

  // Stand einer gemeinsamen Liste laden und in die lokale Liste uebernehmen.
  const pull = useCallback(
    async (sharedListId: string) => {
      const local = listsRef.current.find((list) => list.shared?.listId === sharedListId);
      if (!local) return;
      try {
        const items = await loadSharedItems(sharedListId);
        const snapshot: Snapshot = {
          lines: items.map(({ productId, quantity }) => ({ productId, quantity })),
          checked: items.filter((item) => item.checked).map((item) => item.productId),
        };
        snapshots.current.set(sharedListId, snapshot);
        replaceListContent(local.id, snapshot.lines, snapshot.checked);
        setItemMeta((current) => ({
          ...current,
          [sharedListId]: Object.fromEntries(items.map((item) => [item.productId, { addedBy: item.addedBy, checkedBy: item.checkedBy }])),
        }));
        setSyncStatus((current) => ({ ...current, [sharedListId]: { syncedAt: new Date().toISOString() } }));
      } catch {
        setSyncStatus((current) => ({ ...current, [sharedListId]: { ...current[sharedListId], error: true } }));
      }
    },
    [replaceListContent],
  );

  const sharedIds = session
    ? lists
        .map((list) => list.shared?.listId)
        .filter((id): id is string => Boolean(id))
        .sort()
        .join(',')
    : '';

  // Live-Abgleich: bei jeder Aenderung auf dem Server die Liste neu laden.
  useEffect(() => {
    if (!supabase || !sharedIds) return;
    const db = supabase;
    const ids = sharedIds.split(',');
    const channels: RealtimeChannel[] = ids.map((id) =>
      db
        .channel(`shared-list-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_list_items', filter: `list_id=eq.${id}` }, () => pull(id))
        .subscribe(),
    );
    // Geloeschte Zeilen lassen sich nicht filtern; sie tragen aber die list_id.
    channels.push(
      db
        .channel('shared-list-deletes')
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'shared_list_items' }, (payload) => {
          const listId = (payload.old as { list_id?: string }).list_id;
          if (listId && ids.includes(listId)) pull(listId);
        })
        .subscribe(),
    );
    ids.forEach((id) => pull(id));
    // Nach dem Wechsel in den Vordergrund verpasste Aenderungen nachholen.
    const appState = RNAppState.addEventListener('change', (state) => {
      if (state === 'active') ids.forEach((id) => pull(id));
    });
    return () => {
      channels.forEach((channel) => db.removeChannel(channel));
      appState.remove();
    };
  }, [sharedIds, pull]);

  // Lokale Aenderungen an gemeinsamen Listen kurz gesammelt hochladen.
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => {
      for (const list of lists) {
        const sharedId = list.shared?.listId;
        const before = sharedId ? snapshots.current.get(sharedId) : undefined;
        if (!sharedId || !before) continue;
        const after: Snapshot = { lines: list.lines, checked: list.checked };
        if (sameContent(before, after)) continue;
        snapshots.current.set(sharedId, after);
        pushListChanges(sharedId, before, after)
          .then(() => setSyncStatus((current) => ({ ...current, [sharedId]: { syncedAt: new Date().toISOString() } })))
          .catch(() => {
            // Beim naechsten Versuch erneut die Unterschiede zum alten Stand senden.
            snapshots.current.set(sharedId, before);
            setSyncStatus((current) => ({ ...current, [sharedId]: { ...current[sharedId], error: true } }));
          });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [lists, session]);

  const value: FamilyState = {
    available: supabase !== null,
    session,
    // Nach dem Abmelden keine Gruppen des vorherigen Kontos zeigen.
    households: loadedFor && loadedFor === userId ? households : [],
    members: loadedFor && loadedFor === userId ? members : [],
    sharedLists: loadedFor && loadedFor === userId ? sharedLists : [],
    loading: Boolean(userId) && loadedFor !== userId,
    syncStatus,
    itemMeta,
    memberName: (id) => (loadedFor === userId ? members : []).find((member) => member.userId === id)?.displayName,
    refresh,
    sendCode: async (email) => {
      if (!supabase) throw new Error('not configured');
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (error) throw error;
    },
    verifyCode: async (email, code) => {
      if (!supabase) throw new Error('not configured');
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (error) throw error;
    },
    signOut: async () => {
      // Gemeinsame Listen bleiben als normale Listen auf dem Geraet.
      for (const list of listsRef.current) {
        if (list.shared) updateList(list.id, { shared: undefined });
      }
      snapshots.current.clear();
      await supabase?.auth.signOut();
    },
    deleteAccount: async () => {
      await deleteMyAccount();
      for (const list of listsRef.current) {
        if (list.shared) updateList(list.id, { shared: undefined });
      }
      snapshots.current.clear();
      await supabase?.auth.signOut({ scope: 'local' });
    },
    createGroup: async (name, kind, emoji, displayName) => {
      const id = await createHousehold(name, kind, emoji, displayName);
      await refresh();
      return id;
    },
    joinGroup: async (code, displayName) => {
      const id = await joinHousehold(code, displayName);
      await refresh();
      return id;
    },
    leaveGroup: async (householdId) => {
      await leaveHousehold(householdId);
      for (const list of listsRef.current) {
        if (list.shared?.householdId === householdId) updateList(list.id, { shared: undefined });
      }
      await refresh();
    },
    shareListWithGroup: async (list, householdId) => {
      const sharedId = await createSharedList(householdId, list.name, list.emoji);
      const empty: Snapshot = { lines: [], checked: [] };
      await pushListChanges(sharedId, empty, { lines: list.lines, checked: list.checked });
      snapshots.current.set(sharedId, { lines: list.lines, checked: list.checked });
      updateList(list.id, { shared: { listId: sharedId, householdId } });
      await refresh();
    },
    openSharedList: async (shared) => {
      const existing = listsRef.current.find((list) => list.shared?.listId === shared.id);
      if (existing) {
        setActiveList(existing.id);
        return;
      }
      // Leere lokale Liste anlegen; der Live-Abgleich laedt danach die Artikel.
      createList(shared.name, shared.emoji, [], { listId: shared.id, householdId: shared.householdId });
    },
  };

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily(): FamilyState {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily muss innerhalb von FamilyProvider genutzt werden.');
  }
  return context;
}
