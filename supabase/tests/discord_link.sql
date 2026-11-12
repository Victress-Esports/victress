-- Discord account linking checks (after all migrations through 20261112000200). Rolls itself back; results are in the error message.
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();   -- consenting player
  ub uuid := gen_random_uuid();   -- consenting player
  uc uuid := gen_random_uuid();   -- player who has not accepted anything
  ud uuid := gen_random_uuid();   -- consenting player with no link yet
  da text := '111111111111111111';
  db text := '222222222222222222';
  dc text := '333333333333333333';
  h1 text := repeat('a', 64); h2 text := repeat('b', 64); h3 text := repeat('c', 64); h4 text := repeat('d', 64); h5 text := repeat('e', 64); h6 text := repeat('f', 64);
  res text; j jsonb; n int;
begin
  insert into auth.users (id, aud, role, email) values (ua, 'authenticated', 'authenticated', 'a@t.invalid'), (ub, 'authenticated', 'authenticated', 'b@t.invalid'), (uc, 'authenticated', 'authenticated', 'c@t.invalid'), (ud, 'authenticated', 'authenticated', 'd@t.invalid');
  insert into public.age_confirmations (profile_id, birth_date) values (ua, date '2000-01-01'), (ub, date '2000-01-01'), (uc, date '2000-01-01'), (ud, date '2000-01-01');
  insert into public.legal_acceptances (profile_id, document, version) values (ua, 'terms', '2026-11-10'), (ua, 'privacy', '2026-11-12'), (ub, 'terms', '2026-11-10'), (ub, 'privacy', '2026-11-12'), (ud, 'terms', '2026-11-10'), (ud, 'privacy', '2026-11-12');

  -- nobody anonymous can do anything
  set local role anon;
  begin perform 1 from public.discord_links; r := array_append(r, 'FAIL anon reads links'); exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read links'); end;
  begin perform 1 from public.discord_link_codes; r := array_append(r, 'FAIL anon reads codes'); exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read codes'); end;
  begin perform public.discord_create_link_code(da, h1, 'x'); r := array_append(r, 'FAIL anon created a code'); exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot create a code'); end;
  begin perform public.discord_complete_link(h1, '2026-11-12'); r := array_append(r, 'FAIL anon completed a link'); exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot complete a link'); end;
  reset role;

  -- a signed in player cannot create codes, read codes, or write links
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.discord_create_link_code(da, h1, 'x'); r := array_append(r, 'FAIL player created a code'); exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot create a code for any Discord id'); end;
  begin perform 1 from public.discord_link_codes; r := array_append(r, 'FAIL player reads codes'); exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot read codes'); end;
  begin insert into public.discord_links (profile_id, discord_user_id, consent_version) values (ua, da, '2026-11-12'); r := array_append(r, 'FAIL player inserted a link'); exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot insert a link directly'); end;
  begin perform public.discord_unlink(da); r := array_append(r, 'FAIL player called unlink'); exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot call the Discord side unlink'); end;
  reset role;

  -- the Discord side creates codes
  set local role service_role;
  res := public.discord_create_link_code(da, h1, 'Alice'); r := array_append(r, case when res = 'ok' then 'PASS the Discord side creates a code' else 'FAIL create: ' || res end);
  res := public.discord_create_link_code('bad', h2, 'x'); r := array_append(r, case when res = 'invalid' then 'PASS a malformed Discord id is refused' else 'FAIL ' || res end);
  res := public.discord_create_link_code(da, 'nothash', 'x'); r := array_append(r, case when res = 'invalid' then 'PASS a malformed code hash is refused' else 'FAIL ' || res end);
  res := public.discord_create_link_code(da, h2, 'Alice again'); r := array_append(r, case when res = 'ok' then 'PASS a new code replaces the open one' else 'FAIL replace: ' || res end);
  reset role;
  select count(*) into n from public.discord_link_codes where discord_user_id = da and used_at is null; r := array_append(r, case when n = 1 then 'PASS only one code is open per Discord account' else 'FAIL open codes: ' || n end);

  -- the replaced code no longer works; the new one does only for a player who consented
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  res := public.discord_complete_link(h1, '2026-11-12'); r := array_append(r, case when res = 'invalid' then 'PASS a replaced code is dead' else 'FAIL replaced: ' || res end);
  j := public.discord_link_preview(h2); r := array_append(r, case when j->>'status' = 'ok' and j->>'hint' = 'Alice again' then 'PASS the preview shows who asked for the link' else 'FAIL preview ' || j::text end);
  j := public.discord_link_preview(h6); r := array_append(r, case when j->>'status' = 'invalid' then 'PASS the preview of an unknown code reveals nothing' else 'FAIL ' || j::text end);
  res := public.discord_complete_link(h2, 'not a date'); r := array_append(r, case when res = 'invalid' then 'PASS a malformed consent version is refused' else 'FAIL ' || res end);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  res := public.discord_complete_link(h2, '2026-11-12'); r := array_append(r, case when res = 'consent_required' then 'PASS a player who has not accepted the Terms and Privacy Policy cannot link' else 'FAIL no consent: ' || res end);
  reset role;
  set local role authenticated;  -- no claims reset: previous claims remain; clear them
  reset role;
  perform set_config('request.jwt.claims', '', true);
  set local role authenticated;
  res := public.discord_complete_link(h2, '2026-11-12'); r := array_append(r, case when res = 'unauthorized' then 'PASS without a session nothing can be linked' else 'FAIL no session: ' || res end);
  reset role;

  -- a consenting player completes it
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  res := public.discord_complete_link(h2, '2026-11-12'); r := array_append(r, case when res = 'ok' then 'PASS the signed in player links' else 'FAIL link: ' || res end);
  res := public.discord_complete_link(h2, '2026-11-12'); r := array_append(r, case when res = 'invalid' then 'PASS a code works once' else 'FAIL reuse: ' || res end);
  select count(*) into n from public.discord_links; r := array_append(r, case when n = 1 then 'PASS the player reads their own link' else 'FAIL reads ' || n end);
  begin update public.discord_links set discord_user_id = dc; r := array_append(r, 'FAIL player edited a link'); exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot edit a link'); end;
  reset role;
  select count(*) into n from public.discord_link_codes where code_hash = h2 and display_hint is not null; r := array_append(r, case when n = 0 then 'PASS the display name is cleared once the code is used' else 'FAIL hint kept' end);

  -- one to one
  set local role service_role;
  res := public.discord_create_link_code(da, h3, 'x'); r := array_append(r, case when res = 'already_linked' then 'PASS a linked Discord account cannot start another link' else 'FAIL ' || res end);
  res := public.discord_create_link_code(db, h4, 'Bob'); reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  res := public.discord_complete_link(h4, '2026-11-12'); r := array_append(r, case when res = 'profile_has_link' then 'PASS one Discord account per Victress account' else 'FAIL second discord: ' || res end);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  res := public.discord_complete_link(h4, '2026-11-12'); r := array_append(r, case when res = 'ok' then 'PASS a different player links a different Discord account' else 'FAIL b link: ' || res end);
  select count(*) into n from public.discord_links; r := array_append(r, case when n = 1 then 'PASS a player sees only their own link' else 'FAIL sees ' || n end);
  reset role;
  -- a code for an already linked Discord id (created before it was linked) cannot steal it
  insert into public.discord_link_codes (code_hash, discord_user_id, display_hint, expires_at) values (h5, da, 'late', now() + interval '5 minutes');
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  res := public.discord_complete_link(h5, '2026-11-12'); r := array_append(r, case when res in ('profile_has_link', 'discord_taken') then 'PASS a Discord account linked elsewhere cannot be linked again' else 'FAIL steal: ' || res end);
  reset role;

  -- a fresh player cannot take a Discord account that is already linked to someone else
  perform set_config('request.jwt.claims', json_build_object('sub', ud, 'role', 'authenticated')::text, true);
  set local role authenticated;
  res := public.discord_complete_link(h5, '2026-11-12'); r := array_append(r, case when res = 'discord_taken' then 'PASS a Discord account linked to someone else is refused for another player' else 'FAIL taken: ' || res end);
  reset role;

  -- expiry
  insert into public.discord_link_codes (code_hash, discord_user_id, expires_at, created_at) values (h6, dc, now() - interval '1 minute', now() - interval '11 minutes');
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  j := public.discord_link_preview(h6); r := array_append(r, case when j->>'status' = 'expired' then 'PASS an expired code is reported expired' else 'FAIL ' || j::text end);
  reset role;
  begin insert into public.discord_link_codes (code_hash, discord_user_id, expires_at) values (repeat('1', 64), dc, now() + interval '2 hours'); r := array_append(r, 'FAIL long lived code');
  exception when check_violation then r := array_append(r, 'PASS a code cannot live longer than 30 minutes'); end;

  -- rate limit: 5 codes an hour per Discord account
  set local role service_role;
  for n in 1..5 loop res := public.discord_create_link_code('444444444444444444', repeat(to_hex(n), 64)::text, 'r'); end loop;
  res := public.discord_create_link_code('444444444444444444', repeat('9', 64), 'r'); r := array_append(r, case when res = 'rate_limited' then 'PASS more than 5 codes an hour is refused' else 'FAIL rate: ' || res end);

  -- unlinking from Discord
  res := case when public.discord_unlink(da) then 'yes' else 'no' end; r := array_append(r, case when res = 'yes' then 'PASS /unlink removes the link' else 'FAIL unlink' end);
  select count(*) into n from public.discord_links where discord_user_id = da; r := array_append(r, case when n = 0 then 'PASS the link is gone' else 'FAIL link remains' end);
  res := case when public.discord_unlink(da) then 'yes' else 'no' end; r := array_append(r, case when res = 'no' then 'PASS unlinking twice is harmless' else 'FAIL second unlink' end);
  reset role;
  -- unlinking changes nothing else about the player
  select count(*) into n from public.profiles where id = ua; r := array_append(r, case when n = 1 then 'PASS unlinking leaves the Victress account intact' else 'FAIL account affected' end);

  -- the player can unlink from the website too
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.discord_links; reset role;
  select count(*) into n from public.discord_links where profile_id = ub; r := array_append(r, case when n = 0 then 'PASS a player can unlink on the website' else 'FAIL web unlink' end);

  -- purge
  set local role service_role;
  n := public.purge_discord_link_codes(); r := array_append(r, 'PASS the purge runs (' || n || ' old codes)');
  reset role;

  -- linking grants no sharing: no sharing or visibility column exists on the link; profile privacy rows are untouched
  select count(*) into n from information_schema.columns where table_schema = 'public' and table_name = 'discord_links' and column_name not in ('profile_id', 'discord_user_id', 'linked_at', 'consent_version');
  r := array_append(r, case when n = 0 then 'PASS the link carries no sharing or visibility field' else 'FAIL extra columns' end);

  -- account deletion removes the link and its codes
  insert into public.discord_links (profile_id, discord_user_id, consent_version) values (ua, '555555555555555555', '2026-11-12');
  delete from public.profiles where id = ua;
  select count(*) into n from public.discord_links where profile_id = ua; r := array_append(r, case when n = 0 then 'PASS account deletion removes the link' else 'FAIL link survived' end);

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
