begin;

select plan(15);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.products'::regclass),
  'products has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.price_observations'::regclass),
  'price_observations has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.update_runs'::regclass),
  'update_runs has RLS enabled'
);

select ok(
  has_column_privilege('anon', 'public.products', 'name', 'select'),
  'anon can read public product columns'
);
select ok(
  has_column_privilege('anon', 'public.price_observations', 'price', 'select'),
  'anon can read public price columns'
);
select ok(
  not has_column_privilege('anon', 'public.price_observations', 'raw_payload', 'select'),
  'anon cannot read raw provider payloads'
);
select ok(
  has_column_privilege('anon', 'public.price_observations', 'is_public', 'select'),
  'anon can evaluate the publication gate used by the invoker view'
);
select ok(
  not has_table_privilege('anon', 'public.products', 'insert'),
  'anon cannot insert products'
);
select ok(
  not has_table_privilege('authenticated', 'public.price_observations', 'update'),
  'authenticated clients cannot update prices'
);
select ok(
  not has_table_privilege('anon', 'public.update_runs', 'select'),
  'anon cannot read internal update runs'
);
select ok(
  has_table_privilege('service_role', 'public.products', 'insert'),
  'service role can upsert the product catalog'
);
select ok(
  has_column_privilege('service_role', 'public.price_observations', 'raw_payload', 'select'),
  'service role can inspect provider payloads for import diagnostics'
);
select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'update_runs'
  ),
  'update_runs has no client policy'
);
select ok(
  has_table_privilege('anon', 'public.current_price_observations', 'select'),
  'anon can read the RLS-invoker current price view'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'price_observations'
      and policyname = 'published price observations are readable'
      and qual like '%is_public%'
      and qual like '%catalog_articles%'
  ),
  'price RLS publishes only explicitly approved observations'
);

select * from finish();
rollback;
