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
