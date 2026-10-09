import type { CartLine } from '@/lib/pricing';
import { supabase } from '@/lib/supabase';

// Zugriff auf Gruppen und gemeinsame Listen (Schema: backend/supabase/households.sql).

export type HouseholdKind = 'familie' | 'wg' | 'freunde';

export type Household = { id: string; name: string; kind: HouseholdKind; emoji: string };

export type Member = { householdId: string; userId: string; displayName: string; role: 'admin' | 'mitglied' };

export type SharedList = { id: string; householdId: string; name: string; emoji: string };

export type SharedItem = CartLine & { checked: boolean; addedBy: string | null; checkedBy: string | null; updatedAt: string };

export type InvitePreview = { householdId: string; name: string; kind: HouseholdKind; emoji: string; memberCount: number };

export const KIND_LABELS: Record<HouseholdKind, string> = { familie: 'Familie', wg: 'WG', freunde: 'Freunde' };

function client() {
  if (!supabase) throw new Error('Keine Verbindung zum Server konfiguriert.');
  return supabase;
}

// Server-Fehler in verstaendliche Meldungen uebersetzen.
export function familyErrorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error);
  if (message.includes('invalid or expired code')) return 'Der Code ist ungültig oder abgelaufen.';
  if (message.includes('household full')) return 'Diese Gruppe hat schon 6 Mitglieder.';
  if (message.includes('not authenticated')) return 'Bitte melde dich zuerst an.';
  if (message.includes('Network request failed') || message.includes('fetch')) return 'Keine Verbindung. Versuch es gleich noch einmal.';
  return 'Das hat nicht geklappt. Versuch es gleich noch einmal.';
}

export async function loadHouseholds(): Promise<{ households: Household[]; members: Member[] }> {
  const db = client();
  const [households, members] = await Promise.all([
    db.from('households').select('id, name, kind, emoji').order('created_at'),
    db.from('household_members').select('household_id, user_id, display_name, role').order('joined_at'),
  ]);
  if (households.error) throw households.error;
  if (members.error) throw members.error;
  return {
    households: households.data as Household[],
    members: members.data.map((row) => ({
      householdId: row.household_id,
      userId: row.user_id,
      displayName: row.display_name,
      role: row.role,
    })),
  };
}

export async function createHousehold(name: string, kind: HouseholdKind, emoji: string, displayName: string): Promise<string> {
  const { data, error } = await client().rpc('create_household', {
    p_name: name,
    p_kind: kind,
    p_emoji: emoji,
    p_display_name: displayName,
  });
  if (error) throw error;
  return data as string;
}

export async function createInvite(householdId: string): Promise<string> {
  const { data, error } = await client().rpc('create_household_invite', { p_household: householdId });
  if (error) throw error;
  return data as string;
}

export async function previewInvite(code: string): Promise<InvitePreview | undefined> {
  const { data, error } = await client().rpc('preview_household_invite', { p_code: code });
  if (error) throw error;
  const row = (data as { household_id: string; name: string; kind: HouseholdKind; emoji: string; member_count: number }[])[0];
  return row
    ? { householdId: row.household_id, name: row.name, kind: row.kind, emoji: row.emoji, memberCount: Number(row.member_count) }
    : undefined;
}

export async function joinHousehold(code: string, displayName: string): Promise<string> {
  const { data, error } = await client().rpc('join_household', { p_code: code, p_display_name: displayName });
  if (error) throw error;
  return data as string;
}

export async function leaveHousehold(householdId: string): Promise<void> {
  const { error } = await client().rpc('leave_household', { p_household: householdId });
  if (error) throw error;
}

export async function deleteMyAccount(): Promise<void> {
  const { error } = await client().rpc('delete_my_account');
  if (error) throw error;
}

export async function loadSharedLists(): Promise<SharedList[]> {
  const { data, error } = await client().from('shared_lists').select('id, household_id, name, emoji').order('created_at');
  if (error) throw error;
  return data.map((row) => ({ id: row.id, householdId: row.household_id, name: row.name, emoji: row.emoji }));
}

export async function createSharedList(householdId: string, name: string, emoji: string): Promise<string> {
  const { data, error } = await client()
    .from('shared_lists')
    .insert({ household_id: householdId, name, emoji })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function loadSharedItems(listId: string): Promise<SharedItem[]> {
  const { data, error } = await client()
    .from('shared_list_items')
    .select('product_id, quantity, checked, added_by, checked_by, updated_at')
    .eq('list_id', listId)
    .order('updated_at');
  if (error) throw error;
  return data.map((row) => ({
    productId: row.product_id,
    quantity: row.quantity,
    checked: row.checked,
    addedBy: row.added_by,
    checkedBy: row.checked_by,
    updatedAt: row.updated_at,
  }));
}

// Uebertraegt nur die Unterschiede zwischen dem letzten bekannten und dem neuen Stand.
export async function pushListChanges(
  listId: string,
  before: { lines: CartLine[]; checked: string[] },
  after: { lines: CartLine[]; checked: string[] },
): Promise<void> {
  const db = client();
  const changed = after.lines
    .filter((line) => {
      const old = before.lines.find((item) => item.productId === line.productId);
      return !old || old.quantity !== line.quantity || before.checked.includes(line.productId) !== after.checked.includes(line.productId);
    })
    .map((line) => ({
      list_id: listId,
      product_id: line.productId,
      quantity: line.quantity,
      checked: after.checked.includes(line.productId),
    }));
  const removed = before.lines
    .filter((line) => !after.lines.some((item) => item.productId === line.productId))
    .map((line) => line.productId);

  if (changed.length > 0) {
    const { error } = await db.from('shared_list_items').upsert(changed, { onConflict: 'list_id,product_id' });
    if (error) throw error;
  }
  if (removed.length > 0) {
    const { error } = await db.from('shared_list_items').delete().eq('list_id', listId).in('product_id', removed);
    if (error) throw error;
  }
}
