-- Familie & Gruppen: Haushalte, Mitglieder, Einladungscodes und gemeinsame Einkaufslisten.
-- Nur angemeldete Nutzer (Supabase Auth, E-Mail-Code). Mitgliedschaft wird ausschliesslich
-- ueber die RPC-Funktionen angelegt bzw. beendet; Listen und Artikel sieht nur, wer Mitglied ist.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  kind text not null default 'familie' check (kind in ('familie', 'wg', 'freunde')),
  emoji text not null default '🏠' check (char_length(emoji) <= 8),
  -- Gruppen bleiben bestehen, wenn der Ersteller sein Konto loescht.
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  role text not null default 'mitglied' check (role in ('admin', 'mitglied')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index if not exists idx_household_members_user on public.household_members(user_id);

create table if not exists public.household_invites (
  code text primary key check (code ~ '^[A-Z0-9]{8}$'),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days'
);
create index if not exists idx_household_invites_household on public.household_invites(household_id);

create table if not exists public.shared_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  emoji text not null default '🛒' check (char_length(emoji) <= 8),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_shared_lists_household on public.shared_lists(household_id);

create table if not exists public.shared_list_items (
  list_id uuid not null references public.shared_lists(id) on delete cascade,
  product_id text not null check (char_length(product_id) between 1 and 80),
  quantity integer not null check (quantity between 1 and 99),
  checked boolean not null default false,
  added_by uuid default auth.uid() references auth.users(id) on delete set null,
  checked_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (list_id, product_id)
);

-- Hilfsfunktionen fuer RLS (security definer, damit die Policies nicht rekursiv werden).
create or replace function public.is_household_member(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members
    where household_id = target and user_id = (select auth.uid())
  );
$$;

create or replace function public.can_access_shared_list(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.shared_lists l
    join public.household_members m on m.household_id = l.household_id
    where l.id = target and m.user_id = (select auth.uid())
  );
$$;

-- Zeitstempel sowie "hinzugefuegt/abgehakt von" setzt der Server.
create or replace function public.touch_shared_list_item()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  -- Fremde Namen lassen sich nicht eintragen; null bleibt erlaubt (Konto geloescht).
  if tg_op = 'INSERT' then
    new.added_by := auth.uid();
  elsif new.added_by is not null then
    new.added_by := old.added_by;
  end if;
  if new.checked and (tg_op = 'INSERT' or not old.checked) then
    new.checked_by := auth.uid();
  elsif not new.checked then
    new.checked_by := null;
  elsif new.checked_by is not null then
    new.checked_by := old.checked_by;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_touch_shared_list_item on public.shared_list_items;
create trigger trg_touch_shared_list_item before insert or update on public.shared_list_items
  for each row execute function public.touch_shared_list_item();

-- Gruppe anlegen; der Ersteller wird Admin.
create or replace function public.create_household(p_name text, p_kind text, p_emoji text, p_display_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.households (name, kind, emoji, created_by)
  values (trim(p_name), p_kind, p_emoji, auth.uid()) returning id into new_id;
  insert into public.household_members (household_id, user_id, display_name, role)
  values (new_id, auth.uid(), trim(p_display_name), 'admin');
  return new_id;
end;
$$;

-- Einladungscode (8 Zeichen ohne 0/O/1/I, 7 Tage gueltig) fuer Mitglieder der Gruppe.
create or replace function public.create_household_invite(p_household uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text := '';
  bytes bytea := extensions.gen_random_bytes(8);
begin
  if not public.is_household_member(p_household) then raise exception 'not a member'; end if;
  delete from public.household_invites where expires_at < now();
  for i in 0..7 loop
    new_code := new_code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  insert into public.household_invites (code, household_id, created_by) values (new_code, p_household, auth.uid());
  return new_code;
end;
$$;

-- Vorschau einer Einladung vor dem Beitreten (nur Name, Typ und Groesse der Gruppe).
create or replace function public.preview_household_invite(p_code text)
returns table (household_id uuid, name text, kind text, emoji text, member_count bigint)
language sql stable security definer set search_path = '' as $$
  select h.id, h.name, h.kind, h.emoji,
    (select count(*) from public.household_members m where m.household_id = h.id)
  from public.household_invites i
  join public.households h on h.id = i.household_id
  where i.code = upper(trim(p_code)) and i.expires_at > now() and auth.uid() is not null;
$$;

-- Beitreten mit Code; hoechstens 6 Mitglieder je Gruppe.
create or replace function public.join_household(p_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select household_id into target from public.household_invites
  where code = upper(trim(p_code)) and expires_at > now();
  if target is null then raise exception 'invalid or expired code'; end if;
  if (select count(*) from public.household_members where household_id = target) >= 6 then
    raise exception 'household full';
  end if;
  insert into public.household_members (household_id, user_id, display_name)
  values (target, auth.uid(), trim(p_display_name))
  on conflict (household_id, user_id) do nothing;
  return target;
end;
$$;

-- Gruppe verlassen; ohne Admin wird das aelteste Mitglied Admin, leere Gruppen werden geloescht.
create or replace function public.leave_household(p_household uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.household_members where household_id = p_household and user_id = auth.uid();
  if not exists (select 1 from public.household_members where household_id = p_household) then
    delete from public.households where id = p_household;
  elsif not exists (select 1 from public.household_members where household_id = p_household and role = 'admin') then
    update public.household_members set role = 'admin'
    where household_id = p_household
      and user_id = (select user_id from public.household_members where household_id = p_household order by joined_at limit 1);
  end if;
end;
$$;

-- Konto loeschen (App-Store-Pflicht): erst alle Gruppen verlassen, dann den Auth-Nutzer entfernen.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  membership record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  for membership in select household_id from public.household_members where user_id = auth.uid() loop
    perform public.leave_household(membership.household_id);
  end loop;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.shared_lists enable row level security;
alter table public.shared_list_items enable row level security;

revoke all on public.households, public.household_members, public.household_invites,
  public.shared_lists, public.shared_list_items from anon;
revoke all on public.household_invites from authenticated;
revoke insert, delete on public.households, public.household_members from authenticated;

drop policy if exists households_select on public.households;
create policy households_select on public.households for select to authenticated
  using ((select public.is_household_member(id)));
drop policy if exists households_update on public.households;
create policy households_update on public.households for update to authenticated
  using (exists (
    select 1 from public.household_members m
    where m.household_id = households.id and m.user_id = (select auth.uid()) and m.role = 'admin'
  ));

drop policy if exists household_members_select on public.household_members;
create policy household_members_select on public.household_members for select to authenticated
  using ((select public.is_household_member(household_id)));
drop policy if exists household_members_update_self on public.household_members;
create policy household_members_update_self on public.household_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Rolle und Gruppe darf man an der eigenen Zeile nicht aendern, nur den Anzeigenamen.
revoke update on public.household_members from authenticated;
grant update (display_name) on public.household_members to authenticated;
revoke update on public.households from authenticated;
grant update (name, emoji) on public.households to authenticated;

-- Das Projekt vergibt keine Standardrechte; Zugriff regeln danach die Policies.
grant select on public.households, public.household_members to authenticated;
grant select, insert, update, delete on public.shared_lists, public.shared_list_items to authenticated;

drop policy if exists shared_lists_all on public.shared_lists;
create policy shared_lists_all on public.shared_lists for all to authenticated
  using ((select public.is_household_member(household_id)))
  with check ((select public.is_household_member(household_id)));

drop policy if exists shared_list_items_all on public.shared_list_items;
create policy shared_list_items_all on public.shared_list_items for all to authenticated
  using ((select public.can_access_shared_list(list_id)))
  with check ((select public.can_access_shared_list(list_id)));

revoke execute on function public.is_household_member(uuid), public.can_access_shared_list(uuid),
  public.create_household(text, text, text, text), public.create_household_invite(uuid),
  public.preview_household_invite(text), public.join_household(text, text), public.leave_household(uuid),
  public.touch_shared_list_item()
  from public, anon;
grant execute on function public.is_household_member(uuid), public.can_access_shared_list(uuid),
  public.create_household(text, text, text, text), public.create_household_invite(uuid),
  public.preview_household_invite(text), public.join_household(text, text), public.leave_household(uuid)
  to authenticated;

-- Live-Sync der gemeinsamen Listen.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'shared_list_items') then
    alter publication supabase_realtime add table public.shared_list_items;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'shared_lists') then
    alter publication supabase_realtime add table public.shared_lists;
  end if;
end $$;
