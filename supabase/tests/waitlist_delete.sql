-- Waitlist delete grant checks (after all migrations through 20261110000200). Rolls itself back; results are in the error message.
do $$
declare
  r text[] := '{}';
  n int;
begin
  insert into public.waitlist (email, interest) values ('gone@test.invalid', 'pro'), ('gone@test.invalid', 'team'), ('stay@test.invalid', 'pro');

  set local role service_role;
  delete from public.waitlist where email = 'gone@test.invalid';
  get diagnostics n = row_count;
  r := array_append(r, case when n = 2 then 'PASS the service role removes every signup for an email' else 'FAIL deleted ' || n end);
  select count(*) into n from public.waitlist where email = 'stay@test.invalid';
  r := array_append(r, case when n = 1 then 'PASS another email is untouched' else 'FAIL collateral' end);
  reset role;

  set local role authenticated;
  begin delete from public.waitlist; r := array_append(r, 'FAIL authenticated can delete');
  exception when insufficient_privilege then r := array_append(r, 'PASS authenticated has no access to the waitlist'); end;
  reset role;
  set local role anon;
  begin perform 1 from public.waitlist; r := array_append(r, 'FAIL anon can read');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon has no access to the waitlist'); end;
  reset role;

  raise exception E'\n%', array_to_string(r, E'\n');
end $$;
