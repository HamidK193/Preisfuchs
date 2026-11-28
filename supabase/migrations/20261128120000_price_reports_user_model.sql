-- 2026-11-28: Price reports from signed-in users (email OTP), reviewed before they count.
-- Replaces the anonymous device/IP model of 20261007211854_price_reports.sql (table was empty).
--   status:  unverified -> verified | rejected   (verified creates a price_observations row)
--   writes:  only the Edge Function "report-price" (service_role) after checking the user JWT
--   reads:   anon/authenticated see unverified + verified rows through public.price_report_feed
--            (no user_id, photo path or hashes); users also see their own rejected reports
--   photos:  private bucket "price-report-photos", own folder "<auth.uid()>/" only
--   limits:  30 reports/day and 5/minute per user, enforced by trigger (also covers service_role)

-- 1. Table: user model, status model, price range ---------------------------------------
alter table public.price_reports
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists source text not null default 'Nutzermeldung',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text,
  add column if not exists has_photo boolean generated always as (photo_path is not null) stored;

alter table public.price_reports
  alter column device_hash drop not null,
  alter column ip_hash drop not null,
  alter column status set default 'unverified';

alter table public.price_reports drop constraint if exists price_reports_status_check;
alter table public.price_reports drop constraint if exists price_reports_price_check;
alter table public.price_reports
  add constraint price_reports_status_check check (status in ('unverified', 'verified', 'rejected')),
  add constraint price_reports_price_check check (price > 0 and price < 200),
  add constraint price_reports_review_check check ((status = 'unverified') = (reviewed_at is null)),
  add constraint price_reports_photo_path_check check (photo_path is null or photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$');

drop index if exists public.idx_price_reports_match;
drop index if exists public.idx_price_reports_device;
drop index if exists public.idx_price_reports_ip;
create index if not exists idx_price_reports_user_created on public.price_reports (user_id, created_at desc);
create index if not exists idx_price_reports_feed on public.price_reports (gtin, created_at desc) where status <> 'rejected';
create index if not exists idx_price_reports_store on public.price_reports (store_id);
create index if not exists idx_price_reports_review_queue on public.price_reports (created_at) where status = 'unverified';
create index if not exists idx_price_reports_observation on public.price_reports (observation_id) where observation_id is not null;

-- 2. RLS and grants ------------------------------------------------------------------------
alter table public.price_reports enable row level security;
revoke all on public.price_reports from anon, authenticated;
grant select, insert, update, delete on public.price_reports to service_role;
-- Column grants keep user_id, photo_path, status_reason, reviewer and hashes private.
grant select (id, gtin, store_id, retailer_id, product_name, price, is_offer, valid_until, observed_on,
              status, has_photo, source, created_at, reviewed_at)
  on public.price_reports to anon, authenticated;

drop policy if exists price_reports_public_read on public.price_reports;
create policy price_reports_public_read on public.price_reports for select to anon, authenticated
  using (status in ('unverified', 'verified'));
drop policy if exists price_reports_own_read on public.price_reports;
create policy price_reports_own_read on public.price_reports for select to authenticated
  using (user_id = (select auth.uid()));
-- No insert/update/delete policy: clients cannot write; report-price inserts as service_role.

create or replace view public.price_report_feed with (security_invoker = true) as
select id, gtin, store_id, retailer_id, product_name, price, is_offer, valid_until, observed_on,
       status, (status = 'verified') as is_verified, has_photo, source, created_at, reviewed_at
from public.price_reports
where status in ('unverified', 'verified');
comment on view public.price_report_feed is
  'User price reports. is_verified=false means unverified: show label "ungeprueft" and never mix into price rankings.';
revoke all on public.price_report_feed from anon, authenticated;
grant select on public.price_report_feed to anon, authenticated, service_role;

-- 3. Rate limit per user (trigger, so it also holds for service_role inserts) -----------------
create or replace function private.enforce_price_report_limit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.user_id is null then
    raise exception 'user_required' using errcode = 'P0401';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.price_reports
        where user_id = new.user_id and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'rate_limited_minute' using errcode = 'P0429';
  end if;
  if (select count(*) from public.price_reports
        where user_id = new.user_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'rate_limited_day' using errcode = 'P0429';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_price_report_limit() from public, anon, authenticated;
drop trigger if exists price_reports_rate_limit on public.price_reports;
create trigger price_reports_rate_limit before insert on public.price_reports
  for each row execute function private.enforce_price_report_limit();

-- 4. Moderation (service_role / SQL editor only; schema private is not exposed) -------------
create or replace function private.moderate_price_report(
  p_report uuid, p_decision text, p_reviewer text default 'manual', p_note text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.price_reports%rowtype;
  art record;
  st record;
  obs uuid;
begin
  if p_decision not in ('verified', 'rejected') then
    raise exception 'decision must be verified or rejected';
  end if;
  select * into r from public.price_reports where id = p_report for update;
  if not found then raise exception 'report not found'; end if;
  if r.status <> 'unverified' then raise exception 'report already reviewed (%)', r.status; end if;

  if p_decision = 'rejected' then
    update public.price_reports
       set status = 'rejected', status_reason = p_note, reviewed_at = now(), reviewed_by = p_reviewer
     where id = r.id;
    return null;
  end if;

  select a.id, a.product_id, a.name, a.brand_name into art
    from public.catalog_articles a where a.gtin = r.gtin and a.review_status = 'verified' limit 1;
  if art.id is null then raise exception 'no verified catalog article for gtin %', r.gtin; end if;
  select s.state, s.city, coalesce(rt.name, r.retailer_id) as retailer_name into st
    from public.stores s left join public.retailers rt on rt.id = s.retailer_id where s.id = r.store_id;

  insert into public.price_observations (
    product_id, article_id, retailer_id, store_id, product_name, brand_name, retailer_name,
    price, currency, observed_at, valid_until, offer_type, source, source_license, source_ref,
    price_basis, country_code, region, location_label, confidence, is_public, review_reasons)
  values (
    art.product_id, art.id, r.retailer_id, r.store_id, art.name, art.brand_name, st.retailer_name,
    r.price, 'EUR', least(now(), (r.observed_on::timestamp + interval '12 hours') at time zone 'UTC'),
    case when r.is_offer then r.valid_until end, case when r.is_offer then 'sale' else 'regular' end,
    'Nutzermeldung', 'Preisfuchs (eigene Nutzermeldungen)', r.id::text,
    'pack', 'DE', st.state, concat_ws(', ', st.retailer_name, st.city), 0.7, true, '[]'::jsonb)
  returning id into obs;

  update public.price_reports
     set status = 'verified', status_reason = p_note, observation_id = obs,
         reviewed_at = now(), reviewed_by = p_reviewer
   where id = r.id;
  return obs;
end;
$$;
revoke all on function private.moderate_price_report(uuid, text, text, text) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.moderate_price_report(uuid, text, text, text) to service_role;

-- 5. Photos: private bucket, own folder only -------------------------------------------------
update storage.buckets
   set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'price-report-photos';

drop policy if exists price_report_photos_insert_own on storage.objects;
create policy price_report_photos_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'price-report-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$');
drop policy if exists price_report_photos_select_own on storage.objects;
create policy price_report_photos_select_own on storage.objects for select to authenticated
  using (bucket_id = 'price-report-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
