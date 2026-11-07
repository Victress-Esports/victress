-- Privacy foundation NEGATIVE tests. Run after BOTH 20261107000100_privacy_expand.sql and 20261107000200_privacy_contract.sql,
-- with rows that already exist. Everything rolls back; results are in the error message. Any line starting FAIL is a defect.
-- Covers docs/proposals/privacy-safety-architecture.md section 10 (token handling, anonymous access, consent flags).
create function pg_temp.t(ok boolean, name text) returns text language sql as
$$ select case when coalesce(ok, false) then 'PASS ' else 'FAIL ' end || name $$;

do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); ud uuid := gen_random_uuid();
  ha text; hb text;
  n int; v text; j jsonb; j2 jsonb; b boolean; tid uuid; lid uuid; code text;
  h1 text := encode(sha256('token-one'::bytea), 'hex');
  h2 text := encode(sha256('token-two'::bytea), 'hex');
  h3 text := encode(sha256('token-three'::bytea), 'hex');
  allf jsonb := '{"display_name":true,"avatar":true,"bio":true,"team":true,"stats":true,"rank_role":true}';
  nonef jsonb := '{"display_name":false,"avatar":false,"bio":false,"team":false,"stats":false,"rank_role":false}';
begin
  -- ---- Fixtures: A (will share), B (teammate), C (stranger), D (directory and leaderboard)
  insert into auth.users (id, aud, role, email, raw_user_meta_data) values
    (ua, 'authenticated', 'authenticated', 'a@test.invalid', '{"full_name":"Real Name A","picture":"https://cdn.example/a.png"}'),
    (ub, 'authenticated', 'authenticated', 'b@test.invalid', '{"full_name":"Real Name B"}'),
    (uc, 'authenticated', 'authenticated', 'c@test.invalid', '{}'),
    (ud, 'authenticated', 'authenticated', 'd@test.invalid', '{}');
  select handle into ha from public.profiles where id = ua;
  select handle into hb from public.profiles where id = ub;

  -- ---- 1. Sign up
  r := r || pg_temp.t(ha ~ '^p[0-9a-f]{12}$', 'placeholder handle keeps the reserved pattern');
  r := r || pg_temp.t(ha <> 'p' || substr(replace(ua::text, '-', ''), 1, 12), 'placeholder handle is not derived from the user id');
  r := r || pg_temp.t((select display_name is null and avatar_url is null from public.profiles where id = ua), 'signup does not copy the provider name or picture (A)');
  r := r || pg_temp.t((select display_name is null from public.profiles where id = ub), 'signup does not copy the provider name (B)');
  r := r || pg_temp.t((select not directory_listed and not show_on_leaderboards and not scoutable and not search_indexable and public_fields = nonef from public.profiles where id = ua), 'every consent is off by default');

  update public.profiles set handle = 'ace_a', display_name = 'Ace A', avatar_url = 'https://cdn.example/a.png', bio = 'Hello from A' where id = ua;
  update public.profiles set handle = 'bee_b' where id = ub;
  update public.profiles set handle = 'dee_d', display_name = 'Dee D' where id = ud;
  insert into public.player_games (profile_id, game, role, rank) values (ua, 'VALORANT', 'Duelist', 'Gold'), (ud, 'VALORANT', 'Controller', 'Silver');
  insert into public.stat_entries (profile_id, game, season, metrics) values
    (ua, 'VALORANT', 'S1', '{"acs":250,"matches":40}'), (ud, 'VALORANT', 'S1', '{"acs":300,"matches":12}');
  insert into public.teams (name, slug, owner_id) values ('Test Team', 'test-team-x', ua) returning id, invite_code into tid, code;
  insert into public.team_members (team_id, profile_id, role) values (tid, ua, 'owner'), (tid, ub, 'player');
  update public.profiles set team_id = tid where id in (ua, ub);

  -- ---- 2. Anonymous access is closed
  set local role anon;
  begin perform 1 from public.profiles limit 1; r := array_append(r, ('FAIL anon reads profiles')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot read profiles')::text); end;
  begin perform 1 from public.stat_entries limit 1; r := array_append(r, ('FAIL anon reads stat_entries')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot read stat_entries')::text); end;
  begin perform 1 from public.player_games limit 1; r := array_append(r, ('FAIL anon reads player_games')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot read player_games')::text); end;
  begin perform 1 from public.teams limit 1; r := array_append(r, ('FAIL anon reads teams')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot read teams')::text); end;
  begin perform 1 from public.team_members limit 1; r := array_append(r, ('FAIL anon reads team_members')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot read team_members')::text); end;
  begin perform 1 from public.profile_share_links limit 1; r := array_append(r, ('FAIL anon reads profile_share_links')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot read profile_share_links')::text); end;
  begin perform 1 from public.public_profiles limit 1; r := array_append(r, ('FAIL the public view still exists for anon')::text);
  exception when undefined_table then r := array_append(r, ('PASS the public_profiles view is gone')::text); when insufficient_privilege then r := array_append(r, ('PASS anon cannot use public_profiles')::text); end;
  begin perform public.leaderboard('VALORANT', 'acs'); r := array_append(r, ('FAIL old leaderboard() still exists')::text);
  exception when undefined_function then r := array_append(r, ('PASS the old anonymous leaderboard() is gone')::text); end;
  -- every server only function refuses anon
  begin perform public.shared_profile(h1); r := array_append(r, ('FAIL anon shared_profile')::text); exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot call shared_profile')::text); end;
  begin perform public.directory_profile('ace_a'); r := array_append(r, ('FAIL anon directory_profile')::text); exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot call directory_profile')::text); end;
  begin perform public.board_entries('VALORANT', 'acs'); r := array_append(r, ('FAIL anon board_entries')::text); exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot call board_entries')::text); end;
  begin perform public.board_player_count('VALORANT'); r := array_append(r, ('FAIL anon board_player_count')::text); exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot call board_player_count')::text); end;
  begin perform public.sitemap_directory_count(); r := array_append(r, ('FAIL anon sitemap_directory_count')::text); exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot call sitemap_directory_count')::text); end;
  begin perform public.sitemap_directory_profiles(); r := array_append(r, ('FAIL anon sitemap_directory_profiles')::text); exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot call sitemap_directory_profiles')::text); end;
  begin perform public.handle_available('free_name'); r := array_append(r, ('FAIL anon handle_available')::text); exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot call handle_available')::text); end;
  begin perform public.team_roster(); r := array_append(r, ('FAIL anon team_roster')::text); exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot call team_roster')::text); end;
  begin perform public.profile_payload(ua, allf); r := array_append(r, ('FAIL anon profile_payload')::text); exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot call profile_payload')::text); end;
  -- the join page resolves invite codes on the server (service role) since 20261107000600; anon cannot call it directly
  -- (before 20261107000600 anon can still call it; after it, only the service role can. supabase/tests/invite_info_server_only.sql asserts the latter.)
  begin perform public.team_invite_info(code); r := array_append(r, ('PASS anon can call team_invite_info (before 20261107000600)')::text); exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot call team_invite_info (server only, after 20261107000600)')::text); when others then r := array_append(r, ('FAIL anon team_invite_info broke: ' || sqlerrm)::text); end;
  reset role;

  -- ---- 3. Signed in users cannot call server only functions either (token resolution stays server side)
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.shared_profile(h1); r := array_append(r, ('FAIL authenticated shared_profile')::text); exception when insufficient_privilege then r := array_append(r, ('PASS a signed in user cannot call shared_profile')::text); end;
  begin perform public.directory_profile('ace_a'); r := array_append(r, ('FAIL authenticated directory_profile')::text); exception when insufficient_privilege then r := array_append(r, ('PASS a signed in user cannot call directory_profile')::text); end;
  begin perform public.board_entries('VALORANT', 'acs'); r := array_append(r, ('FAIL authenticated board_entries')::text); exception when insufficient_privilege then r := array_append(r, ('PASS a signed in user cannot call board_entries')::text); end;
  begin perform public.handle_available('free_name'); r := array_append(r, ('FAIL authenticated handle_available')::text); exception when insufficient_privilege then r := array_append(r, ('PASS a signed in user cannot call handle_available')::text); end;
  -- C is a stranger: sees none of A's data
  select count(*) into n from public.profiles where id <> uc; r := r || pg_temp.t(n = 0, 'a signed in stranger reads no other profile row');
  select count(*) into n from public.stat_entries; r := r || pg_temp.t(n = 0, 'a signed in stranger reads no stat rows');
  select count(*) into n from public.player_games; r := r || pg_temp.t(n = 0, 'a signed in stranger reads no game rows');
  select count(*) into n from public.teams; r := r || pg_temp.t(n = 0, 'a signed in stranger reads no teams');
  select count(*) into n from public.profile_share_links; r := r || pg_temp.t(n = 0, 'a signed in stranger reads no share links');
  begin insert into public.profile_share_links (profile_id, token_hash, fields) values (ua, h1, nonef);
    r := array_append(r, ('FAIL a stranger created a link for A')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS a stranger cannot create a link for A (row level security)')::text); end;
  begin update public.profiles set scoutable = true where id = uc; r := array_append(r, ('FAIL a player set scoutable')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS a player cannot set scoutable (no recruiter access exists)')::text); end;
  reset role;

  -- ---- 4. Owner and teammates
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.profiles; r := r || pg_temp.t(n = 1, 'the owner reads exactly their own profile row');
  select count(*) into n from public.stat_entries; r := r || pg_temp.t(n = 1, 'the owner reads their own stats');
  select count(*) into n from public.teams; r := r || pg_temp.t(n = 1, 'the owner reads their own team');
  select count(*) into n from public.team_roster(); r := r || pg_temp.t(n = 2, 'team_roster returns both teammates');
  r := r || pg_temp.t((select count(*) = 0 from public.team_roster() t where t.handle is null), 'team_roster rows carry a handle');
  begin perform 1 from public.profile_share_links where token_hash is not null; r := array_append(r, ('FAIL the owner can read token_hash')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS the owner cannot read token_hash')::text); end;
  r := r || pg_temp.t(public.claim_handle('ace_hello') = 'ok', 'claim_handle still works');
  r := r || pg_temp.t((public.team_invite_code()) is not null, 'the owner still gets the invite code');
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.profiles; r := r || pg_temp.t(n = 1, 'a teammate reads only their own profile row directly');
  select count(*) into n from public.team_roster(); r := r || pg_temp.t(n = 2, 'a teammate sees the roster through team_roster');
  select count(*) into n from public.teams; r := r || pg_temp.t(n = 1, 'a teammate reads their team');
  r := r || pg_temp.t((select t.team_role from public.team_roster() t where t.profile_id = ua) = 'owner', 'the roster shows team roles');
  reset role;

  -- ---- 5. Sharing links (the token itself never reaches the database: only hashes)
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.profile_share_links (profile_id, token_hash, label, fields, expires_at)
    values (ua, h1, 'recruiter', '{"display_name":false,"avatar":false,"bio":true,"team":false,"stats":false,"rank_role":false}', now() + interval '90 days');
  insert into public.profile_share_links (profile_id, token_hash, label, fields) values (ua, h2, 'all fields', allf);
  select id into lid from public.profile_share_links where label = 'recruiter';
  begin insert into public.profile_share_links (profile_id, token_hash, fields) values (ua, 'not-a-hash', nonef);
    r := array_append(r, ('FAIL a malformed hash was accepted')::text); exception when check_violation then r := array_append(r, ('PASS a malformed token hash is rejected')::text); end;
  begin insert into public.profile_share_links (profile_id, token_hash, fields) values (ua, h3, '{"password":true}');
    r := array_append(r, ('FAIL unknown field keys accepted')::text); exception when check_violation then r := array_append(r, ('PASS unknown field keys are rejected')::text); end;
  begin insert into public.profile_share_links (profile_id, token_hash, fields) values (ua, h3, '{"bio":"yes"}');
    r := array_append(r, ('FAIL non boolean field accepted')::text); exception when check_violation then r := array_append(r, ('PASS non boolean field values are rejected')::text); end;
  begin insert into public.profile_share_links (profile_id, token_hash, fields) values (ua, h1, nonef);
    r := array_append(r, ('FAIL a duplicate token hash was accepted')::text); exception when unique_violation then r := array_append(r, ('PASS a duplicate token hash is rejected')::text); end;
  reset role;

  -- resolution happens as the server
  set local role service_role;
  j := public.shared_profile(h1);
  r := r || pg_temp.t(j ->> 'handle' = 'ace_hello', 'a link resolves to the profile');
  r := r || pg_temp.t(j ->> 'bio' = 'Hello from A', 'an enabled field (bio) is returned');
  r := r || pg_temp.t(j ->> 'display_name' is null and j ->> 'avatar_url' is null and j ->> 'team_name' is null, 'disabled fields (name, picture, team) are absent');
  r := r || pg_temp.t((j ->> 'metrics') is null, 'stats are absent when not enabled');
  r := r || pg_temp.t((j -> 'games' -> 0 ->> 'role') is null and (j -> 'games' -> 0 ->> 'rank') is null and j ->> 'role' is null, 'role and rank are absent when not enabled');
  r := r || pg_temp.t(not (j ? 'email') and j::text !~* 'test.invalid' and j::text !~* 'real name', 'no email or provider name anywhere in the payload');
  j2 := public.shared_profile(h2);
  r := r || pg_temp.t(j2 ->> 'display_name' = 'Ace A' and j2 ->> 'team_name' = 'Test Team' and (j2 -> 'metrics' ->> 'acs') = '250' and j2 ->> 'metrics_source' = 'self_reported', 'a link with every field returns them, stats labeled self_reported');
  r := r || pg_temp.t((select view_count = 1 and last_viewed_at is not null from public.profile_share_links where token_hash = h1), 'viewing counts a view and records the time');
  r := r || pg_temp.t(public.shared_profile(encode(sha256('unknown'::bytea), 'hex')) is null, 'an unknown token returns null');
  r := r || pg_temp.t(public.shared_profile('ace_hello') is null, 'a handle cannot be used as a token');
  r := r || pg_temp.t(public.shared_profile(ua::text) is null, 'a user id cannot be used as a token');
  r := r || pg_temp.t(public.shared_profile('') is null and public.shared_profile(null) is null and public.shared_profile(repeat('Z', 64)) is null, 'malformed input returns null');
  reset role;

  -- revoke, expiry
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.profile_share_links set revoked_at = now() where id = lid;
  reset role;
  set local role service_role;
  r := r || pg_temp.t(public.shared_profile(h1) is null, 'a revoked link returns null at once');
  reset role;
  update public.profile_share_links set expires_at = now() - interval '1 second', created_at = now() - interval '2 days' where token_hash = h2;
  set local role service_role;
  r := r || pg_temp.t(public.shared_profile(h2) is null, 'an expired link returns null');
  r := r || pg_temp.t(public.shared_profile(h1) is not distinct from public.shared_profile(h2) and public.shared_profile(h1) is not distinct from public.shared_profile(encode(sha256('x'::bytea), 'hex')), 'revoked, expired and unknown links are indistinguishable (all null)');
  reset role;

  -- link limit: 20 active
  perform set_config('request.jwt.claims', json_build_object('sub', ud, 'role', 'authenticated')::text, true);
  set local role authenticated;
  for n in 1..20 loop
    insert into public.profile_share_links (profile_id, token_hash, fields) values (ud, encode(sha256(('lim' || n)::bytea), 'hex'), nonef);
  end loop;
  begin insert into public.profile_share_links (profile_id, token_hash, fields) values (ud, encode(sha256('lim21'::bytea), 'hex'), nonef);
    r := array_append(r, ('FAIL a 21st active link was allowed')::text);
  exception when others then r := r || pg_temp.t(sqlerrm = 'share_link_limit', 'the 21st active link is refused'); end;
  reset role;

  -- ---- 6. Public directory (opt in only)
  set local role service_role;
  r := r || pg_temp.t(public.directory_profile('ace_hello') is null, 'a private profile is not in the directory');
  r := r || pg_temp.t(public.directory_profile('ace_hello') is not distinct from public.directory_profile('no_such_handle'), 'a private profile and an unknown handle give the same answer (null)');
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.profiles set search_indexable = true where id = ua; -- not allowed while unlisted: trigger clears it
  select search_indexable into b from public.profiles where id = ua; r := r || pg_temp.t(b = false, 'search indexing cannot be on while not in the directory');
  update public.profiles set directory_listed = true, public_fields = '{"display_name":true,"avatar":false,"bio":false,"team":false,"stats":false,"rank_role":true}' where id = ua;
  update public.profiles set search_indexable = true where id = ua;
  select search_indexable into b from public.profiles where id = ua; r := r || pg_temp.t(b = true, 'search indexing can be on once in the directory');
  reset role;
  set local role service_role;
  j := public.directory_profile('ace_hello');
  r := r || pg_temp.t(j ->> 'handle' = 'ace_hello' and j ->> 'display_name' = 'Ace A' and (j ->> 'search_indexable')::boolean, 'a listed profile is returned with its enabled fields');
  r := r || pg_temp.t(j ->> 'bio' is null and j ->> 'avatar_url' is null and j ->> 'team_name' is null, 'directory fields that were not enabled are absent');
  r := r || pg_temp.t(public.directory_profile('  ACE_HELLO ') is not null, 'directory lookup ignores case and spaces');
  r := r || pg_temp.t((select count(*) from public.sitemap_directory_profiles()) = 1 and public.sitemap_directory_count() = 1, 'the sitemap lists only directory profiles that opted into search');
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.profiles set directory_listed = false where id = ua;
  select search_indexable into b from public.profiles where id = ua; r := r || pg_temp.t(b = false, 'leaving the directory also turns off search indexing');
  reset role;
  set local role service_role;
  r := r || pg_temp.t(public.directory_profile('ace_hello') is null and public.sitemap_directory_count() = 0, 'leaving the directory takes effect at once (profile and sitemap)');
  reset role;

  -- ---- 7. Leaderboards (opt in only, handle only unless the name is allowed)
  set local role service_role;
  r := r || pg_temp.t(public.board_player_count('VALORANT') = 0 and (select count(*) = 0 from public.board_entries('VALORANT', 'acs')), 'with nobody opted in, the board and the count are empty');
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ud, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.profiles set show_on_leaderboards = true where id = ud;
  reset role;
  set local role service_role;
  r := r || pg_temp.t(public.board_player_count('VALORANT') = 1, 'only the opted in player is counted');
  r := r || pg_temp.t((select count(*) = 1 and bool_and(handle = 'dee_d' and display_name is null and role is null and rank is null) from public.board_entries('VALORANT', 'acs')), 'the board shows the handle only until name and role are allowed');
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ud, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.profiles set public_fields = '{"display_name":true,"avatar":false,"bio":false,"team":false,"stats":false,"rank_role":true}' where id = ud;
  reset role;
  set local role service_role;
  r := r || pg_temp.t((select bool_and(display_name = 'Dee D' and role = 'Controller') from public.board_entries('VALORANT', 'acs')), 'allowed name and role then appear on the board');
  reset role;

  -- ---- 8. Handle availability: one answer
  set local role service_role;
  r := r || pg_temp.t(public.handle_available('free_name') = true, 'a free handle is available');
  r := r || pg_temp.t(public.handle_available('ACE_HELLO') = false, 'a taken handle is unavailable (case insensitive)');
  r := r || pg_temp.t(public.handle_available('admin') = false and public.handle_available('leaderboard') = false, 'reserved handles are unavailable');
  r := r || pg_temp.t(public.handle_available('p0123456789ab') = false, 'placeholder pattern handles are unavailable');
  r := r || pg_temp.t(public.handle_available('ab') = false and public.handle_available('has space') = false, 'invalid handles are unavailable');
  reset role;

  -- ---- 9. Existing flows still work for a signed in player
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := r || pg_temp.t(public.claim_handle('cee_c') = 'ok', 'claim_handle works');
  insert into public.player_games (profile_id, game, role, rank) values (uc, 'CS2', 'Entry', 'Gold Nova');
  insert into public.stat_entries (profile_id, game, season, metrics) values (uc, 'CS2', 'S1', '{"adr":80,"matches":10}');
  r := r || pg_temp.t((select count(*) = 1 from public.stat_entries), 'a player can still add and read their own stats');
  r := r || pg_temp.t((public.create_team('C Team') ->> 'status') = 'ok', 'create_team works');
  r := r || pg_temp.t((select count(*) = 1 from public.team_roster()), 'the new team roster has its owner');
  reset role;

  -- ---- 10. Function privilege audit: nothing new is open to PUBLIC, anon or authenticated by accident
  r := r || pg_temp.t(not exists (
      select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
      where s.nspname = 'public' and p.proname in ('shared_profile','directory_profile','board_entries','board_player_count','sitemap_directory_profiles','sitemap_directory_count','handle_available','profile_payload')
        and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
    ), 'no server only function is executable by anon or authenticated');
  r := r || pg_temp.t(not exists (
      select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
      where s.nspname = 'public' and p.proname in ('shared_profile','directory_profile','board_entries','board_player_count','sitemap_directory_profiles','sitemap_directory_count','handle_available')
        and not has_function_privilege('service_role', p.oid, 'execute')
    ), 'every server only function is executable by service_role');
  r := r || pg_temp.t(not exists (
      select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace, lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      where s.nspname = 'public' and a.grantee = 0 and p.proname in ('shared_profile','directory_profile','board_entries','board_player_count','sitemap_directory_profiles','sitemap_directory_count','handle_available','profile_payload','team_roster','handle_new_user','share_links_limit','profiles_privacy_consistency')
    ), 'PUBLIC has no execute on any new function');

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
