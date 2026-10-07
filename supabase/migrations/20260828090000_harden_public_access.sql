-- Public clients may read the catalog, but they must never write import data or
-- inspect raw provider payloads. Backend jobs use the service-role key server-side.

alter table public.products enable row level security;
alter table public.retailers enable row level security;
alter table public.stores enable row level security;
alter table public.price_observations enable row level security;
alter table public.update_runs enable row level security;

drop policy if exists "products are readable" on public.products;
create policy "products are readable"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "retailers are readable" on public.retailers;
create policy "retailers are readable"
  on public.retailers for select
  to anon, authenticated
  using (true);

drop policy if exists "stores are readable" on public.stores;
create policy "stores are readable"
  on public.stores for select
  to anon, authenticated
  using (true);

drop policy if exists "price observations are readable" on public.price_observations;
create policy "price observations are readable"
  on public.price_observations for select
  to anon, authenticated
  using (true);

revoke all on table public.products from anon, authenticated, service_role;
revoke all on table public.retailers from anon, authenticated, service_role;
revoke all on table public.stores from anon, authenticated, service_role;
revoke all on table public.price_observations from anon, authenticated, service_role;
revoke all on table public.update_runs from anon, authenticated, service_role;

-- The import job uses service_role server-side. Explicit grants keep it working
-- when Supabase projects disable automatic Data API exposure.
grant select, insert, update, delete on table
  public.products,
  public.retailers,
  public.stores,
  public.price_observations,
  public.update_runs
to service_role;

grant select (id, name, category, package_size, search_terms, barcodes, created_at, updated_at)
  on table public.products to anon, authenticated;
grant select (id, name, normalized_name, created_at)
  on table public.retailers to anon, authenticated;
grant select (id, retailer_id, name, street, postcode, city, state, latitude, longitude, source, source_ref, created_at, updated_at)
  on table public.stores to anon, authenticated;
grant select (
  id, product_id, retailer_id, store_id, product_name, retailer_name,
  price, currency, unit_price, unit, observed_at, valid_from, valid_until,
  offer_type, requires_app, app_name, coupon_activation_required,
  is_personalized, regular_price, discount_description,
  source, source_url, source_license, confidence, created_at
)
  on table public.price_observations to anon, authenticated;

-- New tables are private until a later migration grants the exact operations
-- and columns needed by a client.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

comment on table public.update_runs is
  'Internal import telemetry. No anonymous or authenticated client policy.';
