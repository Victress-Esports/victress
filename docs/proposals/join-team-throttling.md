# Proposal: throttling `join_team` and a rate limit plan for every invite path

**Status: PROPOSAL. Nothing here is implemented.** It completes option 2 of [team-invite-rate-limiting.md](team-invite-rate-limiting.md) and the plan around draft PR #25 ([invite-lookup-server-only.md](invite-lookup-server-only.md), on its own branch). Needs the founder's approval before any migration; production changes need a one call dry run and a tested rollback like every earlier step.

## 1. Every invite path and what limits it today
| Path | Who can call it | Reveals | Limit today |
|---|---|---|---|
| `/join/{code}` page | Anyone | Team name and size for a valid code | #25 adds an in memory limit (20 per IP per 10 minutes) per server instance; **today (main) none** |
| `rpc/team_invite_info(code)` on the public API | Anyone with the public key | Same | **None** until migration `000610` (prepared in #25; `000600` is applied) |
| `rpc/join_team(code)` on the public API | Any signed in user (sign ups are free) | `invalid` for an unknown code, a different status (`ok`, `already_member`, `in_other_team`, `full`) for a real one, and the caller **joins the team** on `ok` | **None** |
| Join button on the join page | Signed in user | Same, through the server action | None |
| `regenerate_invite_code()` / `team_invite_code()` | Team owner | Own code | Owner only; no limit needed |
Codes created from now on are 130 bits (applied). Guessing one is impractical at any realistic rate; the limits below are defense in depth and also protect against codes shared too widely.

## 2. Proposed design
**A. Attempt counter in the database (covers `join_team` and the server side lookup).**
```sql
-- PROPOSAL ONLY, not in supabase/migrations
create table public.invite_attempts (
  key text not null,                 -- 'join:' || user id, or 'lookup:' || sha256(ip); never a raw IP
  window_start timestamptz not null,
  attempts int not null default 0,
  primary key (key, window_start)
);
alter table public.invite_attempts enable row level security;
revoke all on public.invite_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.invite_attempts to service_role;
```
- `join_team(code)` first counts failed attempts for `auth.uid()` in the current 10 minute window and returns `rate_limited` at 10 failures; a success does not count. Only **failures** are recorded, so a legitimate player is never throttled for joining.
- The lookup path (server side after #25) calls a `service_role` only function `invite_attempt_allowed(key, limit)` with an atomic upsert, so the limit holds across serverless instances (the in memory limit in #25 does not).
- Cleanup of windows older than a day on each call with small probability, or a daily scheduled delete.
- Hashed IPs are personal data: they need a retention rule (proposal: 24 hours) and a line in the privacy text (**LEGAL**, pending review).

**B. Edge limit.** A Vercel firewall rate limit on `/join/*` keyed on IP, if the current plan includes it (unknown, to be checked). It does not see direct calls to the database's public API, which is why A and `000610` are needed.

**C. Uniform responses.** `join_team` already returns `invalid` for unknown codes; keep the response for a throttled caller indistinguishable in shape from `invalid` on the public page (the page shows the same message plus a "try again later" line).

**D. Detection.** Count `invalid` results per hour (visible once lookups go through the server) and alert on a spike; log without codes or personal data.

**E. Invite expiry and single use for full rosters (option 5).** Optional; decide when real teams exist.

## 3. Rollout order
1. #24 merged and confirmed (Preview and Production builds). 2. #25 code deployed, then `000610`. 3. Migration for `invite_attempts` and the new `join_team` (additive table; replaces one function body). 4. The server side lookup switches to the database counter. 5. Optional edge rule.

## 4. Tests required before production
- `join_team`: 10 wrong codes then `rate_limited`; a correct code still works for a player with fewer than 10 failures; windows reset; counters are per user; one user cannot throttle another.
- `invite_attempts` unreadable by anon and authenticated; `invite_attempt_allowed` executable by `service_role` only (remember: on this Supabase project functions need explicit grants).
- Local Postgres runner plus a rolled back dry run on staging, then production with approval, a rollback that restores the previous `join_team` body (kept in the proposal).

## 5. Decisions needed
The failure limit and window (proposal 10 per 10 minutes per user, 20 per 10 minutes per IP for lookups); retention of hashed IPs; whether the Vercel plan has the edge rule; approval to build.
