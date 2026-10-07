-- Run against the migrated database; fixtures and all writes are rolled back.
-- Uses built-in assertions so it also works on projects without pgTAP.
begin;
do $test$
declare
  seed_id text;
  article uuid := gen_random_uuid();
  public_price uuid := gen_random_uuid();
  private_price uuid := gen_random_uuid();
  second_store uuid := gen_random_uuid();
  test_role text;
  found integer;
begin
  select id into strict seed_id from public.products order by id limit 1;
  insert into public.catalog_articles(id,product_id,product_type,source,source_product_ref,name,brand_type,
    package,review_status,evidence_url)
  values (article,seed_id,'test','role-test',article::text,'Transaction fixture','unbranded',
    '{"amount":"500","unit":"g","count":1,"total":"500","original":"500 g"}', 'verified','https://example.org/test');
  insert into public.price_observations(id,product_id,article_id,product_name,retailer_name,price,
    observed_at,source,is_public,price_basis,country_code,region,location_source_ref)
  values
    (public_price,seed_id,article,'Transaction fixture','Test retailer',1,now(),'role-test',true,'pack','DE','Baden-Württemberg','one'),
    (private_price,seed_id,article,'Transaction fixture','Test retailer',1,now(),'role-test',false,'pack','DE','Baden-Württemberg','one'),
    (second_store,seed_id,article,'Transaction fixture','Test retailer',2,now(),'role-test',true,'pack','DE','Baden-Württemberg','two');
  foreach test_role in array array['anon','authenticated'] loop
    execute format('set local role %I', test_role);
    execute 'select count(id) from public.products' into found;
    assert found > 0, 'Client cannot read catalog';
    execute 'select count(id) from public.price_observations where id = $1' into found using private_price;
    assert found = 0, 'Private observation leaked';
    execute 'select count(id) from public.current_price_observations where article_id = $1' into found using article;
    assert found = 2, 'Published stores were hidden or incorrectly collapsed';
    begin
      execute 'select raw_payload from public.price_observations limit 1';
      raise exception 'Raw payload leaked';
    exception when insufficient_privilege then null;
    end;
    begin
      execute 'select id from public.update_runs limit 1';
      raise exception 'Import telemetry leaked';
    exception when insufficient_privilege then null;
    end;
    begin
      execute 'select automatic_values from public.catalog_articles limit 1';
      raise exception 'Internal article draft leaked';
    exception when insufficient_privilege then null;
    end;
    begin
      execute 'update public.price_observations set price = 9 where id = $1' using public_price;
      raise exception 'Client changed a price';
    exception when insufficient_privilege then null;
    end;
    assert not has_table_privilege(current_user,'public.products','insert'), 'Client may insert products';
    assert not has_table_privilege(current_user,'public.catalog_articles','update'), 'Client may update articles';
    assert not has_table_privilege(current_user,'public.price_observations','truncate'), 'Client may truncate prices';
    execute 'reset role';
  end loop;
  execute 'set local role service_role';
  execute 'select count(id) from public.price_observations where id = $1' into found using private_price;
  assert found = 1, 'Backend cannot read private observation';
  execute 'update public.price_observations set price = 3 where id = $1' using private_price;
  assert has_table_privilege(current_user,'public.catalog_articles','insert'), 'Backend cannot insert articles';
  execute 'reset role';
  -- Publication cannot bypass the article review state, even through the raw table.
  update public.catalog_articles set review_status = 'needs_review' where id = article;
  execute 'set local role anon';
  execute 'select count(id) from public.price_observations where article_id = $1' into found using article;
  assert found = 0, 'Unverified article price leaked';
  execute 'reset role';
end;
$test$;
select 'catalog role checks passed; transaction rolled back' as result;
rollback;
