-- Open Food Facts catalog discovery (2026-11-28). Additive only.
-- off_products gets the fields the discovery agent fills besides the old per-GTIN refresh:
-- store/country tags (where the article is sold), popularity for ranking, a small image
-- for lists and a plausibility flag. Image attribution/licence columns already exist
-- (image_license, image_attribution); image_reviewed stays a manual decision.
alter table public.off_products
  add column if not exists image_thumb_url text,
  add column if not exists stores_tags text[] not null default '{}',
  add column if not exists countries_tags text[] not null default '{}',
  add column if not exists unique_scans integer,
  add column if not exists lang text,
  add column if not exists image_plausible boolean not null default false;

comment on column public.off_products.image_plausible is
  'Automatic hint: front image exists and the quantity label parses. Not a review (image_reviewed).';

create index if not exists idx_off_products_scans
  on public.off_products (unique_scans desc nulls last);
create index if not exists idx_update_runs_source_started
  on public.update_runs (source, started_at desc);
