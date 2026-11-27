-- RLS and grant checks for households and shared lists
-- (migrations 20261010100034, 20261010100204, 20261127174500).
-- Fixture users and all writes are rolled back. Built-in assertions only, so it
-- runs without pgTAP, e.g. via psql or MCP execute_sql.
begin;
do $test$
declare
  u_admin  uuid := gen_random_uuid();
  u_member uuid := gen_random_uuid();
  u_out    uuid := gen_random_uuid();
  extra    uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  tables   text[] := array['public.households', 'public.household_members', 'public.household_invites',
                           'public.shared_lists', 'public.shared_list_items'];
  rpcs     text[] := array['public.create_household(text,text,text,text)', 'public.create_household_invite(uuid)',
                           'public.preview_household_invite(text)', 'public.join_household(text,text)',
                           'public.leave_household(uuid)', 'public.delete_my_account()'];
  t text;
  u uuid;
  hid uuid;
  lid uuid;
  invite text;
  n bigint;
  txt text;
  failed boolean;
begin
  insert into auth.users (id, aud, role, email)
  select x, 'authenticated', 'authenticated', x::text || '@rls-test.invalid'
  from unnest(array[u_admin, u_member, u_out] || extra) as x;

  -- 1. Static: RLS on, anon has nothing, invites are RPC-only, column grants only.
  foreach t in array tables loop
    assert (select relrowsecurity from pg_class where oid = t::regclass), t || ' has RLS disabled';
    assert not has_table_privilege('anon', t, 'select,insert,update,delete,truncate'), 'anon has a grant on ' || t;
    assert has_table_privilege('service_role', t, 'select') and has_table_privilege('service_role', t, 'delete'),
      'service_role cannot read/write ' || t;
  end loop;
  assert not has_table_privilege('authenticated', 'public.household_invites', 'select,insert,update,delete'),
    'household_invites is reachable without RPC';
  assert not has_table_privilege('authenticated', 'public.households', 'insert,delete'), 'clients may insert/delete households';
  assert not has_table_privilege('authenticated', 'public.household_members', 'insert,delete'), 'clients may insert/delete members';
  assert not has_column_privilege('authenticated', 'public.household_members', 'role', 'update'), 'clients may change roles';
  assert not has_column_privilege('authenticated', 'public.households', 'kind', 'update'), 'clients may change household kind';
  foreach t in array rpcs loop
    assert not has_function_privilege('anon', t, 'execute'), 'anon may execute ' || t;
    assert has_function_privilege('authenticated', t, 'execute'), 'authenticated may not execute ' || t;
  end loop;

  -- 2. anon is blocked completely.
  execute 'set local role anon';
  begin
    execute 'select count(*) from public.households' into n;
    failed := false;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'anon read households';
  begin
    perform public.create_household('x', 'familie', 'x', 'x');
    failed := false;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'anon executed create_household';
  execute 'reset role';

  -- 3. Signed-in role without a user id cannot create a household.
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role authenticated';
  begin
    perform public.create_household('x', 'familie', 'x', 'x');
    failed := false;
  exception when raise_exception then
    assert sqlerrm = 'not authenticated', 'unexpected error: ' || sqlerrm;
    failed := true;
  end;
  assert failed, 'create_household without user id';
  execute 'reset role';

  -- 4. Admin creates a household and an invite.
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  hid := public.create_household('RLS-Test', 'familie', '🏠', 'Anna');
  execute 'select count(*) from public.households where id = $1' into n using hid;
  assert n = 1, 'creator cannot see own household';
  execute 'select role from public.household_members where household_id = $1 and user_id = $2' into txt using hid, u_admin;
  assert txt = 'admin', 'creator is not admin';
  invite := public.create_household_invite(hid);
  assert invite ~ '^[A-HJ-NP-Z2-9]{8}$', 'invite code format: ' || invite;
  begin
    execute 'select count(*) from public.household_invites' into n;
    failed := false;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'member read household_invites directly';
  execute 'reset role';

  -- 5. Outsider sees and changes nothing.
  perform set_config('request.jwt.claims', json_build_object('sub', u_out, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute 'select count(*) from public.households where id = $1' into n using hid;
  assert n = 0, 'outsider sees household';
  execute 'select count(*) from public.household_members where household_id = $1' into n using hid;
  assert n = 0, 'outsider sees members';
  execute 'update public.households set name = $2 where id = $1' using hid, 'Hacked';
  get diagnostics n = row_count;
  assert n = 0, 'outsider renamed household';
  begin
    perform public.create_household_invite(hid);
    failed := false;
  exception when raise_exception then
    assert sqlerrm = 'not a member', 'unexpected error: ' || sqlerrm;
    failed := true;
  end;
  assert failed, 'outsider created invite';
  begin
    execute 'insert into public.shared_lists (household_id, name) values ($1, $2)' using hid, 'Fremd';
    failed := false;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'outsider created shared list';
  execute 'reset role';

  -- 6. Member joins with the code (case and spaces ignored), cannot escalate.
  perform set_config('request.jwt.claims', json_build_object('sub', u_member, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute 'select member_count from public.preview_household_invite($1)' into n using lower(invite);
  assert n = 1, 'preview member count';
  begin
    perform public.join_household('ZZZZZZZZ', 'Ben');
    failed := false;
  exception when raise_exception then
    assert sqlerrm = 'invalid or expired code', 'unexpected error: ' || sqlerrm;
    failed := true;
  end;
  assert failed, 'joined with invalid code';
  assert public.join_household(' ' || lower(invite) || ' ', 'Ben') = hid, 'join returned wrong household';
  execute 'select count(*) from public.household_members where household_id = $1' into n using hid;
  assert n = 2, 'member does not see both members';
  execute 'update public.households set name = $2 where id = $1' using hid, 'Ben-Gruppe';
  get diagnostics n = row_count;
  assert n = 0, 'non-admin renamed household';
  execute 'update public.household_members set display_name = $2 where user_id = $1' using u_admin, 'Hacked';
  get diagnostics n = row_count;
  assert n = 0, 'member renamed another member';
  execute 'update public.household_members set display_name = $2 where user_id = $1' using u_member, 'Benni';
  get diagnostics n = row_count;
  assert n = 1, 'member cannot rename self';
  begin
    execute 'update public.household_members set role = $2 where user_id = $1' using u_member, 'admin';
    failed := false;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'member promoted self';
  begin
    execute 'delete from public.household_members where household_id = $1' using hid;
    failed := false;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'member deleted memberships directly';
  execute 'reset role';

  -- 7. Admin renames; shared list and item, trigger stamps added_by.
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute 'update public.households set name = $2 where id = $1' using hid, 'Familie Test';
  get diagnostics n = row_count;
  assert n = 1, 'admin cannot rename';
  execute 'insert into public.shared_lists (household_id, name) values ($1, $2) returning id' into lid using hid, 'Wocheneinkauf';
  execute 'insert into public.shared_list_items (list_id, product_id, quantity, added_by) values ($1, $2, 2, $3)'
    using lid, 'milch', u_out;
  execute 'select added_by from public.shared_list_items where list_id = $1' into u using lid;
  assert u = u_admin, 'added_by was spoofed';
  execute 'reset role';

  -- 8. Member checks the item; checked_by is stamped, not spoofable.
  perform set_config('request.jwt.claims', json_build_object('sub', u_member, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute 'update public.shared_list_items set checked = true, checked_by = $2 where list_id = $1' using lid, u_out;
  get diagnostics n = row_count;
  assert n = 1, 'member cannot check item';
  execute 'select checked_by from public.shared_list_items where list_id = $1' into u using lid;
  assert u = u_member, 'checked_by was spoofed';
  execute 'reset role';

  -- 9. Outsider cannot see or touch lists.
  perform set_config('request.jwt.claims', json_build_object('sub', u_out, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute 'select count(*) from public.shared_list_items where list_id = $1' into n using lid;
  assert n = 0, 'outsider sees list items';
  execute 'update public.shared_list_items set quantity = 9 where list_id = $1' using lid;
  get diagnostics n = row_count;
  assert n = 0, 'outsider changed list item';
  begin
    execute 'insert into public.shared_list_items (list_id, product_id, quantity) values ($1, $2, 1)' using lid, 'brot';
    failed := false;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'outsider added list item';
  execute 'reset role';

  -- 10. Six members max.
  foreach u in array extra loop
    perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.join_household(invite, 'Extra');
    execute 'reset role';
  end loop;
  perform set_config('request.jwt.claims', json_build_object('sub', u_out, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.join_household(invite, 'Zu viel');
    failed := false;
  exception when raise_exception then
    assert sqlerrm = 'household full', 'unexpected error: ' || sqlerrm;
    failed := true;
  end;
  assert failed, 'seventh member joined';
  execute 'reset role';

  -- 11. Leaving: admin role is handed over, last one out deletes the group.
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.leave_household(hid);
  execute 'select count(*) from public.households where id = $1' into n using hid;
  assert n = 0, 'former admin still sees household';
  execute 'reset role';
  select count(*) into n from public.household_members where household_id = hid and role = 'admin';
  assert n = 1, 'admin role not handed over';
  foreach u in array array[u_member] || extra loop
    perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.leave_household(hid);
    execute 'reset role';
  end loop;
  select count(*) into n from public.households where id = hid;
  assert n = 0, 'empty household was not deleted';
  select count(*) into n from public.shared_lists where id = lid;
  assert n = 0, 'shared list of deleted household survived';
end;
$test$;
select 'household RLS checks passed; transaction rolled back' as result;
rollback;
