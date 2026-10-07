create or replace view public.current_price_observations
with (security_invoker = true)
as
select distinct on (
  product_id,
  lower(trim(product_name)),
  lower(trim(retailer_name)),
  requires_app,
  is_personalized
)
  id,
  product_id,
  retailer_id,
  store_id,
  product_name,
  retailer_name,
  price,
  currency,
  unit_price,
  unit,
  observed_at,
  valid_from,
  valid_until,
  offer_type,
  requires_app,
  app_name,
  coupon_activation_required,
  is_personalized,
  regular_price,
  discount_description,
  source,
  source_url,
  source_license,
  confidence,
  created_at
from public.price_observations
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

revoke all on table public.current_price_observations from anon, authenticated, service_role;
grant select on table public.current_price_observations to anon, authenticated, service_role;

comment on view public.current_price_observations is
  'Active latest observations per product variant, retailer and discount eligibility. Uses invoker RLS.';
