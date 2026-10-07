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
  valid_from date,
  valid_until date,
  offer_type text not null default 'regular'
    check (offer_type in ('regular', 'sale', 'app_discount')),
  requires_app boolean not null default false,
  app_name text,
  coupon_activation_required boolean,
  is_personalized boolean not null default false,
  regular_price numeric(10, 2) check (regular_price is null or regular_price >= price),
  discount_description text,
  source text not null,
  source_url text,
  source_license text,
  is_public boolean not null default false,
  confidence numeric(3, 2) not null default 0.70 check (confidence >= 0 and confidence <= 1),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint app_discount_requires_app_name
    check (not requires_app or nullif(trim(app_name), '') is not null)
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

create index if not exists idx_price_observations_app_discounts
  on price_observations(product_id, valid_until)
  where requires_app;

create index if not exists idx_stores_state_city
  on stores(state, city);

alter table products enable row level security;
alter table retailers enable row level security;
alter table stores enable row level security;
alter table price_observations enable row level security;
alter table update_runs enable row level security;

drop policy if exists "products are readable" on products;
create policy "products are readable"
  on products for select
  to anon, authenticated
  using (true);

drop policy if exists "retailers are readable" on retailers;
create policy "retailers are readable"
  on retailers for select
  to anon, authenticated
  using (true);

drop policy if exists "stores are readable" on stores;
create policy "stores are readable"
  on stores for select
  to anon, authenticated
  using (true);

drop policy if exists "price observations are readable" on price_observations;
drop policy if exists "published price observations are readable" on price_observations;
create policy "published price observations are readable"
  on price_observations for select
  to anon, authenticated
  using (is_public);

revoke all on table products from anon, authenticated, service_role;
revoke all on table retailers from anon, authenticated, service_role;
revoke all on table stores from anon, authenticated, service_role;
revoke all on table price_observations from anon, authenticated, service_role;
revoke all on table update_runs from anon, authenticated, service_role;

grant select, insert, update, delete on table
  products,
  retailers,
  stores,
  price_observations,
  update_runs
to service_role;

grant select (id, name, category, package_size, search_terms, barcodes, created_at, updated_at)
  on table products to anon, authenticated;
grant select (id, name, normalized_name, created_at)
  on table retailers to anon, authenticated;
grant select (id, retailer_id, name, street, postcode, city, state, latitude, longitude, source, source_ref, created_at, updated_at)
  on table stores to anon, authenticated;
grant select (
  id, product_id, retailer_id, store_id, product_name, retailer_name,
  price, currency, unit_price, unit, observed_at, valid_from, valid_until,
  offer_type, requires_app, app_name, coupon_activation_required,
  is_personalized, regular_price, discount_description,
  source, source_url, source_license, is_public, confidence, created_at
)
  on table price_observations to anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

create or replace view current_price_observations
with (security_invoker = true)
as
select distinct on (
  product_id,
  lower(trim(product_name)),
  lower(trim(retailer_name)),
  requires_app,
  is_personalized
)
  id, product_id, retailer_id, store_id, product_name, retailer_name,
  price, currency, unit_price, unit, observed_at, valid_from, valid_until,
  offer_type, requires_app, app_name, coupon_activation_required,
  is_personalized, regular_price, discount_description,
  source, source_url, source_license, confidence, created_at
from price_observations
where is_public
  and (valid_from is null or valid_from <= current_date)
  and (valid_until is null or valid_until >= current_date)
order by
  product_id,
  lower(trim(product_name)),
  lower(trim(retailer_name)),
  requires_app,
  is_personalized,
  observed_at desc,
  price asc;

revoke all on table current_price_observations from anon, authenticated, service_role;
grant select on table current_price_observations to anon, authenticated, service_role;

insert into retailers (id, name, normalized_name) values
  ('aldi_sued', 'Aldi Süd', 'aldi sued'),
  ('lidl', 'Lidl', 'lidl'),
  ('rewe', 'Rewe', 'rewe'),
  ('edeka', 'Edeka', 'edeka'),
  ('kaufland', 'Kaufland', 'kaufland')
on conflict (id) do update
set name = excluded.name,
    normalized_name = excluded.normalized_name;

