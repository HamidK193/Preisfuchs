-- Checks for public.data_status (migration 20261127174600).
-- Fixture runs are rolled back. Built-in assertions only, so it runs without pgTAP.
begin;
do $test$
declare
  test_role text;
  n bigint;
  ts timestamptz;
  cnt integer;
  srcs text;
  failed boolean;
  fail_at timestamptz := now() + interval '1 day';
  ok_at   timestamptz := now() + interval '2 days';
begin
  -- Static: invoker view over a definer function in the non-exposed schema.
  assert (select 'security_invoker=true' = any(reloptions) from pg_class where oid = 'public.data_status'::regclass),
    'data_status is not security_invoker';
  assert (select prosecdef and proconfig @> array['search_path=""']
          from pg_proc where oid = 'private.get_data_status()'::regprocedure),
    'get_data_status must be security definer with empty search_path';
  assert not exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
                     where s.nspname = 'public' and p.proname = 'get_data_status'),
    'get_data_status must not be in the exposed schema public';
  assert (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
          where table_schema = 'public' and table_name = 'data_status')
         = array['source', 'label', 'last_success_at', 'last_imported_count', 'newest_data_at', 'item_count'],
    'data_status exposes unexpected columns';
  assert not has_table_privilege('anon', 'public.data_status', 'insert,update,delete,truncate'), 'anon may write data_status';
  assert not has_function_privilege('public', 'private.get_data_status()', 'execute'), 'PUBLIC may execute get_data_status';

  -- Fixtures: a newer failed run must be ignored, a newer successful run must win.
  insert into public.update_runs (source, status, started_at, finished_at, imported_count, notes, report)
  values ('OpenStreetMap', 'failed',    fail_at, fail_at, 99,   'secret note', '{"secret": true}'),
         ('OpenStreetMap', 'succeeded', ok_at,   ok_at,   4242, 'secret note', '{"secret": true}'),
         ('Open Prices',   'succeeded', ok_at,   ok_at,   7,    null, '{}');

  foreach test_role in array array['anon', 'authenticated'] loop
    perform set_config('request.jwt.claims', '', true);
    execute format('set local role %I', test_role);

    execute 'select count(*), string_agg(source, '','' order by source) from public.data_status' into n, srcs;
    assert n = 3, test_role || ': expected 3 sources, got ' || n;
    assert srcs = 'Open Food Facts,Open Prices DE,OpenStreetMap', test_role || ': unexpected sources ' || srcs;

    execute 'select last_success_at, last_imported_count from public.data_status where source = $1'
      into ts, cnt using 'OpenStreetMap';
    assert ts = ok_at and cnt = 4242, test_role || ': last successful run not reported';

    execute 'select item_count from public.data_status where source = $1' into n using 'Open Prices DE';
    assert n = (select count(*) from public.current_price_observations),
      test_role || ': price count differs from the public price view';

    begin
      execute 'select count(*) from public.update_runs' into n;
      failed := false;
    exception when insufficient_privilege then failed := true;
    end;
    assert failed, test_role || ' can read update_runs';
    execute 'reset role';
  end loop;
end;
$test$;
select 'data_status checks passed; transaction rolled back' as result;
rollback;
