# Proposal: rate limiting and entropy for team invite codes

Status: **PROPOSAL, nothing implemented.** Facts below were read from the repository and from production (read only) on 2026-11-07. Production has 0 teams.

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

## Options (nothing here is implemented)
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
Code length and alphabet; whether expiry is wanted; the N and window for join attempts; whether the Vercel plan includes the edge rule. Also whether invite pages should stay noindex and no referrer (the join page already sends the analytics scrubber's treatment and the code is never sent to analytics).

## Not covered
Brute forcing sharing links is a separate case: those tokens are 256 bits and only a hash is stored (see the privacy design), so they are out of reach of guessing.
