alter table public.price_observations
  add column if not exists is_public boolean not null default false;

-- Only sources whose reuse has been explicitly approved are published.
-- Existing HTML imports with unknown licensing remain internal.
update public.price_observations
set is_public = true
where source = 'Open Prices'
  and source_license in ('ODbL', 'ODbL-1.0');

create index if not exists idx_price_observations_public_current
  on public.price_observations(product_id, observed_at desc)
  where is_public;

comment on column public.price_observations.is_public is
  'Explicit publication approval after source/license review; defaults to private.';

drop policy if exists "price observations are readable" on public.price_observations;
create policy "published price observations are readable"
  on public.price_observations for select
  to anon, authenticated
  using (is_public);

grant select (is_public)
  on table public.price_observations to anon, authenticated;
