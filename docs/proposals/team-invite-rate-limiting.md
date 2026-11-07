# Proposal: rate limiting and entropy for team invite codes

Status: **Option 1 (longer codes) APPLIED to production on 2026-11-07** as migration `longer_invite_codes`, version `20261107060917` (repository file `20261107000500_longer_invite_codes.sql`; the file header still says "NOT APPLIED" because it was applied byte for byte as committed). Recount before: 0 profiles, 0 auth users, 0 teams. Options 2 to 6 are proposals only, not implemented. Facts below were read from the repository and from production (read only) on 2026-11-07. Production has 0 teams.

## Current state
- **Code generation.** `teams.invite_code` defaults to `substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)`, and `regenerate_invite_code()` uses the same expression. A version 4 UUID's first 12 hex digits are random, so a code is **12 hex characters = 48 bits** (about 2.8 x 10^14 possibilities). It is unique (`teams_invite_code_key`) and lower case.
- **Two functions take a code**, both `SECURITY DEFINER`, both reachable through the database's public REST API:
  - `team_invite_info(p_code)`: **anon and signed in users**. Returns the team name and member count for a valid code, `null` otherwise (verified on production: bad and empty codes return `null`).
  - `join_team(p_code)`: signed in users. A correct code adds the caller to the team (up to 10 members; one team per player).
- **Throttling.** None at the database or API. The app has an in-memory limiter (`lib/ratelimit.ts`, "per server instance"), which on serverless hosting does not hold state between instances, and **it is not in the path at all** when someone calls the REST API directly with the public key, which is how both functions can be called.
- The join page (`/join/{code}`) accepts 6 to 32 letters and digits and calls `team_invite_info` with the anon key.

## What an attacker gains, and how fast
A guess that hits learns a team name and size (anon) or, if signed in, **joins the team** (`join_team`). Expected time until the first hit on any team, at a guessing rate the API allows (illustrative rates, not measured limits):

| Teams | 100 guesses/s | 1,000 guesses/s | 10,000 guesses/s |
|---|---|---|---|
| 50 | 1,785 years | 178 years | 18 years |
| 10,000 | 8.9 years | 326 days | 33 days |
| 100,000 | 326 days | 33 days | 3.3 days |

At pilot scale this is not a practical attack; at the scale the product is built for, 48 bits with no throttle is too thin, and the gap is cheap to close now and harder later.

## Option 1: applied 2026-11-07
Verified read only after applying, and it matched the rolled back dry run: `new_invite_code()` exists with ACL `{postgres=X/postgres}` (anon, authenticated and service_role cannot execute it; the owner can); `teams.invite_code` default is `new_invite_code()`; `teams_invite_code_strength` exists and is validated; `regenerate_invite_code()` uses the new generator and kept its ACL; a sample from the generator was 26 characters in the right alphabet; no team was created on production (0 teams, 0 profiles, 0 auth users). Anonymous API check with the public key: `rpc/team_invite_info` returns `null` for a bad legacy shape code, a bad 26 character code and an empty code; `rpc/new_invite_code` and `rpc/regenerate_invite_code` return 401 permission denied. The documented rollback below is not applied.

### What was written
- **Format:** 26 characters of lower case base 32 (`a-z`, `2-7`): URL safe, no padding, **130 bits** taken from 144 random bits (three UUID prefixes of 12 hex characters, each fully random; `gen_random_uuid()` uses the server's strong random source). Lower case keeps `team_invite_info` and `join_team` working unchanged (they lower case their input and do not depend on length); the join page already accepts 6 to 32 letters and digits.
- **Changes:** new `public.new_invite_code()` (no one but the owner role can call it); `teams.invite_code` default uses it; `regenerate_invite_code()` uses it; a `teams_invite_code_strength` check (26 or more characters, `a-z2-7`) is added only if every existing code already satisfies it (true in production, which has 0 teams).
- **Existing codes are not changed.** A team with a legacy 12 character code keeps it, and it keeps working, until the owner regenerates it. If teams exist when the migration runs, the constraint is skipped with a notice and the decision to regenerate their codes (which invalidates shared links) is separate.
- **Tests:** `supabase/tests/local/run-invite-codes.sh` (format, uniqueness, even symbol frequencies, privileges, create/regenerate/info/join flows, the constraint, the privacy suite on top, and a legacy-team scenario) and a production dry run in a rolled back transaction (all passed; production unchanged afterwards).
- **Rollback (restores the old generator; codes already issued stay valid):**
```sql
begin;
alter table public.teams drop constraint if exists teams_invite_code_strength;
alter table public.teams alter column invite_code set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
create or replace function public.regenerate_invite_code()
returns text language plpgsql security definer set search_path = ''
as $$
declare
  code text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
begin
  update public.teams set invite_code = code where owner_id = auth.uid();
  if not found then return null; end if;
  return code;
end;
$$;
drop function public.new_invite_code();
commit;
```

## Options (only option 1 has code)
1. **More entropy for new codes (cheapest, do first).** 16 base 32 characters is 80 bits; 20 is 100 bits. With 0 teams today, changing the default and `regenerate_invite_code()` needs no data migration. Links get longer (invite links are pasted, not typed); keep lower case letters and digits, avoid look alike characters, and widen the join page's accepted length.
2. **Attempt throttling inside `join_team` (closes the signed in path).** Record failed attempts per user (`auth.uid()`) in a small table and return `rate_limited` after N failures in a window (for example 10 in 10 minutes). Requires an additive migration and a table readable only by the function. Sign ups are free, so this slows one account, not a farm of accounts; combine with option 1.
3. **Take `team_invite_info` off the public API (closes the anon path).** Revoke execute from anon and signed in users and call it from the join page on the server with the service role, behind an app level and edge limit. The page keeps working; direct REST guessing stops. This is the same pattern already used for the profile reads. (Changes who can call the function, so it needs its own migration, dry run and rollback, like the privacy steps.)
4. **Edge rate limit on `/join/*` and the join action.** Vercel's firewall rate limiting rules (check what the current plan includes) keyed on IP. Useful with option 3; does nothing for direct calls to the database's REST API, which the edge of the app never sees.
5. **Invite expiry and revocation.** Codes that expire (for example after 14 days) or are single use for rosters that are already full reduce how long a guess stays valuable. Owners can already regenerate a code.
6. **Detection.** Log counts of `null` results per hour (needs the server side lookup from option 3 to see them) and alert on a spike.

## Recommended order
1. Option 1 now (free while there are no teams).
2. Options 3 and 4 together (server side lookup, edge limit).
3. Option 2 for `join_team`.
4. Options 5 and 6 when real teams exist.

## Decisions needed
Code length and alphabet; whether expiry is wanted; the N and window for join attempts; whether the Vercel plan includes the edge rule. The join page and `/join/*` are already noindex; whether invite pages should also send no referrer is not decided.

## Not covered
Brute forcing sharing links is a separate case: those tokens are 256 bits and only a hash is stored (see the privacy design), so they are out of reach of guessing.
