-- Upload allowlist checks (after all migrations through 20261107000310). Rolls itself back; results are in the error message.
-- Proves that a signed in user who is not on the design partner allowlist cannot upload or record a file, including by
-- calling Storage directly, and that clients can never write scrim_uploads (so never size_bytes).
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid(); -- approved design partner
  ub uuid := gen_random_uuid(); -- signed in, NOT on the allowlist
  n int; i int; ok boolean;
begin
  insert into auth.users (id, aud, role, email) values
    (ua, 'authenticated', 'authenticated', 'a@test.invalid'), (ub, 'authenticated', 'authenticated', 'b@test.invalid');
  -- service_role adds A to the allowlist
  set local role service_role;
  insert into public.design_partner_allowlist (profile_id, note) values (ua, 'test partner');
  reset role;

  -- the allowlist itself: nobody but service_role
  set local role anon;
  begin perform 1 from public.design_partner_allowlist; r := array_append(r, ('FAIL anon reads the allowlist')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot read the allowlist')::text); end;
  begin perform public.upload_allowed(); r := array_append(r, ('FAIL anon can call upload_allowed')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS anon cannot call upload_allowed')::text); end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform 1 from public.design_partner_allowlist; r := array_append(r, ('FAIL a user reads the allowlist')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS a signed in user cannot read the allowlist')::text); end;
  begin insert into public.design_partner_allowlist (profile_id) values (ub); r := array_append(r, ('FAIL a user added themselves to the allowlist')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS a user cannot add themselves to the allowlist')::text); end;
  begin delete from public.design_partner_allowlist; r := array_append(r, ('FAIL a user can delete from the allowlist')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS a user cannot change the allowlist')::text); end;
  r := array_append(r, (case when public.upload_allowed() = false then 'PASS upload_allowed is false for a user not on the list' else 'FAIL upload_allowed true for non partner' end)::text);

  -- NOT on the allowlist: Storage directly into their own folder is refused
  begin insert into storage.objects (bucket_id, name) values ('scrim-uploads', ub || '/direct.dem'); r := array_append(r, ('FAIL a non partner stored a file directly in Storage')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS a non partner cannot store a file directly in Storage')::text); end;
  begin insert into storage.objects (bucket_id, name) values ('scrim-uploads', ua || '/evil.dem'); r := array_append(r, ('FAIL stored in another user''s folder')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS cannot store in another user''s folder')::text); end;
  -- NOT on the allowlist: recording an upload row is refused (no client write path exists)
  begin insert into public.scrim_uploads (profile_id, game, storage_path, original_name, size_bytes) values (ub, 'CS2', ub || '/direct.dem', 'direct.dem', 10);
    r := array_append(r, ('FAIL a non partner recorded an upload')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS a non partner cannot record an upload')::text); end;
  reset role;

  -- ON the allowlist
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, (case when public.upload_allowed() then 'PASS upload_allowed is true for an approved partner' else 'FAIL upload_allowed false for partner' end)::text);
  begin insert into storage.objects (bucket_id, name) values ('scrim-uploads', ua || '/ok.dem'); r := array_append(r, ('PASS an approved partner can store a file in their own folder')::text);
  exception when others then r := array_append(r, ('FAIL approved partner storing in own folder: ' || sqlerrm)::text); end;
  begin insert into storage.objects (bucket_id, name) values ('scrim-uploads', ub || '/evil.dem'); r := array_append(r, ('FAIL a partner stored in another folder')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS an approved partner still cannot store in another folder')::text); end;
  begin insert into public.scrim_uploads (profile_id, game, storage_path, original_name, size_bytes) values (ua, 'CS2', ua || '/ok.dem', 'ok.dem', 1);
    r := array_append(r, ('FAIL an approved partner wrote scrim_uploads (and size_bytes) directly')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS an approved partner cannot write scrim_uploads or size_bytes directly')::text); end;
  reset role;

  -- the server records uploads with the service role; the table rules still hold
  set local role service_role;
  insert into public.scrim_uploads (profile_id, game, storage_path, original_name, size_bytes) values (ua, 'CS2', ua || '/ok.dem', 'ok.dem', 2048);
  select count(*) into n from public.scrim_uploads where profile_id = ua;
  r := array_append(r, (case when n = 1 then 'PASS the service role records an upload' else 'FAIL service role insert' end)::text);
  begin insert into public.scrim_uploads (profile_id, game, storage_path, original_name, size_bytes) values (ua, 'CS2', ub || '/x.dem', 'x.dem', 10); r := array_append(r, ('FAIL path in another folder accepted')::text);
  exception when check_violation then r := array_append(r, ('PASS an upload path must be in the owner''s folder')::text); end;
  begin insert into public.scrim_uploads (profile_id, game, storage_path, original_name, size_bytes) values (ua, 'CS2', ua || '/big.dem', 'big.dem', 209715201); r := array_append(r, ('FAIL oversize accepted')::text);
  exception when check_violation then r := array_append(r, ('PASS oversize upload refused')::text); end;
  begin insert into public.scrim_uploads (profile_id, game, storage_path, original_name, size_bytes, status) values (ua, 'CS2', ua || '/s.dem', 's.dem', 10, 'parsed'); r := array_append(r, ('FAIL a status other than stored accepted')::text);
  exception when check_violation then r := array_append(r, ('PASS the only status is stored')::text); end;
  begin
    for i in 1..30 loop insert into public.scrim_uploads (profile_id, game, storage_path, original_name, size_bytes) values (ua, 'CS2', ua || '/c' || i || '.dem', 'c.dem', 10); end loop;
    r := array_append(r, ('FAIL upload cap not enforced')::text);
  exception when sqlstate 'P0001' then r := array_append(r, ('PASS upload cap enforced')::text); end;
  reset role;

  -- removed from the allowlist: cannot upload again, but can still delete what they stored
  set local role service_role;
  delete from public.design_partner_allowlist where profile_id = ua;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into storage.objects (bucket_id, name) values ('scrim-uploads', ua || '/again.dem'); r := array_append(r, ('FAIL removed partner can still upload')::text);
  exception when insufficient_privilege then r := array_append(r, ('PASS a partner removed from the allowlist can no longer upload')::text); end;
  delete from storage.objects where bucket_id = 'scrim-uploads' and name = ua || '/ok.dem'; get diagnostics n = row_count;
  r := array_append(r, (case when n = 1 then 'PASS a removed partner can still delete their own file' else 'FAIL removed partner could not delete' end)::text);
  delete from public.scrim_uploads; get diagnostics n = row_count;
  r := array_append(r, (case when n >= 1 then 'PASS a removed partner can still delete their upload records' else 'FAIL removed partner could not delete records' end)::text);
  reset role;

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
