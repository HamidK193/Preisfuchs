alter table public.price_observations
  add column if not exists valid_from date,
  add column if not exists offer_type text not null default 'regular',
  add column if not exists requires_app boolean not null default false,
  add column if not exists app_name text,
  add column if not exists coupon_activation_required boolean,
  add column if not exists is_personalized boolean not null default false,
  add column if not exists regular_price numeric(10, 2),
  add column if not exists discount_description text;

alter table public.price_observations
  add constraint price_observations_offer_type_check
    check (offer_type in ('regular', 'sale', 'app_discount')),
  add constraint price_observations_regular_price_check
    check (regular_price is null or regular_price >= price),
  add constraint app_discount_requires_app_name
    check (not requires_app or nullif(trim(app_name), '') is not null);

create index if not exists idx_price_observations_app_discounts
  on public.price_observations(product_id, valid_until)
  where requires_app;
