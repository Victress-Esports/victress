-- Scrim match log checks (after all migrations through 20261107000400). Rolls itself back; results are in the error message.
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  n int; i int;
begin
  insert into auth.users (id, aud, role, email) values
    (ua, 'authenticated', 'authenticated', 'a@test.invalid'), (ub, 'authenticated', 'authenticated', 'b@test.invalid');

  set local role anon;
  begin perform 1 from public.scrim_matches; r := array_append(r, ('FAIL anon reads matches')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot read matches')::text); end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.scrim_matches (profile_id, game, played_on, opponent, result, score, map) values (ua, 'VALORANT', current_date, 'Mock Rivals', 'win', '13-9', 'Ascent');
  select count(*) into n from public.scrim_matches; r := array_append(r, (case when n = 1 then 'PASS owner reads own match' else 'FAIL owner match count ' || n end)::text);
  select count(*) into n from public.scrim_matches where source = 'manual'; r := array_append(r, (case when n = 1 then 'PASS entries are Self-reported (manual)' else 'FAIL source' end)::text);

  begin insert into public.scrim_matches (profile_id, game, played_on, result) values (ua, 'VALORANT', current_date, 'won'); r := array_append(r, ('FAIL bad result accepted')::text);
  exception when check_violation then r := array_append(r, ('PASS result must be win, loss or draw')::text); end;
  begin insert into public.scrim_matches (profile_id, game, played_on, result, score) values (ua, 'VALORANT', current_date, 'win', '<script>'); r := array_append(r, ('FAIL free text score accepted')::text);
  exception when check_violation then r := array_append(r, ('PASS score must look like 13-9')::text); end;
  begin insert into public.scrim_matches (profile_id, game, played_on, result) values (ua, 'VALORANT', current_date + 30, 'win'); r := array_append(r, ('FAIL far future date accepted')::text);
  exception when check_violation then r := array_append(r, ('PASS future dates refused')::text); end;
  begin insert into public.scrim_matches (profile_id, game, played_on, result, opponent) values (ua, 'VALORANT', current_date, 'win', repeat('x', 61)); r := array_append(r, ('FAIL long opponent accepted')::text);
  exception when check_violation then r := array_append(r, ('PASS opponent limited to 60 characters')::text); end;
  begin insert into public.scrim_matches (profile_id, game, played_on, result, source) values (ua, 'VALORANT', current_date, 'win', 'demo_parsed'); r := array_append(r, ('FAIL client set a source')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS a user cannot set the source column')::text); end;
  begin insert into public.scrim_matches (profile_id, game, played_on, result) values (ub, 'CS2', current_date, 'win'); r := array_append(r, ('FAIL wrote a row for another user')::text);
  exception when insufficient_privilege or check_violation then r := array_append(r, ('PASS cannot write a row for another user')::text); end;
  begin
    for i in 1..501 loop insert into public.scrim_matches (profile_id, game, played_on, result) values (ua, 'CS2', current_date, 'draw'); end loop;
    r := array_append(r, ('FAIL match cap not enforced')::text);
  exception when sqlstate 'P0001' then r := array_append(r, ('PASS match cap enforced (500)')::text); end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.scrim_matches; r := array_append(r, (case when n = 0 then 'PASS stranger sees no matches' else 'FAIL stranger sees matches' end)::text);
  delete from public.scrim_matches; get diagnostics n = row_count;
  r := array_append(r, (case when n = 0 then 'PASS stranger cannot delete matches' else 'FAIL stranger deleted matches' end)::text);
  reset role;

  -- the other dashboard caps still work after the function was replaced
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    for i in 1..21 loop insert into public.highlights (profile_id, game, title, url) values (ua, 'CS2', 't', 'https://example.com/x'); end loop;
    r := array_append(r, ('FAIL highlight cap lost')::text);
  exception when sqlstate 'P0001' then r := array_append(r, ('PASS highlight cap (20) still enforced')::text); end;
  reset role;

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
