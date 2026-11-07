-- Dashboard foundation checks (after expand, contract and 20261107000300). Rolls itself back; results are in the error message.
create function pg_temp.t(ok boolean, name text) returns text language sql as
$$ select case when coalesce(ok, false) then 'PASS ' else 'FAIL ' end || name $$;

do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  n int; i int;
begin
  insert into auth.users (id, aud, role, email) values
    (ua, 'authenticated', 'authenticated', 'a@test.invalid'), (ub, 'authenticated', 'authenticated', 'b@test.invalid');

  -- anonymous: nothing
  set local role anon;
  begin perform 1 from public.tournament_entries; r := array_append(r, ('FAIL anon reads tournaments')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot read tournaments')::text); end;
  begin perform 1 from public.highlights; r := array_append(r, ('FAIL anon reads highlights')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot read highlights')::text); end;
  begin perform 1 from public.scrim_uploads; r := array_append(r, ('FAIL anon reads uploads')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot read uploads')::text); end;
  reset role;

  -- owner A writes
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.tournament_entries (profile_id, game, name, placement) values (ua, 'VALORANT', 'Spring Open', '3rd');
  insert into public.highlights (profile_id, game, title, url) values (ua, 'VALORANT', 'Ace', 'https://example.com/clip');
  insert into public.scrim_uploads (profile_id, game, storage_path, original_name, size_bytes) values (ua, 'CS2', ua || '/f1.dem', 'f1.dem', 1000);
  select count(*) into n from public.tournament_entries; r := array_append(r, (case when n = 1 then 'PASS owner reads own tournament' else 'FAIL owner tournament count ' || n end)::text);

  -- validation
  begin insert into public.highlights (profile_id, game, title, url) values (ua, 'VALORANT', 'x', 'http://insecure.example/a'); r := array_append(r, ('FAIL http highlight accepted')::text);
  exception when check_violation then r := array_append(r, ('PASS highlight must be https')::text); end;
  begin insert into public.highlights (profile_id, game, title, url) values (ua, 'VALORANT', 'x', 'javascript:alert(1)'); r := array_append(r, ('FAIL javascript url accepted')::text);
  exception when check_violation then r := array_append(r, ('PASS javascript url refused')::text); end;
  begin insert into public.scrim_uploads (profile_id, game, storage_path, original_name, size_bytes) values (ua, 'CS2', ub || '/x.dem', 'x.dem', 10); r := array_append(r, ('FAIL upload path in another folder accepted')::text);
  exception when check_violation then r := array_append(r, ('PASS upload path must be in own folder')::text); end;
  begin insert into public.scrim_uploads (profile_id, game, storage_path, original_name, size_bytes) values (ua, 'CS2', ua || '/big.dem', 'big.dem', 209715201); r := array_append(r, ('FAIL oversize accepted')::text);
  exception when check_violation then r := array_append(r, ('PASS oversize upload refused')::text); end;
  begin insert into public.scrim_uploads (profile_id, game, storage_path, original_name, size_bytes, status) values (ua, 'CS2', ua || '/s.dem', 's.dem', 10, 'parsed'); r := array_append(r, ('FAIL client set a status')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS a user cannot set upload status')::text); end;

  -- cannot write as someone else
  begin insert into public.tournament_entries (profile_id, game, name) values (ub, 'CS2', 'Spoof'); r := array_append(r, ('FAIL wrote a row for another user')::text);
  exception when insufficient_privilege or check_violation then r := array_append(r, ('PASS cannot write a row for another user')::text); end;

  -- caps
  begin
    for i in 1..30 loop insert into public.scrim_uploads (profile_id, game, storage_path, original_name, size_bytes) values (ua, 'CS2', ua || '/c' || i || '.dem', 'c.dem', 10); end loop;
    r := array_append(r, ('FAIL upload cap not enforced')::text);
  exception when sqlstate 'P0001' then r := array_append(r, ('PASS upload cap enforced')::text); end;
  reset role;

  -- stranger B sees nothing of A's
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.tournament_entries; r := array_append(r, (case when n = 0 then 'PASS stranger sees no tournaments' else 'FAIL stranger sees tournaments' end)::text);
  select count(*) into n from public.highlights; r := array_append(r, (case when n = 0 then 'PASS stranger sees no highlights' else 'FAIL stranger sees highlights' end)::text);
  select count(*) into n from public.scrim_uploads; r := array_append(r, (case when n = 0 then 'PASS stranger sees no uploads' else 'FAIL stranger sees uploads' end)::text);
  delete from public.scrim_uploads; get diagnostics n = row_count;
  r := array_append(r, (case when n = 0 then 'PASS stranger cannot delete uploads' else 'FAIL stranger deleted uploads' end)::text);
  reset role;

  -- storage: private bucket, own folder only
  select count(*) into n from storage.buckets where id = 'scrim-uploads' and not public;
  r := array_append(r, (case when n = 1 then 'PASS scrim bucket exists and is private' else 'FAIL scrim bucket' end)::text);
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into storage.objects (bucket_id, name) values ('scrim-uploads', ua || '/ok.dem'); r := array_append(r, ('PASS owner can store in own folder')::text);
  exception when others then r := array_append(r, ('FAIL owner storing in own folder: ' || sqlerrm)::text); end;
  begin insert into storage.objects (bucket_id, name) values ('scrim-uploads', ub || '/evil.dem'); r := array_append(r, ('FAIL stored in another folder')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS cannot store in another folder')::text); end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from storage.objects where bucket_id = 'scrim-uploads';
  r := array_append(r, (case when n = 0 then 'PASS stranger cannot list another user''s files' else 'FAIL stranger lists files' end)::text);
  reset role;
  set local role anon;
  select count(*) into n from storage.objects where bucket_id = 'scrim-uploads';
  r := array_append(r, (case when n = 0 then 'PASS anon cannot list scrim files' else 'FAIL anon lists scrim files' end)::text);
  reset role;

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
