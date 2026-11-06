-- M3 behavior test: handle cooldown, games, stat validation, leaderboard gating, teams, roster cap.
-- Run in the Supabase SQL editor (or via execute_sql). One DO block that ends by raising an exception,
-- so NOTHING is persisted. Every line of the result should match its "(expect ...)" note or say "good".
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  v text; n int; j jsonb; code text; uid uuid; oks int := 0; last_status text; ts timestamptz;
begin
  insert into auth.users (id, aud, role, email) values
    (ua, 'authenticated', 'authenticated', 'a@t.invalid'),
    (ub, 'authenticated', 'authenticated', 'b@t.invalid');
  select (handle ~ '^p[0-9a-f]{12}$')::text into v from public.profiles where id = ua;
  r := array_append(r, 'signup creates placeholder-handle profile: ' || v);

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, 'H claim placeholder-pattern -> ' || public.claim_handle('p0123456789ab') || ' (expect reserved)');
  r := array_append(r, 'H claim leaderboard -> ' || public.claim_handle('leaderboard') || ' (expect reserved)');
  r := array_append(r, 'H first claim ace_one -> ' || public.claim_handle('ace_one') || ' (expect ok)');
  r := array_append(r, 'H change to ace_two -> ' || public.claim_handle('ace_two') || ' (expect ok)');
  r := array_append(r, 'H change to ace_three -> ' || public.claim_handle('ace_three') || ' (expect cooldown)');
  r := array_append(r, 'H same handle again -> ' || public.claim_handle('ace_two') || ' (expect ok)');
  ts := public.handle_change_available_at();
  r := array_append(r, 'H available_at ~30d ahead: ' || (ts > now() + interval '29 days' and ts < now() + interval '31 days')::text);

  insert into public.player_games (profile_id, game, role, rank) values (ua, 'VALORANT', 'Duelist', 'Gold');
  insert into public.player_games (profile_id, game, role, rank) values (ua, 'CS2', 'Entry', 'Supreme');
  select game into v from public.profiles where id = ua;
  r := array_append(r, 'G primary after 2 inserts: ' || v || ' (expect VALORANT)');
  r := array_append(r, 'G set_primary CS2 -> ' || public.set_primary_game('CS2'));
  select game || '/' || role || '/' || rank into v from public.profiles where id = ua;
  r := array_append(r, 'G profile mirrors primary: ' || v || ' (expect CS2/Entry/Supreme)');
  delete from public.player_games where profile_id = ua and game = 'CS2';
  select game into v from public.profiles where id = ua;
  r := array_append(r, 'G primary removed -> promoted: ' || coalesce(v, 'null') || ' (expect VALORANT)');
  begin update public.profiles set game = 'APEX' where id = ua; r := array_append(r, 'G direct profiles.game update: LEAK');
  exception when insufficient_privilege then r := array_append(r, 'G direct profiles.game update: blocked (good)'); end;
  begin update public.player_games set is_primary = true where profile_id = ua; r := array_append(r, 'G direct is_primary update: LEAK');
  exception when insufficient_privilege then r := array_append(r, 'G direct is_primary update: blocked (good)'); end;
  begin insert into public.player_games (profile_id, game) values (ub, 'APEX'); r := array_append(r, 'G add game for B: LEAK');
  exception when others then r := array_append(r, 'G add game for B: blocked (good)'); end;

  -- Regression: PostgREST upsert also updates key columns, which users cannot. The app inserts, then updates role/rank on 23505.
  begin
    insert into public.player_games (profile_id, game, role, rank) values (ua, 'VALORANT', 'Duelist', 'Gold')
    on conflict (profile_id, game) do update set profile_id = excluded.profile_id, game = excluded.game, role = excluded.role, rank = excluded.rank;
    r := array_append(r, 'G upsert touching key columns: LEAK');
  exception when insufficient_privilege then r := array_append(r, 'G upsert touching key columns: denied (the app must not use upsert here)'); end;
  begin
    insert into public.player_games (profile_id, game, role, rank) values (ua, 'VALORANT', 'Duelist', 'Gold');
    r := array_append(r, 'G duplicate insert: no error?');
  exception when unique_violation then
    update public.player_games set role = 'Controller', rank = 'Gold' where profile_id = ua and game = 'VALORANT';
    r := array_append(r, 'G duplicate insert -> 23505 then role/rank update: ok (what savePlayerGame does)');
  end;

  insert into public.stat_entries (profile_id, game, season, metrics) values (ua, 'VALORANT', 'S1', '{"acs":250,"matches":40}');
  r := array_append(r, 'S valid metrics: ok');
  begin insert into public.stat_entries (profile_id, game, season, metrics) values (ua, 'VALORANT', 'S1', '{"acs":"abc"}'); r := array_append(r, 'S text value: LEAK');
  exception when check_violation then r := array_append(r, 'S text value: rejected (good)'); end;
  begin insert into public.stat_entries (profile_id, game, season, metrics) values (ua, 'VALORANT', 'S1', '{"acs":-5}'); r := array_append(r, 'S negative: LEAK');
  exception when check_violation then r := array_append(r, 'S negative: rejected (good)'); end;
  begin insert into public.stat_entries (profile_id, game, season, metrics) values (ua, 'VALORANT', 'S1', '{"Bad Key":1}'); r := array_append(r, 'S bad key: LEAK');
  exception when check_violation then r := array_append(r, 'S bad key: rejected (good)'); end;
  begin insert into public.stat_entries (profile_id, game, season, metrics) values (ua, 'FORTNITE', 'S1', '{"acs":1}'); r := array_append(r, 'S unknown game: LEAK');
  exception when check_violation then r := array_append(r, 'S unknown game: rejected (good)'); end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, 'B claim ace_b -> ' || public.claim_handle('ace_b'));
  insert into public.player_games (profile_id, game, role, rank) values (ub, 'VALORANT', 'Sentinel', 'Silver');
  insert into public.stat_entries (profile_id, game, season, metrics) values (ub, 'VALORANT', 'S1', '{"acs":300,"matches":12}');
  reset role;

  set local role anon;
  select string_agg(place || ':' || handle || '=' || value, ', ' order by place) into v from public.leaderboard('VALORANT', 'acs');
  r := array_append(r, 'L board (anon): ' || v || ' (expect 1:ace_b=300, 2:ace_two=250)');
  select string_agg(handle, ',') into v from public.leaderboard('VALORANT', 'bad key!');
  r := array_append(r, 'L bad metric name returns: ' || coalesce(v, 'nothing') || ' (expect nothing)');
  r := array_append(r, 'L real count: ' || public.leaderboard_player_count('VALORANT') || ' (expect 2)');
  reset role;
  update public.profiles set is_demo = true where id = ub;
  set local role anon;
  r := array_append(r, 'L count w/ B as demo: ' || public.leaderboard_player_count('VALORANT') || ' (expect 1), include_demo: ' || public.leaderboard_player_count('VALORANT', true) || ' (expect 2)');
  select string_agg(handle, ',') into v from public.leaderboard('VALORANT', 'acs');
  r := array_append(r, 'L board hides demo: ' || v || ' (expect ace_two)');
  reset role;
  update public.profiles set is_demo = false where id = ub;

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  j := public.create_team('Test Squad');
  r := array_append(r, 'T create_team -> ' || (j ->> 'status'));
  r := array_append(r, 'T create second team -> ' || (public.create_team('Another') ->> 'status') || ' (expect already_in_team)');
  code := public.team_invite_code();
  begin delete from public.team_members where profile_id = ua; r := array_append(r, 'T direct member delete: LEAK');
  exception when insufficient_privilege then r := array_append(r, 'T direct member delete: blocked (good)'); end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, 'T B join bogus -> ' || public.join_team('bogus') || ' (expect invalid)');
  r := array_append(r, 'T B join -> ' || public.join_team(code) || ' (expect ok)');
  r := array_append(r, 'T B join again -> ' || public.join_team(code) || ' (expect already_member)');
  r := array_append(r, 'T B sees owner code -> ' || coalesce(public.team_invite_code(), 'null') || ' (expect null)');
  r := array_append(r, 'T B remove owner -> ' || public.remove_team_member(ua) || ' (expect not_owner)');
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, 'T A leave w/ members -> ' || public.leave_team() || ' (expect owner_has_members)');
  r := array_append(r, 'T A remove B -> ' || public.remove_team_member(ub) || ' (expect ok)');
  reset role;

  for i in 1..10 loop
    uid := gen_random_uuid();
    insert into auth.users (id, aud, role, email) values (uid, 'authenticated', 'authenticated', 'x' || i || '@t.invalid');
    perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
    set local role authenticated;
    last_status := public.join_team(code);
    reset role;
    if last_status = 'ok' then oks := oks + 1; end if;
  end loop;
  r := array_append(r, 'T roster cap: ' || oks || ' joined, last status ' || last_status || ' (expect 9 joined, full)');

  set local role anon;
  begin perform public.join_team(code); r := array_append(r, 'T anon join_team: LEAK');
  exception when insufficient_privilege then r := array_append(r, 'T anon join_team: blocked (good)'); end;
  begin perform public.create_team('Hax'); r := array_append(r, 'T anon create_team: LEAK');
  exception when insufficient_privilege then r := array_append(r, 'T anon create_team: blocked (good)'); end;
  reset role;

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
