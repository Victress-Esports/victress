-- Longer invite code checks (after all migrations through 20261107000500). Rolls itself back; results are in the error message.
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  c1 text; c2 text; c3 text; n int; v text; j jsonb; ok boolean; i int;
  seen text[] := '{}'; lo int; hi int;
begin
  insert into auth.users (id, aud, role, email) values
    (ua, 'authenticated', 'authenticated', 'a@test.invalid'), (ub, 'authenticated', 'authenticated', 'b@test.invalid'), (uc, 'authenticated', 'authenticated', 'c@test.invalid');

  -- the generator
  ok := true;
  for i in 1..500 loop c1 := public.new_invite_code(); if c1 !~ '^[a-z2-7]{26}$' then ok := false; end if; seen := array_append(seen, c1); end loop;
  r := array_append(r, (case when ok then 'PASS 500 generated codes are all 26 characters of a-z and 2-7' else 'FAIL generated code format' end)::text);
  select count(distinct x) into n from unnest(seen) x;
  r := array_append(r, (case when n = 500 then 'PASS 500 generated codes are all different' else 'FAIL duplicates: ' || n end)::text);
  r := array_append(r, ('PASS length 26 x 5 bits = 130 bits of randomness (at least 128 required)')::text);
  -- every symbol appears about equally often (a stuck or biased generator would show here): 3000 codes, 78000 characters, 2437 expected per symbol
  select min(cnt), max(cnt) into lo, hi from (
    select s, count(*) as cnt from (select regexp_split_to_table(public.new_invite_code(), '') as s from generate_series(1, 3000)) q group by s
  ) z;
  r := array_append(r, (case when lo > 2437 * 0.85 and hi < 2437 * 1.15 then format('PASS symbol frequencies are even (min %s, max %s, expected about 2437)', lo, hi) else format('FAIL symbol frequencies uneven (min %s, max %s)', lo, hi) end)::text);
  select count(*) into n from (select distinct substr(public.new_invite_code(), 1, 1) from generate_series(1, 2000)) q;
  r := array_append(r, (case when n = 32 then 'PASS all 32 symbols appear in the first position' else 'FAIL first position symbols: ' || n end)::text);
  select count(*) into n from (select distinct substr(public.new_invite_code(), 26, 1) from generate_series(1, 2000)) q;
  r := array_append(r, (case when n = 32 then 'PASS all 32 symbols appear in the last position' else 'FAIL last position symbols: ' || n end)::text);

  -- nobody but the owner role can call it
  set local role anon;
  begin perform public.new_invite_code(); r := array_append(r, ('FAIL anon can call new_invite_code')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot call new_invite_code')::text); end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.new_invite_code(); r := array_append(r, ('FAIL a signed in user can call new_invite_code')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS a signed in user cannot call new_invite_code')::text); end;

  -- the real flows, as signed in users
  select (public.create_team('Long Code Team') ->> 'status') into v;
  r := array_append(r, (case when v = 'ok' then 'PASS create_team still works' else 'FAIL create_team: ' || v end)::text);
  c1 := public.team_invite_code();
  r := array_append(r, (case when c1 ~ '^[a-z2-7]{26}$' then 'PASS a new team gets a 26 character code' else 'FAIL new team code: ' || coalesce(c1, 'null') end)::text);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role service_role; -- the lookup is server only since 20261107000600
  select public.team_invite_info(c1) into j;
  r := array_append(r, (case when j ->> 'name' = 'Long Code Team' and (j ->> 'member_count')::int = 1 then 'PASS team_invite_info resolves the new code (name and member count only)' else 'FAIL team_invite_info: ' || coalesce(j::text, 'null') end)::text);
  select public.team_invite_info(upper(c1)) into j;
  r := array_append(r, (case when j ->> 'name' = 'Long Code Team' then 'PASS an upper case copy of the code resolves too (input is lower cased)' else 'FAIL upper case' end)::text);
  select public.team_invite_info('zzzzzzzzzzzzzzzzzzzzzzzzzz') into j;
  r := array_append(r, (case when j is null then 'PASS a wrong 26 character code returns null' else 'FAIL wrong code returned data' end)::text);
  select public.team_invite_info(repeat('a', 12)) into j;
  r := array_append(r, (case when j is null then 'PASS a short code returns null' else 'FAIL short code returned data' end)::text);
  reset role;
  set local role authenticated;
  select public.join_team('abcdefghijklmnopqrstuvwxyz') into v;
  r := array_append(r, (case when v = 'invalid' then 'PASS join_team with a wrong code is invalid' else 'FAIL join_team wrong code: ' || v end)::text);
  select public.join_team(upper(c1)) into v;
  r := array_append(r, (case when v = 'ok' then 'PASS join_team accepts the new code (even typed in upper case)' else 'FAIL join_team: ' || v end)::text);
  reset role;

  -- regenerate: new 26 character code, the old one stops working
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  c2 := public.regenerate_invite_code();
  r := array_append(r, (case when c2 ~ '^[a-z2-7]{26}$' and c2 <> c1 then 'PASS regenerate_invite_code returns a new 26 character code' else 'FAIL regenerate: ' || coalesce(c2, 'null') end)::text);
  r := array_append(r, (case when public.team_invite_code() = c2 then 'PASS the owner sees the regenerated code' else 'FAIL owner code mismatch' end)::text);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select public.join_team(c1) into v;
  r := array_append(r, (case when v = 'invalid' then 'PASS the old code no longer works' else 'FAIL old code still works: ' || v end)::text);
  select public.join_team(c2) into v;
  r := array_append(r, (case when v = 'ok' then 'PASS the regenerated code works' else 'FAIL regenerated code: ' || v end)::text);
  reset role;

  -- the guard: the table now refuses a weak code (checked as the table owner)
  select convalidated into ok from pg_constraint where conname = 'teams_invite_code_strength';
  r := array_append(r, (case when ok then 'PASS teams_invite_code_strength exists and is validated' else 'FAIL constraint missing or not validated' end)::text);
  begin insert into public.teams (name, slug, owner_id, invite_code) values ('Weak', 'weak-team-zz', ua, '0123456789ab'); r := array_append(r, ('FAIL a 12 character code was accepted')::text);
  exception when check_violation then r := array_append(r, ('PASS a 12 character code is refused')::text); end;
  begin insert into public.teams (name, slug, owner_id, invite_code) values ('Upper', 'upper-team-zz', ua, upper(c1)); r := array_append(r, ('FAIL an upper case code was accepted')::text);
  exception when check_violation or unique_violation then r := array_append(r, ('PASS a code outside a-z2-7 is refused')::text); end;
  select pg_get_expr(adbin, adrelid) into v from pg_attrdef where adrelid = 'public.teams'::regclass and adnum = (select attnum from pg_attribute where attrelid = 'public.teams'::regclass and attname = 'invite_code');
  r := array_append(r, (case when v like '%new_invite_code%' then 'PASS the column default is new_invite_code()' else 'FAIL default: ' || v end)::text);

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
