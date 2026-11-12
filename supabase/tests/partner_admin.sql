-- Partner admin console checks (after all migrations through 20261111000200). Rolls itself back; results are in the error message.
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();  -- an admin
  ub uuid := gen_random_uuid();  -- another admin
  uc uuid := gen_random_uuid();  -- a partner owner, not an admin
  oc uuid; j jsonb; n int;
begin
  insert into auth.users (id, aud, role, email) select u, 'authenticated', 'authenticated', substr(u::text, 1, 8) || '@test.invalid' from unnest(array[ua, ub, uc]) u;
  insert into public.partner_admins (profile_id) values (ua), (ub);
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  set local role authenticated; j := public.create_partner_org('Org C', 'company', null, 'v1', true); reset role; oc := (j ->> 'org_id')::uuid;

  set local role anon;
  begin perform 1 from public.partner_admins; r := array_append(r, 'FAIL anon reads admins'); exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read the admin list'); end;
  begin perform public.partner_is_admin(); r := array_append(r, 'FAIL anon called partner_is_admin'); exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot call partner_is_admin'); end;
  begin perform 1 from public.partner_admin_log; r := array_append(r, 'FAIL anon reads the log'); exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read the admin log'); end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, case when public.partner_is_admin() then 'PASS an admin is recognized' else 'FAIL admin not recognized' end);
  select count(*) into n from public.partner_admins; r := array_append(r, case when n = 1 then 'PASS an admin sees only their own admin row' else 'FAIL admin rows visible: ' || n end);
  begin insert into public.partner_admins (profile_id) values (uc); r := array_append(r, 'FAIL an admin added an admin through the app role'); exception when insufficient_privilege then r := array_append(r, 'PASS admins are added only with the service role'); end;
  begin perform 1 from public.partner_admin_log; r := array_append(r, 'FAIL an admin read the log through the app role'); exception when insufficient_privilege then r := array_append(r, 'PASS the log is service role only'); end;
  begin insert into public.partner_admin_log (admin_id, action, target_table) values (ua, 'forged', 'x'); r := array_append(r, 'FAIL log written through the app role'); exception when insufficient_privilege then r := array_append(r, 'PASS the log cannot be written through the app role'); end;
  -- being an admin does not open the partner tables
  select count(*) into n from public.partner_organizations; r := array_append(r, case when n = 0 then 'PASS an admin gets no extra access to organizations through RLS' else 'FAIL admin sees organizations' end);
  select count(*) into n from public.partner_exclusivity; r := array_append(r, case when n = 0 then 'PASS an admin gets no extra access to exclusivity requests through RLS' else 'FAIL admin sees requests' end);
  begin update public.partner_organizations set verified = true where id = oc; get diagnostics n = row_count; r := array_append(r, case when n = 0 then 'PASS an admin cannot verify an organization through RLS' else 'FAIL admin verified an organization' end);
  exception when insufficient_privilege then r := array_append(r, 'PASS an admin cannot verify an organization through RLS'); end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, case when not public.partner_is_admin() then 'PASS a partner owner is not an admin' else 'FAIL partner is admin' end);
  select count(*) into n from public.partner_admins; r := array_append(r, case when n = 0 then 'PASS a non admin sees no admin rows' else 'FAIL non admin sees admins' end);
  reset role;

  -- the service role can log
  insert into public.partner_admin_log (admin_id, action, target_table, target_id, detail) values (ua, 'verify_organization', 'partner_organizations', oc, '{"verified": true}');
  select count(*) into n from public.partner_admin_log; r := array_append(r, case when n = 1 then 'PASS the service role writes the log' else 'FAIL log not written' end);
  begin insert into public.partner_admin_log (admin_id, action, target_table) values (ua, 'x', 'y'); r := array_append(r, 'FAIL action shorter than 3 characters accepted'); exception when check_violation then r := array_append(r, 'PASS log actions are validated'); end;

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
