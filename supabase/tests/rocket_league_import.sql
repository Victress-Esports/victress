-- Rocket League replay link import checks (after all migrations through 20261112000200). Rolls itself back; results are in the error message.
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  acc uuid; accb uuid; n int;
  rid text := '3b0a1e7c-0000-4000-8000-000000000001';
begin
  insert into auth.users (id, aud, role, email) values
    (ua, 'authenticated', 'authenticated', 'a@test.invalid'), (ub, 'authenticated', 'authenticated', 'b@test.invalid');

  -- a signed in user cannot write an identity, a match or a job (nothing typed in becomes performance data)
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform) values (ua, 'ROCKET_LEAGUE', 'rocket_league', '76561198000000001', 'steam'); r := array_append(r, 'FAIL user wrote an identity');
  exception when insufficient_privilege then r := array_append(r, 'PASS a user cannot write a Rocket League identity directly'); end;
  begin insert into public.import_jobs (profile_id, game, provider, requested, consent_at) values (ua, 'ROCKET_LEAGUE', 'ballchasing', 1, now()); r := array_append(r, 'FAIL user wrote a job');
  exception when insufficient_privilege then r := array_append(r, 'PASS a user cannot write a Ballchasing job'); end;
  reset role;

  set local role service_role;
  -- identity rules
  insert into public.game_accounts (profile_id, game, provider, external_id, platform) values (ua, 'ROCKET_LEAGUE', 'rocket_league', '76561198000000001', 'steam') returning id into acc;
  r := array_append(r, 'PASS the server stores a short (17 character) Steam id');
  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform) values (ub, 'ROCKET_LEAGUE', 'rocket_league', 'x', 'My Space!'); r := array_append(r, 'FAIL malformed platform accepted');
  exception when check_violation then r := array_append(r, 'PASS a malformed platform name is refused'); end;
  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform) values (ub, 'ROCKET_LEAGUE', 'rocket_league', 'x', 'Steam'); r := array_append(r, 'FAIL upper case platform accepted');
  exception when check_violation then r := array_append(r, 'PASS platform names are stored lower case, as Ballchasing reports them'); end;
  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform) values (ub, 'ROCKET_LEAGUE', 'rocket_league', 'x', repeat('a', 17)); r := array_append(r, 'FAIL oversize platform accepted');
  exception when check_violation then r := array_append(r, 'PASS a platform name over 16 characters is refused'); end;
  begin insert into public.game_accounts (profile_id, game, provider, external_id) values (ub, 'ROCKET_LEAGUE', 'rocket_league', 'x'); r := array_append(r, 'FAIL identity without platform accepted');
  exception when check_violation then r := array_append(r, 'PASS a Rocket League identity needs a platform'); end;
  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform, display_name) values (ub, 'ROCKET_LEAGUE', 'rocket_league', 'x', 'epic', 'Name'); r := array_append(r, 'FAIL riot fields on a Rocket League identity');
  exception when check_violation then r := array_append(r, 'PASS a Rocket League identity carries no Riot fields'); end;
  begin insert into public.game_accounts (profile_id, game, provider, external_id, display_name, tag, region) values (ub, 'LOL', 'riot', repeat('p', 78), 'Me', 'EUW', 'europe');
    insert into public.game_accounts (profile_id, game, provider, external_id, platform) values (ub, 'LOL', 'rocket_league', 'y', 'epic'); r := array_append(r, 'FAIL rocket_league identity on the wrong game');
  exception when check_violation then r := array_append(r, 'PASS a Rocket League identity only fits the Rocket League game'); end;
  -- every platform seen in 600 real replays is accepted, and so is one never seen (no migration needed for a new platform)
  reset role;  -- creating sign in users is done as the database owner
  declare pf text; pn int := 0; uidx uuid;
  begin
    foreach pf in array array['steam', 'epic', 'xbox', 'ps4', 'psynet', 'switch', 'ps5'] loop
      uidx := gen_random_uuid();
      insert into auth.users (id, aud, role, email) values (uidx, 'authenticated', 'authenticated', 'p' || pn || '@test.invalid');
      insert into public.game_accounts (profile_id, game, provider, external_id, platform) values (uidx, 'ROCKET_LEAGUE', 'rocket_league', 'id' || pn, pf);
      pn := pn + 1;
    end loop;
    r := array_append(r, 'PASS steam, epic, xbox, ps4, psynet, switch and an unseen platform (ps5) are all accepted');
  end;
  set local role service_role;
  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform) values (ua, 'ROCKET_LEAGUE', 'rocket_league', '76561198000000002', 'steam'); r := array_append(r, 'FAIL second identity for one player');
  exception when unique_violation then r := array_append(r, 'PASS one Rocket League identity per player'); end;

  -- jobs: consent is required by the database itself
  begin insert into public.import_jobs (profile_id, game, provider, requested, external_ref) values (ua, 'ROCKET_LEAGUE', 'ballchasing', 1, rid); r := array_append(r, 'FAIL job without consent');
  exception when check_violation then r := array_append(r, 'PASS a Ballchasing job without the confirmation time is refused'); end;
  insert into public.import_jobs (profile_id, game, provider, requested, external_ref, submitted_via, consent_at, status) values (ua, 'ROCKET_LEAGUE', 'ballchasing', 1, rid, 'discord', now(), 'succeeded');
  r := array_append(r, 'PASS a job with the confirmation time is stored, with its channel');
  begin insert into public.import_jobs (profile_id, game, provider, requested, consent_at, submitted_via) values (ua, 'ROCKET_LEAGUE', 'ballchasing', 1, now(), 'sms'); r := array_append(r, 'FAIL unknown channel');
  exception when check_violation then r := array_append(r, 'PASS an unknown submission channel is refused'); end;
  begin insert into public.import_jobs (profile_id, game, provider, requested) values (ua, 'ROCKET_LEAGUE', 'myspace', 1); r := array_append(r, 'FAIL unknown provider');
  exception when check_violation then r := array_append(r, 'PASS an unknown job provider is refused'); end;
  -- the Riot rules still hold
  insert into public.import_jobs (profile_id, game, provider, requested) values (ub, 'LOL', 'riot', 5);
  r := array_append(r, 'PASS Riot jobs still need no confirmation time');

  -- matches: label and uniqueness
  insert into public.game_matches (profile_id, account_id, game, source, source_detail, external_id, queue_kind, played_at, duration_seconds, result, me, participants)
    values (ua, acc, 'ROCKET_LEAGUE', 'api', 'ballchasing_replay', rid, 'custom', now(), 330, 'win', '{"team":"blue"}', '[]');
  r := array_append(r, 'PASS a Ballchasing replay match is stored with its data label');
  begin insert into public.game_matches (profile_id, account_id, game, source, source_detail, external_id, queue_kind, played_at, duration_seconds, result, me, participants)
    values (ua, acc, 'ROCKET_LEAGUE', 'api', 'ballchasing_replay', rid, 'custom', now(), 330, 'win', '{}', '[]'); r := array_append(r, 'FAIL duplicate replay stored');
  exception when unique_violation then r := array_append(r, 'PASS the same replay is not stored twice for a player'); end;
  begin insert into public.game_matches (profile_id, account_id, game, source, source_detail, external_id, queue_kind, played_at, duration_seconds, result, me, participants)
    values (ua, acc, 'ROCKET_LEAGUE', 'api', 'riot_api', 'x-1', 'custom', now(), 330, 'win', '{}', '[]'); r := array_append(r, 'FAIL riot label on a Rocket League match');
  exception when check_violation then r := array_append(r, 'PASS a Rocket League match cannot carry the Riot label'); end;
  begin insert into public.game_matches (profile_id, account_id, game, source, source_detail, external_id, queue_kind, played_at, duration_seconds, result, me, participants)
    values (ua, acc, 'ROCKET_LEAGUE', 'self_reported', 'ballchasing_replay', 'x-2', 'custom', now(), 330, 'win', '{}', '[]'); r := array_append(r, 'FAIL self reported accepted');
  exception when check_violation then r := array_append(r, 'PASS a typed in (self reported) match is still impossible'); end;
  -- another player can submit the same replay for their own identity
  insert into public.game_accounts (profile_id, game, provider, external_id, platform) values (ub, 'ROCKET_LEAGUE', 'rocket_league', 'abcdef0123456789abcdef0123456789', 'epic') returning id into accb;
  r := array_append(r, 'PASS an Epic identity (32 character id) is stored');
  insert into public.game_matches (profile_id, account_id, game, source, source_detail, external_id, queue_kind, played_at, duration_seconds, result, me, participants)
    values (ub, accb, 'ROCKET_LEAGUE', 'api', 'ballchasing_replay', rid, 'custom', now(), 330, 'loss', '{}', '[]');
  r := array_append(r, 'PASS two players can each store the same replay as their own');
  reset role;

  -- privacy: an owner sees only their own rows; a stranger sees none; identity and matches are not writable
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.game_matches; r := array_append(r, case when n = 1 then 'PASS a player sees only their own matches' else 'FAIL player sees ' || n || ' matches' end);
  select count(*) into n from public.game_accounts where profile_id = ua; r := array_append(r, case when n = 0 then 'PASS another player''s Rocket League identity is invisible' else 'FAIL identity visible to a stranger' end);
  select count(*) into n from public.import_jobs where profile_id = ua; r := array_append(r, case when n = 0 then 'PASS another player''s jobs are invisible' else 'FAIL jobs visible' end);
  begin update public.game_matches set result = 'win'; r := array_append(r, 'FAIL player edited a match');
  exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot edit a stored match'); end;
  reset role;
  set local role anon;
  begin perform 1 from public.game_matches; r := array_append(r, 'FAIL anon reads matches');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read matches'); end;
  reset role;

  -- owner delete: removing the identity removes its matches
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.game_accounts; reset role;
  select count(*) into n from public.game_matches where profile_id = ub; r := array_append(r, case when n = 0 then 'PASS deleting the identity deletes its matches' else 'FAIL matches survived' end);
  select count(*) into n from public.game_matches where profile_id = ua; r := array_append(r, case when n = 1 then 'PASS the other player''s match is untouched' else 'FAIL other player affected' end);

  -- account deletion removes everything
  delete from public.profiles where id = ua;
  select count(*) into n from public.game_accounts where profile_id = ua; r := array_append(r, case when n = 0 then 'PASS account deletion removes the identity' else 'FAIL identity survived' end);
  select count(*) into n from public.import_jobs where profile_id = ua; r := array_append(r, case when n = 0 then 'PASS account deletion removes the jobs' else 'FAIL jobs survived' end);
  select count(*) into n from public.game_matches where profile_id = ua; r := array_append(r, case when n = 0 then 'PASS account deletion removes the matches' else 'FAIL matches survived' end);

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
