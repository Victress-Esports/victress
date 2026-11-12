-- Game API import checks (after all migrations through 20261108000100). Rolls itself back; results are in the error message.
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  acc uuid; n int; i int;
  puuid text := repeat('p', 78);
begin
  insert into auth.users (id, aud, role, email) values
    (ua, 'authenticated', 'authenticated', 'a@test.invalid'), (ub, 'authenticated', 'authenticated', 'b@test.invalid');

  -- anonymous: nothing
  set local role anon;
  begin perform 1 from public.game_matches; r := array_append(r, 'FAIL anon reads matches');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read matches'); end;
  begin perform 1 from public.game_accounts; r := array_append(r, 'FAIL anon reads accounts');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read accounts'); end;
  begin perform 1 from public.import_jobs; r := array_append(r, 'FAIL anon reads jobs');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read jobs'); end;
  reset role;

  -- a signed in user cannot write any of the three tables
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.game_accounts (profile_id, game, provider, external_id, display_name, tag, region) values (ua, 'LOL', 'riot', puuid, 'Me', 'EUW', 'europe'); r := array_append(r, 'FAIL user inserted an account');
  exception when insufficient_privilege then r := array_append(r, 'PASS a user cannot write accounts (no typed in data)'); end;
  begin insert into public.game_matches (profile_id, account_id, game, source, external_id, queue_kind, played_at, duration_seconds, result, me, participants) values (ua, gen_random_uuid(), 'LOL', 'api', 'EUW1_1', 'ranked', now(), 1800, 'win', '{}', '[]'); r := array_append(r, 'FAIL user inserted a match');
  exception when insufficient_privilege then r := array_append(r, 'PASS a user cannot write matches (no typed in stats)'); end;
  begin insert into public.import_jobs (profile_id, game, provider, requested) values (ua, 'LOL', 'riot', 5); r := array_append(r, 'FAIL user inserted a job');
  exception when insufficient_privilege then r := array_append(r, 'PASS a user cannot write jobs'); end;
  reset role;

  -- server (service role) writes
  set local role service_role;
  insert into public.game_accounts (profile_id, game, provider, external_id, display_name, tag, region) values (ua, 'LOL', 'riot', puuid, 'Me', 'EUW', 'europe') returning id into acc;
  insert into public.game_matches (profile_id, account_id, game, source, external_id, queue_id, queue_kind, played_at, duration_seconds, result, me, participants, timeline)
    values (ua, acc, 'LOL', 'api', 'EUW1_1', 420, 'ranked', now(), 1800, 'win', '{"kills":3}', '[]', '{"frames":[]}');
  r := array_append(r, 'PASS service role writes an account and a match');
  begin insert into public.game_matches (profile_id, account_id, game, source, external_id, queue_kind, played_at, duration_seconds, result, me, participants) values (ua, acc, 'LOL', 'self_reported', 'EUW1_2', 'ranked', now(), 1800, 'win', '{}', '[]'); r := array_append(r, 'FAIL self_reported source accepted');
  exception when check_violation then r := array_append(r, 'PASS source cannot be self_reported'); end;
  begin insert into public.game_matches (profile_id, account_id, game, source, external_id, queue_kind, played_at, duration_seconds, result, me, participants) values (ua, acc, 'LOL', 'api', 'EUW1_1', 'ranked', now(), 1800, 'win', '{}', '[]'); r := array_append(r, 'FAIL duplicate match accepted');
  exception when unique_violation then r := array_append(r, 'PASS the same match is not stored twice'); end;
  begin insert into public.game_matches (profile_id, account_id, game, source, external_id, queue_kind, played_at, duration_seconds, result, me, participants) values (ua, acc, 'LOL', 'api', 'EUW1_3', 'ranked', now(), 1800, 'win', jsonb_build_object('x', repeat('a', 9000)), '[]'); r := array_append(r, 'FAIL oversize json accepted');
  exception when check_violation then r := array_append(r, 'PASS oversize match json refused'); end;
  begin insert into public.game_matches (profile_id, account_id, game, source, external_id, queue_kind, played_at, duration_seconds, result, me, participants) values (ua, acc, 'LOL', 'api', 'EUW1_4', 'practice', now(), 1800, 'win', '{}', '[]'); r := array_append(r, 'FAIL unknown queue kind accepted');
  exception when check_violation then r := array_append(r, 'PASS queue kind limited to the defined set'); end;
  insert into public.import_jobs (profile_id, game, provider, requested) values (ua, 'LOL', 'riot', 20);
  begin insert into public.import_jobs (profile_id, game, provider, requested) values (ua, 'LOL', 'riot', 20); r := array_append(r, 'FAIL two active jobs');
  exception when unique_violation then r := array_append(r, 'PASS one active job per player'); end;
  begin insert into public.import_jobs (profile_id, game, provider, requested, status) values (ua, 'LOL', 'riot', 51, 'failed'); r := array_append(r, 'FAIL job over 50 accepted');
  exception when check_violation then r := array_append(r, 'PASS job size capped at 50'); end;
  begin
    for i in 1..1001 loop
      insert into public.game_matches (profile_id, account_id, game, source, external_id, queue_kind, played_at, duration_seconds, result, me, participants) values (ua, acc, 'LOL', 'api', 'CAP_' || i, 'normal', now(), 100, 'loss', '{}', '[]');
    end loop;
    r := array_append(r, 'FAIL match cap not enforced');
  exception when sqlstate 'P0001' then r := array_append(r, 'PASS match cap enforced (1000)'); end;
  reset role;

  -- owner reads and deletes; strangers do not
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.game_matches; r := array_append(r, case when n >= 1 then 'PASS owner reads own matches' else 'FAIL owner reads nothing' end);
  select count(*) into n from public.game_accounts; r := array_append(r, case when n = 1 then 'PASS owner reads own account' else 'FAIL owner account count' end);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.game_matches; r := array_append(r, case when n = 0 then 'PASS stranger sees no matches' else 'FAIL stranger sees matches' end);
  select count(*) into n from public.game_accounts; r := array_append(r, case when n = 0 then 'PASS stranger sees no account' else 'FAIL stranger sees account' end);
  select count(*) into n from public.import_jobs; r := array_append(r, case when n = 0 then 'PASS stranger sees no jobs' else 'FAIL stranger sees jobs' end);
  delete from public.game_matches; get diagnostics n = row_count; r := array_append(r, case when n = 0 then 'PASS stranger cannot delete matches' else 'FAIL stranger deleted matches' end);
  delete from public.game_accounts; get diagnostics n = row_count; r := array_append(r, case when n = 0 then 'PASS stranger cannot delete accounts' else 'FAIL stranger deleted accounts' end);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.game_accounts; reset role;
  select count(*) into n from public.game_matches where profile_id = ua; r := array_append(r, case when n = 0 then 'PASS deleting the Riot link deletes its matches' else 'FAIL matches survived the link' end);

  -- deleting the profile removes everything
  insert into public.game_accounts (profile_id, game, provider, external_id, display_name, tag, region) values (ua, 'LOL', 'riot', puuid, 'Me', 'EUW', 'europe');
  delete from public.profiles where id = ua;
  select count(*) into n from public.game_accounts where profile_id = ua; r := array_append(r, case when n = 0 then 'PASS account deletion removes the Riot link' else 'FAIL link survived account deletion' end);

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
