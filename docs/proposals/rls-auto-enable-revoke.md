# Proposal: revoke public execute on `public.rls_auto_enable()`

Status: **APPLIED to production on 2026-11-07** (founder authorization; migration `revoke_rls_auto_enable_public_execute`, version `20261107055545`; recount before: 0 profiles, 0 auth users, 0 teams). Raised in the design pass review (PR #3, now part of `main`) and still reported by the Supabase security advisor on 2026-11-07 (warnings 0028 and 0029). Result: identical to the dry run (see "Applied" below). The documented rollback is the grant in the "Exact rollback" section.

## What it is
`public.rls_auto_enable()` was not created by this repository's migrations. It matches Supabase's standard "enable row level security on new tables" helper (owner `postgres`, `SECURITY DEFINER`, `search_path = pg_catalog`, returns `event_trigger`). The event trigger `ensure_rls` (on `ddl_command_end` for `CREATE TABLE`, `CREATE TABLE AS`, `SELECT INTO`) runs it, and it enables row level security on tables created in `public`.

## Why revoke
Its ACL is `NULL`, which means the default: **PUBLIC can execute it**, so `anon` and `authenticated` can reach it through `/rest/v1/rpc/rls_auto_enable`. Risk is low (it can only turn row level security on, ignores arguments, and acts only on the DDL commands of the current event, of which there are none outside an event), but nothing needs the public API to call it, and the advisor flags it.

## What depends on it
Read only checks on production, 2026-11-07:
- One dependency: the event trigger `ensure_rls` (the pg_depend entry is of kind `n`, normal).
- No other function in `public` mentions it, and nothing in this repository references it.
- A revoke does not remove the event trigger. Event triggers are not subject to an execute check when they fire; the dry run below proves a new table still gets row level security after the revoke.

## Proposed change
```sql
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```
Effect (from the dry run): ACL becomes `{postgres=X/postgres}`; `anon`, `authenticated` and `service_role` can no longer execute it; the owner can.

## Dry run (run on production on 2026-11-07, rolled back)
One call: `begin;`, the revoke, a verification block that ends by raising an error (so the transaction aborts and rolls back), then `rollback;`.
```sql
begin;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
do $verify$
declare
  r text[] := '{}';
  rls boolean;
  sig regprocedure := 'public.rls_auto_enable()'::regprocedure;
begin
  r := array_append(r, format('ACL after the revoke: %s', (select coalesce(proacl::text, 'NULL') from pg_proc where oid = sig)));
  r := array_append(r, format('can execute after the revoke: public/anon=%s authenticated=%s service_role=%s postgres(owner)=%s',
    has_function_privilege('anon', sig, 'execute'), has_function_privilege('authenticated', sig, 'execute'),
    has_function_privilege('service_role', sig, 'execute'), has_function_privilege('postgres', sig, 'execute')));
  r := array_append(r, format('event trigger ensure_rls still present and enabled: %s',
    (select count(*) from pg_event_trigger where evtname = 'ensure_rls' and evtfoid = sig::oid and evtenabled = 'O')));
  create table public.rls_revoke_dryrun_probe (id int);
  select relrowsecurity into rls from pg_class where oid = 'public.rls_revoke_dryrun_probe'::regclass;
  r := array_append(r, format('new table created in public after the revoke has row level security on: %s', rls));
  set local role anon;
  begin perform public.rls_auto_enable(); r := array_append(r, 'FAIL anon can still call rls_auto_enable');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon gets permission denied calling rls_auto_enable');
            when others then r := array_append(r, 'anon call failed with: ' || sqlerrm); end;
  reset role;
  set local role authenticated;
  begin perform public.rls_auto_enable(); r := array_append(r, 'FAIL authenticated can still call rls_auto_enable');
  exception when insufficient_privilege then r := array_append(r, 'PASS authenticated gets permission denied calling rls_auto_enable');
            when others then r := array_append(r, 'authenticated call failed with: ' || sqlerrm); end;
  reset role;
  raise exception E'RLS_AUTO_ENABLE REVOKE DRY RUN REPORT. This error aborts the transaction, so nothing was kept.\n%', array_to_string(r, E'\n');
end $verify$;
rollback;
```
Result:
```
ACL after the revoke: {postgres=X/postgres}
can execute after the revoke: public/anon=f authenticated=f service_role=f postgres(owner)=t
event trigger ensure_rls still present and enabled: 1
new table created in public after the revoke has row level security on: t
PASS anon gets permission denied calling rls_auto_enable
PASS authenticated gets permission denied calling rls_auto_enable
```
Read only check afterwards: ACL back to `NULL`, anon can execute again, 0 leftover probe tables, the `ensure_rls` trigger present, 0 profiles, 0 auth users, 0 teams.

## Exact rollback
```sql
grant execute on function public.rls_auto_enable() to public;
```
This restores the same privileges as before (PUBLIC, and so anon and authenticated, can execute; the owner can). One cosmetic difference: PostgreSQL stores the result as `{postgres=X/postgres,=X/postgres}` instead of `NULL`. They mean the same thing; tested on a throwaway Postgres 16.

## Applied (2026-11-07)
- Statement run, exactly as proposed: `revoke execute on function public.rls_auto_enable() from public, anon, authenticated;`
- ACL after: `{postgres=X/postgres}`. `anon`, `authenticated` and `service_role` cannot execute it; the owner can. Same as the dry run.
- Event trigger `ensure_rls` still present and enabled, pointing at `rls_auto_enable`.
- Anonymous API check with the public key: `POST /rest/v1/rpc/rls_auto_enable` with an empty body returns 401 `permission denied for function rls_auto_enable`; with a body it returns 404 (no matching function signature). The intended public lookup `team_invite_info` still answers `null` for a bad code.
- Security advisor: `rls_auto_enable` is no longer listed under the anon (0028) or signed in (0029) warnings.
- Production data unchanged: 0 profiles, 0 auth users, 0 teams.
- **Documented rollback:** `grant execute on function public.rls_auto_enable() to public;` (see "Exact rollback"). Not applied.

## Apply procedure (as it was to be run)
1. Recount profiles and auth users (no data is touched, but the step is cheap and keeps the habit).
2. Run the revoke above (one statement).
3. Read only check: ACL is `{postgres=X/postgres}`; run the advisors and confirm warning 0028 no longer lists `rls_auto_enable` (and 0029 no longer lists it).
4. Create nothing; the dry run already proved new tables still get row level security. After the next real migration that creates a table, confirm it has row level security on.

## Risks and open points
- The function is platform provisioned. A platform change could recreate it with public execute again; re-check the advisor after Supabase maintenance.
- The Supabase dashboard or other tooling that creates tables runs as `postgres` or `supabase_admin`; the dry run covered `postgres`. If a tool ever fails to enable row level security on a new table, check the log lines `rls_auto_enable:` first.
