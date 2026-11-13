-- Team scrims, sharing consent and events (after all migrations through 20261113000100). Rolls itself back; results are in the error message.
do $$
declare
  r text[] := '{}';
  oa uuid := gen_random_uuid(); ma uuid := gen_random_uuid(); mb uuid := gen_random_uuid(); mc uuid := gen_random_uuid();
  ob uuid := gen_random_uuid(); x uuid := gen_random_uuid();
  ta uuid; tb uuid; s1 uuid; res jsonb; n int; t text;
  rid text := '3b0a1e7c-0000-4000-8000-0000000000aa';
  rid2 text := '3b0a1e7c-0000-4000-8000-0000000000bb';
  base jsonb;
begin
  insert into auth.users (id, aud, role, email) values
    (oa, 'authenticated', 'authenticated', 'oa@test.invalid'), (ma, 'authenticated', 'authenticated', 'ma@test.invalid'),
    (mb, 'authenticated', 'authenticated', 'mb@test.invalid'), (mc, 'authenticated', 'authenticated', 'mc@test.invalid'),
    (ob, 'authenticated', 'authenticated', 'ob@test.invalid'), (x, 'authenticated', 'authenticated', 'x@test.invalid');
  insert into public.teams (name, slug, owner_id) values ('Alpha', 'alpha-ts-test', oa) returning id into ta;
  insert into public.teams (name, slug, owner_id) values ('Bravo', 'bravo-ts-test', ob) returning id into tb;
  insert into public.team_members (team_id, profile_id, role) values (ta, oa, 'owner'), (ta, ma, 'player'), (ta, mb, 'player'), (ta, mc, 'player'), (tb, ob, 'owner');

  base := jsonb_build_object('replay_id', rid, 'via', 'discord', 'played_at', '2026-11-12T20:00:00Z', 'duration_seconds', 300, 'queue_kind', 'custom',
    'side', 'blue', 'goals_for', 3, 'goals_against', 1, 'overtime', false, 'side_players', 3, 'opponent_label', '  Northside  ',
    'team_totals', '{"score": 900, "goals": 3, "assists": 2, "saves": 4, "shots": 9}'::jsonb,
    'opponent_totals', '{"score": 500, "goals": 1, "assists": 0, "saves": 2, "shots": 5}'::jsonb);

  -- clients write nothing directly
  perform set_config('request.jwt.claims', json_build_object('sub', ma, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.team_scrims (team_id, replay_id, submitted_via, played_at, duration_seconds, queue_kind, side, result, goals_for, goals_against, side_players, team_totals, opponent_totals)
    values (ta, rid, 'web', now(), 1, 'custom', 'blue', 'win', 1, 0, 3, '{}', '{}'); r := array_append(r, 'FAIL a member wrote a team scrim');
  exception when insufficient_privilege then r := array_append(r, 'PASS a member cannot write a team scrim directly'); end;
  begin insert into public.team_stat_sharing (profile_id, team_id, game) values (ma, ta, 'ROCKET_LEAGUE'); r := array_append(r, 'FAIL direct sharing insert');
  exception when insufficient_privilege then r := array_append(r, 'PASS sharing is only changed through set_team_stat_sharing'); end;
  begin perform 1 from public.events; r := array_append(r, 'FAIL a member read events');
  exception when insufficient_privilege then r := array_append(r, 'PASS a signed in user cannot read events'); end;
  begin perform public.record_team_scrim(ma, base); r := array_append(r, 'FAIL a member called record_team_scrim');
  exception when insufficient_privilege then r := array_append(r, 'PASS only the server can record a team scrim'); end;

  -- opt in: ma, mb, mc; oa (submitter) does not; x has no team
  if public.set_team_stat_sharing(true) = 'on' then r := array_append(r, 'PASS a member turns team sharing on'); else r := array_append(r, 'FAIL sharing on'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', mb, 'role', 'authenticated')::text, true); perform public.set_team_stat_sharing(true);
  perform set_config('request.jwt.claims', json_build_object('sub', mc, 'role', 'authenticated')::text, true); perform public.set_team_stat_sharing(true);
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  if public.set_team_stat_sharing(true) = 'no_team' then r := array_append(r, 'PASS a player with no team cannot opt in'); else r := array_append(r, 'FAIL no team opt in'); end if;
  reset role;

  -- record: lines offered for the submitter (no opt in), three opted in members, and an outsider
  set local role service_role;
  res := public.record_team_scrim(oa, base || jsonb_build_object('lines', jsonb_build_array(
    jsonb_build_object('profile_id', oa, 'stats', '{"goals": 1}'::jsonb), jsonb_build_object('profile_id', ma, 'stats', '{"goals": 1, "saves": 2}'::jsonb),
    jsonb_build_object('profile_id', mb, 'stats', '{"goals": 1}'::jsonb), jsonb_build_object('profile_id', mc, 'stats', '{"goals": 0}'::jsonb),
    jsonb_build_object('profile_id', x, 'stats', '{"goals": 5}'::jsonb))));
  s1 := (res->>'scrim_id')::uuid;
  if res->>'status' = 'ok' and (res->>'lines')::int = 3 then r := array_append(r, 'PASS the scrim is stored with lines only for the 3 opted in members (not the submitter without opt in, not an outsider)');
  else r := array_append(r, 'FAIL record: ' || res::text); end if;
  if (select opponent_label from public.team_scrims where id = s1) = 'Northside' and (select result from public.team_scrims where id = s1) = 'win' then r := array_append(r, 'PASS result is derived from the score; the label is trimmed');
  else r := array_append(r, 'FAIL result or label'); end if;
  res := public.record_team_scrim(ma, base);
  if res->>'status' = 'already' then r := array_append(r, 'PASS a duplicate submission by the same team stores nothing new'); else r := array_append(r, 'FAIL duplicate: ' || res::text); end if;
  res := public.record_team_scrim(ob, base || '{"side": "orange", "goals_for": 1, "goals_against": 3, "opponent_label": null}'::jsonb);
  if res->>'status' = 'ok' then r := array_append(r, 'PASS a second team submitting the same replay gets its own separate scrim'); else r := array_append(r, 'FAIL second team: ' || res::text); end if;
  res := public.record_team_scrim(x, base);
  if res->>'status' = 'no_team' then r := array_append(r, 'PASS a player on no roster cannot create a team scrim'); else r := array_append(r, 'FAIL outsider: ' || res::text); end if;
  res := public.record_team_scrim(oa, base || jsonb_build_object('replay_id', rid2, 'side_players', 1));
  if res->>'status' = 'solo_replay' then r := array_append(r, 'PASS a 1v1 replay is never a team scrim'); else r := array_append(r, 'FAIL solo: ' || res::text); end if;
  -- opponent names and ids cannot be stored
  begin perform public.record_team_scrim(oa, base || jsonb_build_object('replay_id', rid2, 'opponent_totals', '{"goals": 1, "name": "Rival"}'::jsonb));
    r := array_append(r, 'FAIL a name in the opponent totals was stored');
  exception when check_violation then r := array_append(r, 'PASS a name in the opponent totals is refused by the database'); end;
  begin perform public.record_team_scrim(oa, base || jsonb_build_object('replay_id', rid2, 'team_totals', '{"goals": 1, "platform_id": 76561198000000001}'::jsonb));
    r := array_append(r, 'FAIL an id in the team totals was stored');
  exception when check_violation then r := array_append(r, 'PASS an id in the totals is refused by the database'); end;
  begin insert into public.team_scrim_lines (scrim_id, profile_id, stats) values (s1, oa, '{"goals": 1}'); r := array_append(r, 'FAIL the server wrote a line directly');
  exception when insufficient_privilege then r := array_append(r, 'PASS the server cannot write a line except through record_team_scrim'); end;
  reset role;
  begin insert into public.team_scrim_lines (scrim_id, profile_id, stats) values (s1, oa, '{"goals": 1}'); r := array_append(r, 'FAIL line for a member without opt in');
  exception when raise_exception then r := array_append(r, 'PASS even the database owner cannot add a line for a member without the opt in'); end;

  -- reading
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', mc, 'role', 'authenticated')::text, true);
  if (select count(*) from public.team_scrims) = 1 then r := array_append(r, 'PASS a teammate who did not submit sees the team scrim'); else r := array_append(r, 'FAIL teammate scrim count'); end if;
  if (select count(*) from public.team_scrim_lines where scrim_id = s1) = 3 then r := array_append(r, 'PASS with every hidden player accounted for, opted in lines are visible to teammates'); else r := array_append(r, 'FAIL teammate lines'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', oa, 'role', 'authenticated')::text, true);
  if (select count(*) from public.team_scrim_lines where scrim_id = s1) = 3 and not exists (select 1 from public.team_scrim_lines where profile_id = oa)
  then r := array_append(r, 'PASS the submitter without opt in has no line, and sees the opted in lines'); else r := array_append(r, 'FAIL owner view'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  if (select count(*) from public.team_scrims) = 0 and (select count(*) from public.team_scrim_lines) = 0 then r := array_append(r, 'PASS a non roster user reads no team scrims and no lines'); else r := array_append(r, 'FAIL outsider read'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', ob, 'role', 'authenticated')::text, true);
  if (select count(*) from public.team_scrims) = 1 and (select team_id from public.team_scrims) = tb and (select count(*) from public.team_scrim_lines) = 0
  then r := array_append(r, 'PASS the other team sees only its own scrim and none of the first team''s lines'); else r := array_append(r, 'FAIL other team read'); end if;

  -- revoking: mc off. Lines deleted; now ma and mb are shared and one player (oa) is hidden on a side of 3 -> 3 - 2 = 1 -> withheld.
  perform set_config('request.jwt.claims', json_build_object('sub', mc, 'role', 'authenticated')::text, true);
  if public.set_team_stat_sharing(false) = 'off' then r := array_append(r, 'PASS a member turns team sharing off'); else r := array_append(r, 'FAIL sharing off'); end if;
  reset role;
  if not exists (select 1 from public.team_scrim_lines where profile_id = mc) then r := array_append(r, 'PASS turning sharing off deletes that member''s lines'); else r := array_append(r, 'FAIL lines kept after revoke'); end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', mb, 'role', 'authenticated')::text, true);
  if (select count(*) from public.team_scrim_lines where scrim_id = s1) = 1 and exists (select 1 from public.team_scrim_lines where profile_id = mb)
  then r := array_append(r, 'PASS when only one player on the side would be hidden, teammates'' lines are withheld (the player still sees their own)');
  else r := array_append(r, 'FAIL subtraction guard: ' || (select count(*) from public.team_scrim_lines where scrim_id = s1)); end if;

  -- deletion rights
  perform set_config('request.jwt.claims', json_build_object('sub', ma, 'role', 'authenticated')::text, true);
  delete from public.team_scrims where id = s1; get diagnostics n = row_count;
  if n = 0 then r := array_append(r, 'PASS a member who is neither owner nor submitter cannot delete a team scrim'); else r := array_append(r, 'FAIL member deleted scrim'); end if;
  reset role;

  -- leaving: mb removed. Sharing and lines go; mb no longer reads the team.
  delete from public.team_members where team_id = ta and profile_id = mb;
  if not exists (select 1 from public.team_stat_sharing where profile_id = mb) and not exists (select 1 from public.team_scrim_lines where profile_id = mb)
  then r := array_append(r, 'PASS leaving the team ends sharing and deletes the player''s lines'); else r := array_append(r, 'FAIL leave cleanup'); end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', mb, 'role', 'authenticated')::text, true);
  if (select count(*) from public.team_scrims) = 0 then r := array_append(r, 'PASS a former member no longer sees the team''s scrims'); else r := array_append(r, 'FAIL former member read'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', oa, 'role', 'authenticated')::text, true);
  delete from public.team_scrims where id = s1; get diagnostics n = row_count;
  if n = 1 then r := array_append(r, 'PASS the team owner can delete a team scrim (lines go with it)'); else r := array_append(r, 'FAIL owner delete'); end if;
  reset role;

  -- events
  set local role service_role;
  if public.record_event(ma, 'first_scrim_submitted', '{"source": "discord", "game": "ROCKET_LEAGUE"}') = 'first_scrim_submitted'
     and public.record_event(ma, 'first_scrim_submitted', '{"source": "web", "game": "ROCKET_LEAGUE"}') = 'repeat_scrim_submitted'
  then r := array_append(r, 'PASS the first submission is recorded once, later ones as repeat_scrim_submitted'); else r := array_append(r, 'FAIL first/repeat'); end if;
  perform public.record_event(ma, 'registration_completed', '{"source": "discord", "referral": "club-42"}');
  perform public.record_event(ma, 'registration_completed', '{"source": "discord"}');
  if (select count(*) from public.events where profile_id = ma and name = 'registration_completed') = 1 then r := array_append(r, 'PASS registration_completed is recorded once, with its referral code'); else r := array_append(r, 'FAIL registration once'); end if;
  if public.record_event(ma, 'scrim_processing_completed', '{"goals": 3}') is null
     and public.record_event(ma, 'scrim_processing_completed', jsonb_build_object('replay_id', rid)) is null
     and public.record_event(ma, 'team_joined', '{"referral": "Has Spaces"}') is null
     and public.record_event(ma, 'page_viewed', '{}') is null
     and not exists (select 1 from public.events where props ? 'goals' or props ? 'replay_id')
  then r := array_append(r, 'PASS stats, replay ids, malformed referral codes and unknown event names record nothing'); else r := array_append(r, 'FAIL event filtering'); end if;
  if public.purge_events(12) = 0 then r := array_append(r, 'PASS the 12 month purge runs'); else r := array_append(r, 'FAIL purge'); end if;
  reset role;
  delete from auth.users where id = ma;
  if not exists (select 1 from public.events where profile_id = ma) then r := array_append(r, 'PASS deleting the account deletes its events'); else r := array_append(r, 'FAIL events kept'); end if;

  raise exception E'\n%', array_to_string(r, E'\n');
end;
$$;