-- Additive catalog model. Existing observations retain their IDs and data.
create table public.catalog_articles (
  id uuid primary key,
  product_id text not null references public.products(id),
  product_type text not null,
  source text not null,
  source_product_ref text not null,
  gtin text,
  name text not null,
  brand_name text,
  brand_type text not null check (brand_type in ('manufacturer','private_label','unbranded','unknown')),
  attributes jsonb not null default '{}',
  package jsonb,
  comparison_key text,
  review_status text not null default 'needs_review' check (review_status in ('needs_review','verified')),
  review_reasons jsonb not null default '[]',
  missing_attributes jsonb not null default '[]',
  evidence_url text,
  correction jsonb,
  automatic_values jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (source, source_product_ref),
  constraint verified_article_has_evidence check (
    review_status <> 'verified' or
    (nullif(trim(evidence_url), '') is not null and package is not null and nullif(trim(name), '') is not null)
  )
);
create index idx_catalog_articles_product on public.catalog_articles(product_id);
create index idx_catalog_articles_comparison on public.catalog_articles(comparison_key) where comparison_key is not null;
alter table public.catalog_articles enable row level security;
create policy "verified articles are readable" on public.catalog_articles
  for select to anon, authenticated using (review_status = 'verified');
revoke all on public.catalog_articles from anon, authenticated, service_role;
grant select, insert, update, delete on public.catalog_articles to service_role;
grant select (id,product_id,product_type,gtin,name,brand_name,brand_type,attributes,
  package,comparison_key,review_status,evidence_url) on public.catalog_articles to anon, authenticated;

alter table public.price_observations
  add column brand_name text,
  add column brand_type text,
  add column article_id uuid references public.catalog_articles(id),
  add column source_ref text,
  add column price_basis text not null default 'unknown' check (price_basis in ('pack','kg','unknown')),
  add column country_code text,
  add column region text,
  add column location_label text,
  add column location_source_ref text,
  add column review_reasons jsonb not null default '[]';
create unique index idx_price_observations_source_ref
  on public.price_observations(source,source_ref) where source_ref is not null;
create index idx_price_observations_article on public.price_observations(article_id);
create index if not exists idx_price_observations_retailer_id on public.price_observations(retailer_id);
create index if not exists idx_price_observations_store_id on public.price_observations(store_id);
create index if not exists idx_stores_retailer_id on public.stores(retailer_id);
alter table public.update_runs add column report jsonb not null default '{}';
grant select (brand_name,brand_type,article_id,source_ref,price_basis,country_code,region,
  location_label,location_source_ref) on public.price_observations to anon, authenticated;

-- Keep source locations and discount conditions distinct, even within one chain.
-- Existing public columns remain in the same order for dependent clients.
create or replace view public.current_price_observations with (security_invoker = true) as
select distinct on (
  p.article_id, p.product_id, lower(trim(p.product_name)), lower(trim(p.retailer_name)),
  coalesce(p.location_source_ref,p.store_id::text,p.id::text),
  p.requires_app,p.is_personalized,p.app_name,p.coupon_activation_required,p.discount_description
)
  p.id,p.product_id,p.retailer_id,p.store_id,p.product_name,p.retailer_name,
  p.price,p.currency,p.unit_price,p.unit,p.observed_at,p.valid_from,p.valid_until,
  p.offer_type,p.requires_app,p.app_name,p.coupon_activation_required,
  p.is_personalized,p.regular_price,p.discount_description,
  p.source,p.source_url,p.source_license,p.confidence,p.created_at,
  p.brand_name,p.brand_type,p.article_id,p.source_ref,p.price_basis,p.country_code,p.region,
  p.location_label,p.location_source_ref,
  a.name as article_name,a.product_type,a.package,a.comparison_key,a.review_status as article_review_status
from public.price_observations p
join public.catalog_articles a on a.id = p.article_id
where p.is_public and a.review_status = 'verified'
  and p.country_code = 'DE' and p.region = 'Baden-Württemberg' and p.price_basis = 'pack'
  and p.observed_at <= now()
  and (p.valid_from is null or p.valid_from <= current_date)
  and (p.valid_until is null or p.valid_until >= current_date)
order by p.article_id,p.product_id,lower(trim(p.product_name)),lower(trim(p.retailer_name)),
  coalesce(p.location_source_ref,p.store_id::text,p.id::text),
  p.requires_app,p.is_personalized,p.app_name,p.coupon_activation_required,p.discount_description,
  p.observed_at desc,p.price asc,p.id;
