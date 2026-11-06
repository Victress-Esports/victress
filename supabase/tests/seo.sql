-- Search visibility and sitemap behavior test. Run in the Supabase SQL editor (or via execute_sql).
-- One DO block that ends by raising an exception, so NOTHING is persisted. Each line should match its "(expect ...)" note.
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); ud uuid := gen_random_uuid();
  v text; n int; b boolean; old_ts timestamptz := now() - interval '10 days'; t1 timestamptz;
begin
  insert into auth.users (id, aud, role, email) values
    (ua, 'authenticated', 'authenticated', 'a@t.invalid'), (ub, 'authenticated', 'authenticated', 'b@t.invalid'),
    (uc, 'authenticated', 'authenticated', 'c@t.invalid'), (ud, 'authenticated', 'authenticated', 'd@t.invalid');
  update public.profiles set handle = 'seo_alpha', created_at = now() - interval '3 days' where id = ua;
  update public.profiles set handle = 'seo_bravo', created_at = now() - interval '2 days' where id = ub;
  update public.profiles set handle = 'demo_seo', is_demo = true where id = uc;
  -- D keeps its signup placeholder handle (never onboarded)

  select search_indexable into b from public.profiles where id = ua;
  r := array_append(r, 'default for a new profile: ' || b::text || ' (expect false)');

  set local role anon;
  r := array_append(r, 'sitemap count by default (anon): ' || public.sitemap_profile_count() || ' (expect 0)');
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.profiles set search_indexable = true where id = ua;
  get diagnostics n = row_count; r := array_append(r, 'A turns it on: ' || n || ' row (expect 1)');
  update public.profiles set search_indexable = true where id = ub;
  get diagnostics n = row_count; r := array_append(r, 'A tries to turn it on for B: ' || n || ' rows (expect 0)');
  begin update public.profiles set is_demo = false where id = ua; r := array_append(r, 'A edits is_demo: LEAK');
  exception when insufficient_privilege then r := array_append(r, 'A cannot edit is_demo: blocked (good)'); end;
  reset role;

  -- demo + placeholder profiles flagged indexable must still never be listed
  update public.profiles set search_indexable = true where id in (uc, ud);

  set local role anon;
  select string_agg(handle, ',' order by handle) into v from public.sitemap_profiles(50, 0);
  r := array_append(r, 'sitemap (anon): ' || coalesce(v, 'none') || ' (expect seo_alpha only)');
  r := array_append(r, 'sitemap count: ' || public.sitemap_profile_count() || ' (expect 1)');
  select search_indexable into b from public.public_profiles where handle = 'seo_alpha';
  r := array_append(r, 'anon reads the flag via public_profiles for A: ' || b::text || ' (expect true)');
  select search_indexable into b from public.public_profiles where handle = 'seo_bravo';
  r := array_append(r, 'anon reads the flag via public_profiles for B: ' || b::text || ' (expect false; B is still viewable)');
  begin update public.profiles set search_indexable = true where id = ub; get diagnostics n = row_count;
    r := array_append(r, 'anon update: ' || n || ' rows (expect 0 or blocked)');
  exception when insufficient_privilege then r := array_append(r, 'anon cannot update search_indexable: blocked (good)'); end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.profiles set search_indexable = true where id = ub;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.profiles set search_indexable = false where id = ua;
  reset role;
  set local role anon;
  select string_agg(handle, ',' order by handle) into v from public.sitemap_profiles(50, 0);
  r := array_append(r, 'after B on / A off: ' || coalesce(v, 'none') || ' (expect seo_bravo)');
  reset role;

  -- now() is frozen inside one transaction, so backdate the timestamp (trigger off) before the toggle.
  alter table public.profiles disable trigger profiles_touch_updated_at;
  update public.profiles set updated_at = old_ts where id = ub;
  alter table public.profiles enable trigger profiles_touch_updated_at;
  update public.profiles set search_indexable = false where id = ub;
  select updated_at into t1 from public.profiles where id = ub;
  r := array_append(r, 'toggle moves updated_at: ' || (t1 > old_ts)::text);

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
