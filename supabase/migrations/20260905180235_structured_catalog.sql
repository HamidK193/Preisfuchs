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
