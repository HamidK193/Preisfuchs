-- Weekly source agents (2026-10-04): OSM branches across Germany and
-- Open Food Facts reference data. Additive; existing rows stay untouched.
alter table public.stores
  alter column state drop default,
  add column if not exists opening_hours text,
  add column if not exists source_license text,
  add column if not exists is_active boolean not null default true,
  add column if not exists last_seen_at timestamptz;
create unique index if not exists idx_stores_source_ref
  on public.stores(source, source_ref) where source_ref is not null;
create index if not exists idx_stores_active_location
  on public.stores(latitude, longitude) where is_active;
grant select (opening_hours, source_license, is_active, last_seen_at)
  on public.stores to anon, authenticated;

insert into public.retailers (id, name, normalized_name) values
  ('aldi_nord', 'Aldi Nord', 'aldi nord'),
  ('penny', 'Penny', 'penny'),
  ('netto_md', 'Netto Marken-Discount', 'netto marken-discount'),
  ('netto_dansk', 'Netto (Stavenhagen)', 'netto stavenhagen'),
  ('norma', 'Norma', 'norma'),
  ('globus', 'Globus', 'globus'),
  ('marktkauf', 'Marktkauf', 'marktkauf'),
  ('nahkauf', 'nahkauf', 'nahkauf'),
  ('tegut', 'tegut', 'tegut'),
  ('famila', 'famila', 'famila'),
  ('hit', 'HIT', 'hit')
on conflict (id) do nothing;

create table if not exists public.off_products (
  gtin text primary key,
  name text not null,
  brand text,
  quantity text,
  nutriscore_grade text check (nutriscore_grade in ('a','b','c','d','e')),
  nutriments jsonb not null default '{}',
  categories_tags text[] not null default '{}',
  labels_tags text[] not null default '{}',
  allergens_tags text[] not null default '{}',
  image_url text,
  image_license text,
  image_attribution text,
  -- Set manually after the photo was checked against the article package.
  image_reviewed boolean not null default false,
  source text not null default 'Open Food Facts',
  source_url text not null,
  data_license text not null default 'ODbL 1.0',
  off_last_modified timestamptz,
  fetched_at timestamptz not null default now()
);
alter table public.off_products enable row level security;
create policy "open food facts data is readable" on public.off_products
  for select to anon, authenticated using (true);
revoke all on public.off_products from anon, authenticated, service_role;
grant select, insert, update, delete on public.off_products to service_role;
grant select on public.off_products to anon, authenticated;

-- Weekly offers from permitted sources (retailer pages that allow access,
-- licensed feeds, user scans). source_label is shown verbatim in the app.
create table if not exists public.retailer_offers (
  id text primary key,
  retailer_id text not null references public.retailers(id),
  retailer_name text not null,
  title text not null,
  details text,
  price numeric(10, 2) not null check (price >= 0),
  unit_price numeric(10, 2),
  unit text,
  price_label text,
  category text,
  valid_from date,
  valid_until date,
  offer_week text,
  scope text not null default 'national' check (scope in ('national','regional','store')),
  store_id uuid references public.stores(id),
  product_id text references public.products(id),
  source text not null,
  source_label text not null,
  source_url text,
  source_ref text,
  is_public boolean not null default false,
  fetched_at timestamptz not null default now()
);
create index if not exists idx_retailer_offers_valid on public.retailer_offers(valid_until) where is_public;
create index if not exists idx_retailer_offers_retailer on public.retailer_offers(retailer_id);
alter table public.retailer_offers enable row level security;
create policy "published offers are readable" on public.retailer_offers
  for select to anon, authenticated using (is_public);
revoke all on public.retailer_offers from anon, authenticated, service_role;
grant select, insert, update, delete on public.retailer_offers to service_role;
grant select on public.retailer_offers to anon, authenticated;
