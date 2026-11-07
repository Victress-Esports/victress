-- Privacy step 1 (EXPAND) compatibility test. Run after 20261107000100_privacy_expand.sql and BEFORE the contract step.
-- Proves the current application keeps working while new capabilities exist. Rolls itself back; results are in the error message.
create function pg_temp.t(ok boolean, name text) returns text language sql as
$$ select case when coalesce(ok, false) then 'PASS ' else 'FAIL ' end || name $$;

do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  n int; v text; j jsonb; b boolean;
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data) values
    (ua, 'authenticated', 'authenticated', 'a@test.invalid', '{"full_name":"Real Name","picture":"https://cdn.example/a.png"}'),
    (ub, 'authenticated', 'authenticated', 'b@test.invalid', '{}');
  update public.profiles set handle = 'ace_a' where id = ua;
  insert into public.player_games (profile_id, game, role, rank) values (ua, 'VALORANT', 'Duelist', 'Gold');
  insert into public.stat_entries (profile_id, game, season, metrics) values (ua, 'VALORANT', 'S1', '{"acs":250,"matches":40}');
  update public.profiles set search_indexable = true where id = ua; -- ignored: not in the directory
  select count(*) into n from public.profiles where id = ua and search_indexable;
  r := r || pg_temp.t(n = 0, 'search flag cannot be on while the profile is not in the directory');

  -- new signups do not copy provider data
  r := r || pg_temp.t((select display_name is null and avatar_url is null from public.profiles where id = ua), 'signup does not copy the provider name or picture');

  -- the current application's anonymous reads still work (this is what "expand" must not break)
  set local role anon;
  select count(*) into n from public.public_profiles; r := r || pg_temp.t(true, format('anon still reads public_profiles (%s rows)', n));
  select count(*) into n from public.leaderboard('VALORANT', 'acs', 10, false); r := r || pg_temp.t(true, 'anon still calls the old leaderboard()');
  select public.sitemap_profile_count() into n; r := r || pg_temp.t(true, 'anon still calls the old sitemap function');
  reset role;

  -- the new functions exist and are NOT callable by anon or signed in users
  set local role anon;
  begin perform public.shared_profile(repeat('a', 64)); r := array_append(r, ('FAIL anon can call shared_profile')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot call shared_profile')::text); end;
  begin perform public.directory_profile('ace_a'); r := array_append(r, ('FAIL anon can call directory_profile')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot call directory_profile')::text); end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.shared_profile(repeat('a', 64)); r := array_append(r, ('FAIL a signed in user can call shared_profile')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS a signed in user cannot call shared_profile')::text); end;
  begin perform public.handle_available('zzz'); r := array_append(r, ('FAIL a signed in user can call handle_available')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS a signed in user cannot call handle_available')::text); end;
  -- but team_roster is for signed in users
  select count(*) into n from public.team_roster(); r := r || pg_temp.t(n = 0, 'team_roster works for a signed in user (not in a team: empty)');
  -- existing flows
  r := r || pg_temp.t(public.claim_handle('ace_two') = 'ok', 'claim_handle still works');
  r := r || pg_temp.t((public.create_team('Test Team') ->> 'status') = 'ok', 'create_team still works');
  reset role;

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
