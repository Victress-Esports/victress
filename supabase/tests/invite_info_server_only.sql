-- Run after all migrations including 20261107000600_invite_info_server_only.sql. Reports through a raised error so nothing is kept.
do $t$
declare
  r text[] := '{}';
  uid uuid := '00000000-0000-4000-8000-0000000000c1';
  code text;
  j jsonb;
begin
  insert into auth.users (id, aud, role, email) values (uid, 'authenticated', 'authenticated', 'owner@test.invalid');
  insert into public.teams (name, slug, owner_id) values ('Lookup Team', 'lookup-team-cccccc', uid) returning invite_code into code;

  set local role anon;
  begin perform public.team_invite_info(code); r := array_append(r, 'FAIL anon can still call team_invite_info');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot call team_invite_info'); end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.team_invite_info(code); r := array_append(r, 'FAIL a signed in user can still call team_invite_info');
  exception when insufficient_privilege then r := array_append(r, 'PASS a signed in user cannot call team_invite_info'); end;
  reset role;

  set local role service_role;
  select public.team_invite_info(code) into j;
  r := array_append(r, case when j ->> 'name' = 'Lookup Team' and (j ->> 'member_count')::int = 0 then 'PASS service_role still resolves a valid code' else 'FAIL service_role lookup returned ' || coalesce(j::text, 'null') end);
  select public.team_invite_info('zzzzzzzzzzzzzzzzzzzzzzzzzz') into j;
  r := array_append(r, case when j is null then 'PASS service_role gets null for an unknown code' else 'FAIL unknown code returned ' || j::text end);
  reset role;

  -- join_team is unchanged: a signed in user can still join with the code (a second user, so the owner is not already a member)
  insert into auth.users (id, aud, role, email) values ('00000000-0000-4000-8000-0000000000c2', 'authenticated', 'authenticated', 'joiner@test.invalid');
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-8000-0000000000c2', 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, case when public.join_team(code) = 'ok' then 'PASS join_team still works for a signed in user' else 'FAIL join_team changed' end);
  reset role;

  raise exception E'INVITE LOOKUP REPORT (aborts the transaction, nothing kept)\n%', array_to_string(r, E'\n');
end $t$;