comment on view public.current_price_observations is
  'Published verified articles with pack prices observed at identified BW locations; historical dates remain visible.';

drop policy "published price observations are readable" on public.price_observations;
create policy "published price observations are readable" on public.price_observations
  for select to anon, authenticated using (
    is_public and price_basis = 'pack' and country_code = 'DE' and region = 'Baden-Württemberg'
    and exists (
      select 1 from public.catalog_articles a
      where a.id = article_id and a.review_status = 'verified'
    )
  );

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

-- 2026-10-07: Migration open_public_prices_germany.
-- Preisfuchs ist deutschlandweit: oeffentliche Preise nicht mehr auf Baden-Wuerttemberg beschraenken.
-- Ersetzt die region-Bedingung in Policy und View weiter oben (gleiche Spalten, security_invoker bleibt).
alter policy "published price observations are readable" on public.price_observations
  using (
    is_public
    and price_basis = 'pack'
    and country_code = 'DE'
    and exists (
      select 1 from public.catalog_articles a
      where a.id = price_observations.article_id and a.review_status = 'verified'
    )
  );

create or replace view public.current_price_observations
with (security_invoker = true) as
select distinct on (
    p.article_id, p.product_id, lower(trim(both from p.product_name)), lower(trim(both from p.retailer_name)),
    coalesce(p.location_source_ref, p.store_id::text, p.id::text), p.requires_app, p.is_personalized,
    p.app_name, p.coupon_activation_required, p.discount_description)
  p.id, p.product_id, p.retailer_id, p.store_id, p.product_name, p.retailer_name, p.price, p.currency,
  p.unit_price, p.unit, p.observed_at, p.valid_from, p.valid_until, p.offer_type, p.requires_app, p.app_name,
  p.coupon_activation_required, p.is_personalized, p.regular_price, p.discount_description, p.source,
  p.source_url, p.source_license, p.confidence, p.created_at, p.brand_name, p.brand_type, p.article_id,
  p.source_ref, p.price_basis, p.country_code, p.region, p.location_label, p.location_source_ref,
  a.name as article_name, a.product_type, a.package, a.comparison_key, a.review_status as article_review_status
from public.price_observations p
join public.catalog_articles a on a.id = p.article_id
where p.is_public
  and a.review_status = 'verified'
  and p.country_code = 'DE'
  and p.price_basis = 'pack'
  and p.observed_at <= now()
  and (p.valid_from is null or p.valid_from <= current_date)
  and (p.valid_until is null or p.valid_until >= current_date)
order by p.article_id, p.product_id, lower(trim(both from p.product_name)), lower(trim(both from p.retailer_name)),
  coalesce(p.location_source_ref, p.store_id::text, p.id::text), p.requires_app, p.is_personalized, p.app_name,
  p.coupon_activation_required, p.discount_description, p.observed_at desc, p.price, p.id;

-- 2026-10-07: Community price reports without an account.
-- Written only by the Edge Function "report-price" (service role); never readable
-- or writable with the anon key. Reporter identity is stored as salted hashes only.
create table if not exists public.price_reports (
  id uuid primary key default gen_random_uuid(),
  gtin text not null check (gtin ~ '^[0-9]{8,14}$'),
  store_id uuid not null references public.stores(id),
  retailer_id text not null references public.retailers(id),
  product_name text check (char_length(product_name) <= 200),
  price numeric(10, 2) not null check (price > 0 and price < 1000),
  is_offer boolean not null default false,
  valid_until date,
  observed_on date not null default current_date,
  photo_path text,
  device_hash text not null,
  ip_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'needs_review', 'rejected')),
  status_reason text,
  observation_id uuid references public.price_observations(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_price_reports_match
  on public.price_reports(gtin, store_id, observed_on) where status in ('pending', 'confirmed');
create index if not exists idx_price_reports_device on public.price_reports(device_hash, created_at);
create index if not exists idx_price_reports_ip on public.price_reports(ip_hash, created_at);
alter table public.price_reports enable row level security;
revoke all on public.price_reports from anon, authenticated, service_role;
grant select, insert, update, delete on public.price_reports to service_role;

-- Private bucket for receipt/shelf photos; only the service role reads or writes it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('price-report-photos', 'price-report-photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
