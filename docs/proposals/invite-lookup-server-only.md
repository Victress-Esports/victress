# Proposal: team invite lookup becomes server only

Status: **PREPARED, NOT APPLIED** to production or staging. Needs the founder's approval before any apply, and Supabase Pro before any production apply. Code and migration are in the same draft PR; the order of deployment matters (below).

Part of [team-invite-rate-limiting.md](team-invite-rate-limiting.md): this is option 3 (take `team_invite_info` off the public API) plus the app level limit from option 4. Option 2 (attempt throttling inside `join_team`) is still open and is the next item.

## The gap
`public.team_invite_info(code)` is callable by anyone with the public key, through `/rest/v1/rpc/team_invite_info`. It answers a code with the team name and size, so an attacker can test guesses at any speed and the application never sees them. Codes are now 130 bits for new teams (applied 2026-11-07), which makes guessing impractical, but the pilot readiness list still requires a throttle and a server side lookup, and production teams created before that change (none today) would still have 48 bit codes.

## What changes
1. Migration `20261107000600_invite_info_server_only.sql`:
```sql
revoke execute on function public.team_invite_info(text) from public, anon, authenticated;
grant execute on function public.team_invite_info(text) to service_role;
```
2. `app/a/join/[code]/page.tsx` calls it with the service role client (`lib/supabase-admin.ts`), after an in memory limit of 20 lookups per IP per 10 minutes (`lib/ratelimit.ts`). A limited visitor sees the same page as for an invalid code, plus a "try again later" line; nothing reveals whether a code exists. The in memory limiter is per server instance, which is acceptable for a pilot and is documented in `lib/ratelimit.ts`; a Vercel firewall rule or Redis store is the stronger form.
3. `join_team` is unchanged: it needs a signed in user.

## Deployment order (important)
The new page code works **before** the migration (the service role can already call the function) and **after** it. The old page code breaks **after** the migration (the anon call is denied, so every invite link would look invalid). Therefore: deploy the code first, then apply the migration.

## Dry run (one call, ends in a rollback), to run on staging first
```sql
begin;
revoke execute on function public.team_invite_info(text) from public, anon, authenticated;
grant execute on function public.team_invite_info(text) to service_role;
do $verify$
declare r text[] := '{}';
begin
  r := array_append(r, format('anon=%s authenticated=%s service_role=%s',
    has_function_privilege('anon','public.team_invite_info(text)','execute'),
    has_function_privilege('authenticated','public.team_invite_info(text)','execute'),
    has_function_privilege('service_role','public.team_invite_info(text)','execute')));
  raise exception E'DRY RUN REPORT (aborts, nothing kept)\n%', array_to_string(r, E'\n');
end $verify$;
rollback;
```
Expected: `anon=false authenticated=false service_role=true`.

## Rollback
```sql
-- ROLLBACK
grant execute on function public.team_invite_info(text) to anon, authenticated, service_role;
```
Restores the previous behavior exactly. Tested on a throwaway Postgres 16 by `supabase/tests/local/run-invite-info.sh`.

## Anonymous API check after applying
`POST /rest/v1/rpc/team_invite_info` with the public key and `{"p_code":"x"}` must return 401 or 403 (before the change it returns 200 `null`). The join page for a valid code must still show the team name.

## Decisions needed
The limit (20 per IP per 10 minutes is a proposal), whether the join page should also send no referrer, and the founder's approval to apply.
