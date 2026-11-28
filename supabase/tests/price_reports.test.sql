-- Checks for user price reports (migration 20261128120000_price_reports_user_model).
-- Fixture users/reports are rolled back. Built-in assertions only (psql or MCP execute_sql).
begin;
do $test$
declare
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  st record;
  art record;
  r1 uuid;
  r2 uuid;
  r3 uuid;
  obs uuid;
  n bigint;
  failed boolean;
begin
  insert into auth.users (id, aud, role, email)
  values (u1, 'authenticated', 'authenticated', u1 || '@test.invalid'),
         (u2, 'authenticated', 'authenticated', u2 || '@test.invalid');
  select s.id, s.retailer_id into st from public.stores s where s.is_active limit 1;
  select a.gtin into art from public.catalog_articles a where a.review_status = 'verified' and a.gtin ~ '^[0-9]{8,14}$' limit 1;
  assert st.id is not null and art.gtin is not null, 'fixture store/article missing';

  -- Static
  assert (select relrowsecurity from pg_class where oid = 'public.price_reports'::regclass), 'RLS off';
  assert not has_table_privilege('anon', 'public.price_reports', 'insert,update,delete'), 'anon writes';
  assert not has_table_privilege('authenticated', 'public.price_reports', 'insert,update,delete'), 'authenticated writes';
  assert not has_column_privilege('authenticated', 'public.price_reports', 'user_id', 'select'), 'user_id readable';
  assert not has_column_privilege('anon', 'public.price_reports', 'photo_path', 'select'), 'photo_path readable';
  assert not has_function_privilege('authenticated', 'private.moderate_price_report(uuid,text,text,text)', 'execute'), 'moderation open';
  assert not has_function_privilege('anon', 'private.moderate_price_report(uuid,text,text,text)', 'execute'), 'moderation open (anon)';
  assert has_function_privilege('service_role', 'private.moderate_price_report(uuid,text,text,text)', 'execute'), 'service_role cannot moderate';
  assert not (select public from storage.buckets where id = 'price-report-photos'), 'bucket public';

  -- Writes as service_role (what the Edge Function does)
  set local role service_role;
  insert into public.price_reports (gtin, store_id, retailer_id, price, user_id)
    values (art.gtin, st.id, st.retailer_id, 1.99, u1) returning id into r1;
  insert into public.price_reports (gtin, store_id, retailer_id, price, user_id)
    values (art.gtin, st.id, st.retailer_id, 2.49, u2) returning id into r2;
  assert (select status from public.price_reports where id = r1) = 'unverified', 'default status';
  failed := false;
  begin
    insert into public.price_reports (gtin, store_id, retailer_id, price, user_id)
      values (art.gtin, st.id, st.retailer_id, 200, u1);
  exception when check_violation then failed := true; end;
  assert failed, 'price 200 accepted';
  failed := false;
  begin
    insert into public.price_reports (gtin, store_id, retailer_id, price) values (art.gtin, st.id, st.retailer_id, 1);
  exception when sqlstate 'P0401' then failed := true; end;
  assert failed, 'report without user accepted';
  -- minute limit: u1 has 1, add 4 more, the 6th fails
  for n in 1..4 loop
    insert into public.price_reports (gtin, store_id, retailer_id, price, user_id)
      values (art.gtin, st.id, st.retailer_id, 1 + n, u1);
  end loop;
  failed := false;
  begin
    insert into public.price_reports (gtin, store_id, retailer_id, price, user_id)
      values (art.gtin, st.id, st.retailer_id, 9, u1);
  exception when sqlstate 'P0429' then failed := true; end;
  assert failed, 'minute limit not enforced';
  reset role;

  -- anon: sees reports through the feed, flagged unverified, without private columns
  set local role anon;
  select count(*) into n from public.price_report_feed where id = r2 and not is_verified;
  assert n = 1, 'anon cannot see unverified report in feed';
  failed := false;
  begin perform user_id from public.price_reports; exception when insufficient_privilege then failed := true; end;
  assert failed, 'anon read user_id';
  reset role;

  -- authenticated u2 sees own + public, cannot write
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  failed := false;
  begin insert into public.price_reports (gtin, store_id, retailer_id, price, user_id)
    values (art.gtin, st.id, st.retailer_id, 1, u2);
  exception when insufficient_privilege then failed := true; end;
  assert failed, 'authenticated insert allowed';
  failed := false;
  begin perform public.price_reports.user_id from public.price_reports; exception when insufficient_privilege then failed := true; end;
  assert failed, 'authenticated read user_id';
  reset role;

  -- moderation: reject, then verify creates a public observation
  r3 := r1;
  perform private.moderate_price_report(r2, 'rejected', 'test', 'nope');
  assert (select status from public.price_reports where id = r2) = 'rejected', 'reject failed';
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.price_reports where id = r2;
  assert n = 1, 'owner cannot see own rejected report';
  select count(*) into n from public.price_report_feed where id = r2;
  assert n = 0, 'rejected shown in feed';
  reset role;
  obs := private.moderate_price_report(r3, 'verified', 'test');
  assert obs is not null, 'verify returned no observation';
  assert (select source from public.price_observations where id = obs) = 'Nutzermeldung', 'observation source';
  assert (select status = 'verified' and reviewed_at is not null and observation_id = obs from public.price_reports where id = r3), 'report not marked verified';
  failed := false;
  begin perform private.moderate_price_report(r3, 'rejected'); exception when others then failed := true; end;
  assert failed, 'double moderation allowed';
end
$test$;
rollback;
