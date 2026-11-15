-- Claimable snapshots and verified Steam identities (after all migrations through 20261116000100). Rolls itself back; results are in the
-- error message.
do $$
declare
  r text[] := '{}';
  sub uuid := gen_random_uuid(); mate uuid := gen_random_uuid(); typed uuid := gen_random_uuid(); stranger uuid := gen_random_uuid();
  ta uuid; sid uuid; res jsonb; n int;
  k1 text := repeat('1', 64); k2 text := repeat('2', 64); k3 text := repeat('3', 64);
  rid text := '3b0a1e7c-0000-4000-8000-0000000000cc';
begin
  insert into auth.users (id, aud, role, email) values (sub, 'authenticated', 'authenticated', 's1@test.invalid'), (mate, 'authenticated', 'authenticated', 's2@test.invalid'),
    (typed, 'authenticated', 'authenticated', 's3@test.invalid'), (stranger, 'authenticated', 'authenticated', 's4@test.invalid');
  insert into public.teams (name, slug, owner_id) values ('Snap', 'snap-test', sub) returning id into ta;
  insert into public.team_members (team_id, profile_id, role) values (ta, sub, 'owner');

  -- Steam can now be a verified identity; Epic rules unchanged
  set local role service_role;
  insert into public.game_accounts (profile_id, game, provider, external_id, platform, ownership_verified, verified_via, verified_at)
    values (mate, 'ROCKET_LEAGUE', 'rocket_league', '76561198000000042', 'steam', true, 'steam_openid', now());
  r := array_append(r, 'PASS a Steam identity verified by Steam sign in is stored');
  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform, ownership_verified, verified_via, verified_at)
      values (stranger, 'ROCKET_LEAGUE', 'rocket_league', '7656119800000004', 'steam', true, 'steam_openid', now()); r := array_append(r, 'FAIL 16 digit steam id verified');
  exception when check_violation then r := array_append(r, 'PASS a verified Steam id must be exactly 17 digits'); end;
  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform, ownership_verified, verified_via, verified_at)
      values (stranger, 'ROCKET_LEAGUE', 'rocket_league', '9626f441055349ce8cb7d7d5a483eaa2', 'epic', true, 'steam_openid', now()); r := array_append(r, 'FAIL steam verification on epic');
  exception when check_violation then r := array_append(r, 'PASS Steam verification only fits a Steam identity'); end;
  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform, ownership_verified, verified_via, verified_at)
      values (stranger, 'ROCKET_LEAGUE', 'rocket_league', '76561198000000042', 'steam', true, 'steam_openid', now()); r := array_append(r, 'FAIL one steam account verified twice');
  exception when unique_violation then r := array_append(r, 'PASS one Steam account can be verified on only one Victress account'); end;
  insert into public.game_accounts (profile_id, game, provider, external_id, platform) values (typed, 'ROCKET_LEAGUE', 'rocket_league', '76561198000000099', 'steam');
  r := array_append(r, 'PASS an unverified typed Steam id still works as before');

  -- a team scrim by the submitter, then snapshots for two other players on the submitter's side
  res := public.record_team_scrim(sub, jsonb_build_object('replay_id', rid, 'via', 'discord', 'played_at', '2026-11-15T20:00:00Z', 'duration_seconds', 300,
    'queue_kind', 'custom', 'side', 'blue', 'goals_for', 3, 'goals_against', 1, 'side_players', 3,
    'team_totals', '{"goals": 3, "saves": 2}'::jsonb, 'opponent_totals', '{"goals": 1}'::jsonb));
  sid := (res->>'scrim_id')::uuid;
  n := public.record_rl_snapshots(sid, sub, jsonb_build_array(jsonb_build_object('key', k1, 'stats', '{"goals": 1, "saves": 2, "score": 400}'::jsonb), jsonb_build_object('key', k2, 'stats', '{"goals": 0}'::jsonb)));
  r := array_append(r, case when n = 2 then 'PASS two snapshots stored for the submitter''s side' else 'FAIL stored ' || n end);
  n := public.record_rl_snapshots(sid, sub, jsonb_build_array(jsonb_build_object('key', k1, 'stats', '{"goals": 1}'::jsonb)));
  r := array_append(r, case when n = 0 then 'PASS the same player in the same replay is stored once' else 'FAIL duplicate' end);
  n := public.record_rl_snapshots(sid, mate, jsonb_build_array(jsonb_build_object('key', k3, 'stats', '{"goals": 1}'::jsonb)));
  r := array_append(r, case when n = 0 then 'PASS only the scrim''s own submitter can add its snapshots' else 'FAIL other submitter' end);
  begin perform public.record_rl_snapshots(sid, sub, jsonb_build_array(jsonb_build_object('key', k3, 'stats', '{"goals": 1, "name": "Rival"}'::jsonb)));
    r := array_append(r, 'FAIL a name was stored');
  exception when check_violation then r := array_append(r, 'PASS a snapshot holds only the five numbers (a name is refused)'); end;
  begin perform public.record_rl_snapshots(sid, sub, jsonb_build_array(jsonb_build_object('key', '76561198000000042', 'stats', '{"goals": 1}'::jsonb)));
    r := array_append(r, 'FAIL a raw platform id was stored as the key');
  exception when check_violation then r := array_append(r, 'PASS a raw platform id cannot be stored as the key (64 hex only)'); end;
  if (select result from public.rl_snapshots where identity_key = k1) = 'win' and (select goals_for from public.rl_snapshots where identity_key = k1) = 3
  then r := array_append(r, 'PASS a snapshot carries the scrim''s facts for that side'); else r := array_append(r, 'FAIL facts'); end if;
  reset role;

  -- nobody reads or writes unclaimed snapshots
  perform set_config('request.jwt.claims', json_build_object('sub', mate, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.rl_snapshots; r := array_append(r, case when n = 0 then 'PASS an unclaimed snapshot is invisible, even to the player it is about' else 'FAIL visible ' || n end);
  begin insert into public.rl_snapshots (replay_id, identity_key, played_at, duration_seconds, queue_kind, result, goals_for, goals_against, stats) values (rid, k3, now(), 1, 'custom', 'win', 1, 0, '{}');
    r := array_append(r, 'FAIL player inserted a snapshot');
  exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot create a snapshot'); end;
  begin perform public.claim_rl_snapshots(mate, k1); r := array_append(r, 'FAIL player called claim');
  exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot call the claim function directly'); end;
  reset role;

  -- claiming needs a verified identity
  set local role service_role;
  n := public.claim_rl_snapshots(typed, k2); r := array_append(r, case when n = 0 then 'PASS a player with only a typed (unverified) id cannot claim' else 'FAIL typed claimed' end);
  n := public.claim_rl_snapshots(stranger, k2); r := array_append(r, case when n = 0 then 'PASS a player with no identity cannot claim' else 'FAIL stranger claimed' end);
  n := public.claim_rl_snapshots(mate, 'nothex'); r := array_append(r, case when n = 0 then 'PASS a malformed key claims nothing' else 'FAIL bad key' end);
  n := public.claim_rl_snapshots(mate, k1); r := array_append(r, case when n = 1 then 'PASS a verified player claims exactly the snapshot with their key' else 'FAIL claim ' || n end);
  n := public.claim_rl_snapshots(mate, k1); r := array_append(r, case when n = 0 then 'PASS claiming twice changes nothing' else 'FAIL reclaim' end);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', mate, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.rl_snapshots; r := array_append(r, case when n = 1 then 'PASS the claimer sees only their own claimed snapshot' else 'FAIL claimer sees ' || n end);
  begin perform identity_key from public.rl_snapshots; r := array_append(r, 'FAIL claimer read the key');
  exception when insufficient_privilege then r := array_append(r, 'PASS even the claimer cannot read the identity key'); end;
  begin update public.rl_snapshots set stats = '{"goals": 9}'; r := array_append(r, 'FAIL claimer edited');
  exception when insufficient_privilege then r := array_append(r, 'PASS a claimer cannot edit a snapshot'); end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', sub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.rl_snapshots; r := array_append(r, case when n = 0 then 'PASS the submitter cannot read teammates'' snapshots' else 'FAIL submitter sees ' || n end);
  reset role;

  -- removing the team scrim drops unclaimed snapshots but keeps the claimed one
  delete from public.team_scrims where id = sid;
  if not exists (select 1 from public.rl_snapshots where identity_key = k2) and exists (select 1 from public.rl_snapshots where identity_key = k1 and claimed_by = mate)
  then r := array_append(r, 'PASS removing the scrim deletes unclaimed snapshots and keeps the claimed one'); else r := array_append(r, 'FAIL scrim removal'); end if;

  -- retention
  set local role service_role;
  if public.purge_rl_snapshots(90) = 0 then r := array_append(r, 'PASS the purge leaves claimed snapshots alone'); else r := array_append(r, 'FAIL purge took a claimed one'); end if;
  begin perform public.purge_rl_snapshots(0); r := array_append(r, 'FAIL zero days');
  exception when others then r := array_append(r, 'PASS a retention under 1 day is refused'); end;
  reset role;

  -- the claimer deletes it, or deleting the account does
  perform set_config('request.jwt.claims', json_build_object('sub', mate, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.rl_snapshots; get diagnostics n = row_count;
  reset role;
  r := array_append(r, case when n = 1 then 'PASS the claimer can delete their snapshot' else 'FAIL delete ' || n end);
  insert into public.rl_snapshots (replay_id, identity_key, played_at, duration_seconds, queue_kind, result, goals_for, goals_against, stats, claimed_by, claimed_at)
    values (rid, k3, now(), 1, 'custom', 'win', 1, 0, '{"goals": 1}', mate, now());
  delete from auth.users where id = mate;
  r := array_append(r, case when not exists (select 1 from public.rl_snapshots where identity_key = k3) then 'PASS deleting the account deletes its claimed snapshots' else 'FAIL cascade' end);
  insert into public.rl_snapshots (replay_id, identity_key, played_at, duration_seconds, queue_kind, result, goals_for, goals_against, stats, created_at)
    values (rid, k2, now(), 1, 'custom', 'win', 1, 0, '{"goals": 1}', now() - interval '91 days');
  set local role service_role;
  n := public.purge_rl_snapshots(90);
  reset role;
  r := array_append(r, case when n = 1 then 'PASS an unclaimed snapshot older than 90 days is deleted' else 'FAIL purge ' || n end);

  raise exception E'\n%', array_to_string(r, E'\n');
end;
$$;
