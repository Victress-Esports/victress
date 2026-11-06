-- RLS / privilege test. Run in the Supabase SQL editor (or via execute_sql).
-- Everything happens inside one DO block that ends by raising an exception, so NOTHING is persisted.
-- Expected output (in the error message): every line says "good", "ok", or the stated expectation.
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  v text;
  n int;
  tid uuid;
begin
  insert into auth.users (id, aud, role, email) values
    (ua, 'authenticated', 'authenticated', 'a@test.invalid'),
    (ub, 'authenticated', 'authenticated', 'b@test.invalid');
  select count(*) into n from public.profiles where id in (ua, ub);
  r := array_append(r, format('trigger created %s profiles (expect 2)', n));

  insert into public.teams (name, slug, owner_id) values ('Test Team', 'test-team-x', ub) returning id into tid;

  -- anon
  set local role anon;
  begin select count(*) into n from public.profiles; r := array_append(r, format('anon read profiles: ok (%s rows)', n));
  exception when others then r := array_append(r, 'anon read profiles: FAIL ' || sqlerrm); end;
  begin select invite_code into v from public.teams limit 1; r := array_append(r, 'anon read invite_code: LEAK');
  exception when insufficient_privilege then r := array_append(r, 'anon read invite_code: blocked (good)'); end;
  begin select count(*) into n from public.waitlist; r := array_append(r, 'anon read waitlist: LEAK');
  exception when insufficient_privilege then r := array_append(r, 'anon read waitlist: blocked (good)'); end;
  begin select public.claim_handle('hacker') into v; r := array_append(r, 'anon claim_handle: LEAK ' || v);
  exception when insufficient_privilege then r := array_append(r, 'anon claim_handle: blocked (good)'); end;
  begin insert into public.stat_entries (profile_id, game, season, metrics) values (ua, 'VALORANT', 's1', '{}');
    r := array_append(r, 'anon insert stats: LEAK');
  exception when insufficient_privilege then r := array_append(r, 'anon insert stats: blocked (good)'); end;
  reset role;

  -- user A
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, 'A claim admin -> ' || public.claim_handle('admin'));            -- reserved
  r := array_append(r, 'A claim ab -> ' || public.claim_handle('ab'));                  -- invalid
  r := array_append(r, 'A claim fuck_me -> ' || public.claim_handle('fuck_me'));        -- reserved (blocked term)
  r := array_append(r, 'A claim Sample_Ace -> ' || public.claim_handle('Sample_Ace'));  -- ok
  begin update public.profiles set handle = 'direct_edit' where id = ua; r := array_append(r, 'A direct handle update: LEAK');
  exception when insufficient_privilege then r := array_append(r, 'A direct handle update: blocked (good)'); end;
  update public.profiles set display_name = 'Ace', game = 'VALORANT', role = 'Duelist', rank = 'Gold' where id = ua;
  get diagnostics n = row_count; r := array_append(r, format('A edit own profile: %s row (expect 1)', n));
  update public.profiles set display_name = 'pwned' where id = ub;
  get diagnostics n = row_count; r := array_append(r, format('A edit B profile: %s rows (expect 0)', n));
  begin update public.profiles set team_id = tid where id = ua; r := array_append(r, 'A spoof team_id: LEAK');
  exception when others then r := array_append(r, 'A spoof team_id: blocked (good)'); end;
  insert into public.stat_entries (profile_id, game, season, metrics) values (ua, 'VALORANT', 'S1', '{"kd":1.2}');
  r := array_append(r, 'A insert own stat: ok');
  begin insert into public.stat_entries (profile_id, game, season, metrics) values (ub, 'VALORANT', 'S1', '{"kd":9}');
    r := array_append(r, 'A insert stat for B: LEAK');
  exception when others then r := array_append(r, 'A insert stat for B: blocked (good)'); end;
  begin select invite_code into v from public.teams limit 1; r := array_append(r, 'A read invite_code: LEAK');
  exception when insufficient_privilege then r := array_append(r, 'A read invite_code: blocked (good)'); end;
  select count(*) into n from public.team_members;
  r := array_append(r, format('A sees %s team_members (expect 0)', n));
  reset role;

  -- user B
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, 'B claim sample_ace -> ' || public.claim_handle('sample_ace'));  -- taken
  r := array_append(r, 'B claim other_name -> ' || public.claim_handle('other_name'));  -- ok
  reset role;

  select count(*) into n from public.public_profiles where handle = 'sample_ace' and team_name is null;
  r := array_append(r, format('public_profiles row for sample_ace: %s (expect 1)', n));

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
