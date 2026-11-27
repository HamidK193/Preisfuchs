-- Public "Datenstand pro Quelle" for the app (screen 39): REST path /rest/v1/data_status.
--
-- update_runs stays closed to clients (report, notes, failed runs, cursors).
-- A security-invoker view alone would fail for anon, a definer view is flagged by
-- the Supabase advisor (security_definer_view). So a security-definer function
-- returns only harmless columns, and it lives in the non-exposed schema "private",
-- which PostgREST does not serve. The public view on top is security_invoker.
--
-- What clients see: fixed source list, time and count of the last *successful* run,
-- newest data time and current item count. Prices are counted through
-- current_price_observations, which applies the publication gate itself.
-- The old BW seed run (source 'Open Prices') is deliberately not listed.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.get_data_status()
returns table (
  source text,
  label text,
  last_success_at timestamptz,
  last_imported_count integer,
  newest_data_at timestamptz,
  item_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with src(source, label, sort) as (
    values
      ('Open Prices DE',  'Preise (Open Prices)',            1),
      ('OpenStreetMap',   'Märkte (OpenStreetMap)',          2),
      ('Open Food Facts', 'Produktinfos (Open Food Facts)',  3)
  ),
  last_ok as (
    select distinct on (r.source) r.source, r.finished_at, r.imported_count
    from public.update_runs r
    where r.status = 'succeeded' and r.finished_at is not null
    order by r.source, r.finished_at desc
  ),
  stats(source, newest_data_at, item_count) as (
    select 'Open Prices DE', max(c.observed_at), count(*)
    from public.current_price_observations c
    union all
    select 'OpenStreetMap', max(st.last_seen_at), count(*)
    from public.stores st
    where st.source = 'OpenStreetMap' and st.is_active
    union all
    select 'Open Food Facts', max(o.fetched_at), count(*)
    from public.off_products o
  )
  select s.source, s.label, l.finished_at, l.imported_count, x.newest_data_at, x.item_count
  from src s
  left join last_ok l on l.source = s.source
  left join stats x on x.source = s.source
  order by s.sort;
$$;

comment on function private.get_data_status() is
  'Definer on purpose: exposes only last successful run time/count and item counts per source, never update_runs.report/notes. Not reachable via REST (schema private).';

revoke all on function private.get_data_status() from public, anon, authenticated;
grant execute on function private.get_data_status() to anon, authenticated, service_role;

create or replace view public.data_status
with (security_invoker = true) as
select source, label, last_success_at, last_imported_count, newest_data_at, item_count
from private.get_data_status();

comment on view public.data_status is
  'Public data freshness per source (last successful import, newest data, item count). Safe columns only.';

revoke all on public.data_status from public, anon, authenticated;
grant select on public.data_status to anon, authenticated, service_role;
