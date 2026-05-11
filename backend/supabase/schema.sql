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
