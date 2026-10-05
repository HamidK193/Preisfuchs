create extension if not exists pgcrypto;

create table if not exists products (
  id text primary key,
  name text not null,
  category text not null,
  package_size text not null,
  search_terms text[] not null default '{}',
  barcodes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists retailers (
  id text primary key,
  name text not null,
  normalized_name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  retailer_id text not null references retailers(id),
  name text not null,
  street text,
  postcode text,
  city text,
  state text not null default 'Baden-Württemberg',
  latitude double precision,
  longitude double precision,
  source text not null default 'manual',
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_observations (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id),
  retailer_id text references retailers(id),
  store_id uuid references stores(id),
  product_name text not null,
  retailer_name text not null,
  price numeric(10, 2) not null check (price >= 0),
  currency text not null default 'EUR',
  unit_price numeric(10, 2),
  unit text,
  observed_at timestamptz not null,
  valid_until date,
  source text not null,
  source_url text,
  source_license text,
  confidence numeric(3, 2) not null default 0.70 check (confidence >= 0 and confidence <= 1),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists update_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  source text not null,
  status text not null default 'running',
  imported_count integer not null default 0,
  notes text
);

create index if not exists idx_price_observations_product_observed
  on price_observations(product_id, observed_at desc);

create index if not exists idx_price_observations_retailer
  on price_observations(retailer_name);

create index if not exists idx_stores_state_city
  on stores(state, city);

alter table products enable row level security;
alter table retailers enable row level security;
alter table stores enable row level security;
alter table price_observations enable row level security;

drop policy if exists "products are readable" on products;
create policy "products are readable"
  on products for select
  using (true);

drop policy if exists "retailers are readable" on retailers;
create policy "retailers are readable"
  on retailers for select
  using (true);

drop policy if exists "stores are readable" on stores;
create policy "stores are readable"
  on stores for select
  using (true);

drop policy if exists "price observations are readable" on price_observations;
create policy "price observations are readable"
  on price_observations for select
  using (true);

insert into retailers (id, name, normalized_name) values
  ('aldi_sued', 'Aldi Süd', 'aldi sued'),
  ('lidl', 'Lidl', 'lidl'),
  ('rewe', 'Rewe', 'rewe'),
  ('edeka', 'Edeka', 'edeka'),
  ('kaufland', 'Kaufland', 'kaufland')
on conflict (id) do update
set name = excluded.name,
    normalized_name = excluded.normalized_name;

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
