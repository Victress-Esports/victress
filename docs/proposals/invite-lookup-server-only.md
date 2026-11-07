# Proposal: team invite lookup becomes server only

Status: **PREPARED, NOT APPLIED** to production or staging. Needs the founder's approval before any apply, and Supabase Pro before any production apply. Code and migration are in the same draft PR; the order of deployment matters (below).

Part of [team-invite-rate-limiting.md](team-invite-rate-limiting.md): this is option 3 (take `team_invite_info` off the public API) plus the app level limit from option 4. Option 2 (attempt throttling inside `join_team`) is still open and is the next item.

## The gap
`public.team_invite_info(code)` is callable by anyone with the public key, through `/rest/v1/rpc/team_invite_info`. It answers a code with the team name and size, so an attacker can test guesses at any speed and the application never sees them. Codes are now 130 bits for new teams (applied 2026-11-07), which makes guessing impractical, but the pilot readiness list still requires a throttle and a server side lookup, and production teams created before that change (none today) would still have 48 bit codes.

## What changes
1. Two migrations, in this order:
   - `20261107000600_invite_info_service_grant.sql` (additive): `grant execute on function public.team_invite_info(text) to service_role;`. Needed because on current Supabase defaults the service role does **not** get execute on functions created by migrations; this was verified on the staging project (`has_function_privilege` was false and a probe call as `service_role` returned permission denied). The two privileges are not interchangeable: the old page needs anon execute, the new page needs service_role execute.
   - `20261107000610_invite_info_revoke_public.sql` (permission change): `revoke execute on function public.team_invite_info(text) from public, anon, authenticated;`.
2. `app/a/join/[code]/page.tsx` calls it with the service role client (`lib/supabase-admin.ts`), after an in memory limit of 20 lookups per IP per 10 minutes (`lib/ratelimit.ts`). A limited visitor sees the same page as for an invalid code, plus a "try again later" line; nothing reveals whether a code exists. **The limit is stored in memory (a `Map` in `lib/ratelimit.ts`), per server instance. It does not hold across serverless instances**: each warm instance keeps its own counts, a cold start resets them, and N instances allow roughly N times the limit. It is a speed bump, not a guarantee. See "Database backed counter (proposed)" below.
3. `join_team` is unchanged: it needs a signed in user.

## Deployment order (important)
1. Apply `000600` (additive grant). The current page keeps working: it uses the anonymous path, which is unchanged.
2. Deploy the new join page (service role path). It works because of step 1.
3. Confirm an invite link still shows the team name.
4. Apply `000610` (revoke). The old page would break here, which is why the code goes first.
Applying `000610` alone, or deploying the page before `000600`, makes every invite link look invalid (permission denied is swallowed into the invalid invite page).

## What this does and does not close
- **Closes:** the anonymous path. After the migration, `POST /rest/v1/rpc/team_invite_info` with the public key is denied, so codes cannot be tested through the lookup function.
- **Does not close:** guessing through `join_team(code)`. Any signed in user can call it through the public API, and it answers `invalid` for an unknown code and a different status (`ok`, `in_other_team`, `full`, `already_member`) for a real one. Sign ups are free, so this path stays open until attempt throttling inside `join_team` (option 2) is built. With 130 bit codes for new teams guessing is impractical either way; teams created before the longer codes (none exist today) would have 48 bit codes.

## Database backed counter (proposed, no migration written)
Needed to make the lookup limit hold across instances, and to throttle `join_team`. Sketch for review:
```sql
-- PROPOSAL ONLY, not in supabase/migrations
create table public.invite_attempts (
  key text not null,                 -- sha256 of 'lookup:' || ip, or 'join:' || user id; never a raw IP
  window_start timestamptz not null,
  attempts int not null default 0,
  primary key (key, window_start)
);
alter table public.invite_attempts enable row level security;
revoke all on public.invite_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.invite_attempts to service_role;

-- Returns true when the caller may proceed. Fixed 10 minute windows; one atomic upsert per call.
create function public.invite_attempt_allowed(p_key text, p_limit int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare w timestamptz := date_bin('10 minutes', now(), timestamptz '2000-01-01'); n int;
begin
  insert into public.invite_attempts (key, window_start, attempts) values (p_key, w, 1)
  on conflict (key, window_start) do update set attempts = public.invite_attempts.attempts + 1
  returning attempts into n;
  return n <= p_limit;
end $$;
revoke execute on function public.invite_attempt_allowed(text, int) from public, anon, authenticated;
grant execute on function public.invite_attempt_allowed(text, int) to service_role;
-- plus a cleanup of windows older than a day (a scheduled delete, or on each call with a small probability).
```
Costs and decisions: one extra database round trip per join page view; the table stores hashed IPs, which is personal data and needs a retention rule and a line in the privacy text (pending legal review); it needs its own migration, dry run, rollback and tests. `join_team` would call the same function with the user id as key (and record failures only), which is option 2. The alternative is a Vercel firewall rule or an Upstash Redis store, which need no migration but add a service or a plan feature. The in memory limit in this PR stays as the first line either way.

## Dry run (one call, ends in a rollback), to run on staging first
```sql
begin;
grant execute on function public.team_invite_info(text) to service_role;   -- 000600
revoke execute on function public.team_invite_info(text) from public, anon, authenticated;   -- 000610
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
grant execute on function public.team_invite_info(text) to anon, authenticated;
```
Restores the anonymous and signed in access (the service role grant from 000600 can stay). Tested on a throwaway Postgres 16 by `supabase/tests/local/run-invite-info.sh`.

## Anonymous API check after applying
`POST /rest/v1/rpc/team_invite_info` with the public key and `{"p_code":"x"}` must return 401 or 403 (before the change it returns 200 `null`). The join page for a valid code must still show the team name.

## Decisions needed
The limit (20 per IP per 10 minutes is a proposal), whether the join page should also send no referrer, and the founder's approval to apply.
