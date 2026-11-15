-- Verified Rocket League identity checks (after all migrations through 20261115000100). Rolls itself back; results are in the error message.
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  uc uuid := gen_random_uuid();
  acc uuid;
  eid text := '9626f441055349ce8cb7d7d5a483eaa2';
begin
  insert into auth.users (id, aud, role, email) values
    (ua, 'authenticated', 'authenticated', 'va@test.invalid'), (ub, 'authenticated', 'authenticated', 'vb@test.invalid'), (uc, 'authenticated', 'authenticated', 'vc@test.invalid');

  set local role service_role;
  insert into public.game_accounts (profile_id, game, provider, external_id, platform, ownership_verified, verified_via, verified_at)
    values (ua, 'ROCKET_LEAGUE', 'rocket_league', eid, 'epic', true, 'epic_oauth', now()) returning id into acc;
  r := array_append(r, 'PASS the server stores an Epic identity verified by Epic sign in');

  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform, ownership_verified, verified_via, verified_at)
      values (ub, 'ROCKET_LEAGUE', 'rocket_league', eid, 'epic', true, 'epic_oauth', now()); r := array_append(r, 'FAIL one Epic account verified twice');
  exception when unique_violation then r := array_append(r, 'PASS one Epic account can be verified on only one Victress account'); end;

  insert into public.game_accounts (profile_id, game, provider, external_id, platform) values (ub, 'ROCKET_LEAGUE', 'rocket_league', eid, 'epic');
  r := array_append(r, 'PASS an unverified identity may still carry the same id (unchanged behaviour)');
  delete from public.game_accounts where profile_id = ub;

  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform, ownership_verified, verified_via, verified_at)
      values (ub, 'ROCKET_LEAGUE', 'rocket_league', '76561198000000001', 'steam', true, 'epic_oauth', now()); r := array_append(r, 'FAIL epic verification on a steam identity');
  exception when check_violation then r := array_append(r, 'PASS Epic verification only fits an Epic identity'); end;
  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform, ownership_verified, verified_via, verified_at)
      values (ub, 'ROCKET_LEAGUE', 'rocket_league', 'NotAnEpicId', 'epic', true, 'epic_oauth', now()); r := array_append(r, 'FAIL malformed epic id verified');
  exception when check_violation then r := array_append(r, 'PASS a verified Epic id must be 32 lower case hex characters'); end;
  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform, ownership_verified) values (ub, 'ROCKET_LEAGUE', 'rocket_league', eid, 'epic', true);
    r := array_append(r, 'FAIL ownership claimed without verification');
  exception when check_violation then r := array_append(r, 'PASS a Rocket League identity cannot be marked owned without a verification record'); end;
  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform, verified_via) values (ub, 'ROCKET_LEAGUE', 'rocket_league', eid, 'epic', 'epic_oauth');
    r := array_append(r, 'FAIL verification without a time');
  exception when check_violation then r := array_append(r, 'PASS a verification needs its time and the ownership flag'); end;
  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform, ownership_verified, verified_via, verified_at)
      values (ub, 'ROCKET_LEAGUE', 'rocket_league', eid || 'x', 'epic', true, 'steam_openid', now()); r := array_append(r, 'FAIL unknown method');
  exception when check_violation then r := array_append(r, 'PASS an unknown verification method is refused'); end;

  -- Steam keeps working with no verification at all
  insert into public.game_accounts (profile_id, game, provider, external_id, platform) values (uc, 'ROCKET_LEAGUE', 'rocket_league', '76561198000000009', 'steam');
  r := array_append(r, 'PASS an unverified Steam identity is stored exactly as before');

  -- clearing verification (identity replaced) is allowed only as a whole
  update public.game_accounts set ownership_verified = false, verified_via = null, verified_at = null where id = acc;
  r := array_append(r, 'PASS verification can be cleared as a whole by the server');
  begin update public.game_accounts set verified_via = 'epic_oauth' where id = acc; r := array_append(r, 'FAIL partial verification');
  exception when check_violation then r := array_append(r, 'PASS a partial verification update is refused'); end;
  update public.game_accounts set ownership_verified = true, verified_via = 'epic_oauth', verified_at = now() where id = acc;
  reset role;

  -- the player can read and delete, but never write, verification
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if (select verified_via from public.game_accounts where id = acc) = 'epic_oauth' then r := array_append(r, 'PASS the player reads their own verification');
  else r := array_append(r, 'FAIL owner cannot read verification'); end if;
  begin update public.game_accounts set verified_via = null where id = acc; r := array_append(r, 'FAIL user changed verification');
  exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot write verification directly'); end;
  begin insert into public.game_accounts (profile_id, game, provider, external_id, platform, ownership_verified, verified_via, verified_at)
      values (ua, 'ROCKET_LEAGUE', 'rocket_league', eid, 'epic', true, 'epic_oauth', now()); r := array_append(r, 'FAIL user inserted verification');
  exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot insert a verified identity'); end;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  if not exists (select 1 from public.game_accounts where id = acc) then r := array_append(r, 'PASS another player cannot see the verified identity');
  else r := array_append(r, 'FAIL verified identity visible to another player'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  delete from public.game_accounts where id = acc;
  reset role;
  if not exists (select 1 from public.game_accounts where id = acc) then r := array_append(r, 'PASS the player can delete the verified identity');
  else r := array_append(r, 'FAIL delete'); end if;

  -- after deletion the Epic account can be verified again (for example on a new Victress account)
  set local role service_role;
  insert into public.game_accounts (profile_id, game, provider, external_id, platform, ownership_verified, verified_via, verified_at)
    values (ub, 'ROCKET_LEAGUE', 'rocket_league', eid, 'epic', true, 'epic_oauth', now());
  r := array_append(r, 'PASS a deleted verification frees the Epic account');
  reset role;
  delete from auth.users where id = ub;
  if not exists (select 1 from public.game_accounts where profile_id = ub) then r := array_append(r, 'PASS deleting the account removes the verified identity');
  else r := array_append(r, 'FAIL cascade'); end if;

  raise exception E'\n%', array_to_string(r, E'\n');
end;
$$;
