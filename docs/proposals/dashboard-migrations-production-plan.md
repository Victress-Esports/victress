# Production plan: dashboard migrations (000300, 000310, 000400) and the invite lookup pair (000600, 000610)

Created 2026-11-07, after the first real sign up on production. Status: **PROPOSED. Nothing here is applied.** Applying any step waits for the founder's explicit approval, and the order below recommends upgrading Supabase to Pro first. All of this is read only planning; the repository tests and the staging dry runs are the evidence, and each production dry run needs its own approval.

## 0. What changed: production now has data
Read only on 2026-11-07 after the founder's test sign up: 1 auth user (email provider, confirmed), 1 profile (handle `test`, game CS2, role Entry, rank Silver, all consents off: not in the directory, not on leaderboards, not indexable, `scoutable` false, every public field false), 1 `player_games` row, 0 stat entries, 0 teams, 0 team members, 0 share links, 0 waitlist rows, 0 storage objects. **That account must not be deleted.** Consequences:
- The "stop if profiles exist" safeguard that the privacy expand and contract migrations carry (decision 4) now blocks re running them. The rollback documents for those two steps ([expand](privacy-expand-rollback.md), [contract](privacy-contract-rollback.md)) assumed an empty database; with one real account they need a data plan before they could be used.
- The Free plan has no backups and no point in time recovery. The founder's acceptance of that covered the empty database only (pilot readiness list). It no longer applies.
- None of the migrations below has a profile safeguard. They are additive: they add tables, a bucket, two functions and policies, and change nothing on existing rows.

## 1. Where each migration stands
| Repository file | Production | Notes |
|---|---|---|
| `20261107000300_dashboard_foundation.sql` | not applied | adds `tournament_entries`, `highlights`, `scrim_uploads`, `dashboard_caps()` and its triggers, the private `scrim-uploads` bucket, owner only policies |
| `20261107000310_upload_allowlist.sql` | not applied | adds `design_partner_allowlist`, `upload_allowed()`, replaces the storage insert policy so uploads need the allowlist, removes every client write path to `scrim_uploads` |
| `20261107000400_scrim_matches.sql` | not applied | adds `scrim_matches` (owner only, Self-reported, cap 500) and extends `dashboard_caps()` |
| `20261107000500_longer_invite_codes.sql` | **applied** (version `20261107060917`) | nothing to do |
| `20261107000600_invite_info_service_grant.sql` and `..000610_invite_info_revoke_public.sql` | not applied; in draft PR #25 | invite lookup becomes server only |
| `20261107000620_waitlist_service_role_grants.sql` | **applied** (version `20261107204332`) | nothing to do |

## 2. Recommended order
**Step 0. Upgrade Supabase to Pro** (founder decision, billing). Recommended before any of the steps below because the database now holds a real account and the Free plan cannot restore it. Pro adds daily backups; decide separately about the point in time recovery add on. Take a manual export before the first step either way (Pro or not).

**Step 1. `000300` + `000310` together, in ONE migration call** (name `dashboard_foundation_with_allowlist`). `000300` creates the bucket; until `000310` runs, a signed in user could upload to their own folder by calling Storage directly, whatever the application flag says. One call is one transaction, so there is no moment with the bucket and without the gate. Unlocks: tournament history and highlights on the Player Resume (private, owner only, caps 50 and 20). Uploads stay closed: `SCRIM_UPLOADS_ENABLED` is false and the allowlist is empty.

**Step 2. `000400`.** Unlocks: the Match log on the Scrims page (private, owner only, Self-reported, cap 500). Needs step 1 (extends `dashboard_caps()` from `000300`).

**Step 3. #25 code first, then `000600`, then `000610`** (and only after #24 is merged and confirmed, as everywhere). `000600` is an additive grant and is safe with the current app; deploy the new join page; confirm an invite link still shows the team name; then `000610` revokes anonymous access to `team_invite_info`. Unlocks: invite codes can no longer be tested through the public API (they can still be tested through `join_team` by a signed in user; throttling that is option 2, not done).

Why steps 1 and 2 are not urgent: the app now shows "Coming soon" for those sections while the tables are missing (PR #22), so nothing is broken without them. They are needed before a design partner can use the match log or tournament history, and before any upload pilot.

## 3. Dry runs (one call each, ending in a rollback)
Same format as the earlier production steps: `begin;`, the migration text, a `do $verify$ ... raise exception (report) ... $verify$` block, `rollback;`. Run on **production only with approval**; the same call has already been run against real Supabase defaults on staging (which has all three applied, so a staging dry run of the full rollback below is the useful one there).

The verify block for steps 1 and 2 reports, and each line must read as shown:
- the new tables exist and have row level security on (5 tables: `tournament_entries`, `highlights`, `scrim_uploads`, `scrim_matches`, `design_partner_allowlist`);
- `scrim-uploads` is private with a 200 MB limit; storage policies on it: read own, delete own, and the insert policy that requires `upload_allowed()`; **no** "users upload to their own scrim folder" policy remains;
- as `anon`: select and insert on all five tables fail with permission denied;
- as `authenticated`, a signed in test user (use the existing account's id only in the transaction, `set_config('request.jwt.claims', ...)`): can insert and read own `tournament_entries`, `highlights` and `scrim_matches` rows, cannot read another user's, cannot insert into `scrim_uploads`, cannot call `upload_allowed()` as true, cannot read `design_partner_allowlist`;
- `service_role` can insert into `scrim_uploads` and `design_partner_allowlist` and execute `upload_allowed`;
- existing data unchanged: still 1 profile, 1 `player_games`, 1 auth user (counts compared inside the transaction);
- the transaction ends in a raised error so nothing is kept.

## 4. Tested rollback
Refuses to run when any of the new tables or the bucket holds data, so it can never silently destroy someone's records.
```sql
-- ROLLBACK_ALL (steps 1 and 2, reverse order)
do $guard$
begin
  if exists (select 1 from public.scrim_matches) or exists (select 1 from public.scrim_uploads)
     or exists (select 1 from public.tournament_entries) or exists (select 1 from public.highlights)
     or exists (select 1 from public.design_partner_allowlist)
     or exists (select 1 from storage.objects where bucket_id = 'scrim-uploads') then
    raise exception 'STOP: the dashboard tables or the scrim-uploads bucket hold data. Export it and decide before rolling back.';
  end if;
end $guard$;

-- 000400
drop table public.scrim_matches;

-- 000310
drop policy "approved partners upload to their own scrim folder" on storage.objects;
drop function public.upload_allowed();
drop table public.design_partner_allowlist;

-- 000300
drop policy "users read their own scrim files" on storage.objects;
drop policy "users delete their own scrim files" on storage.objects;
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.buckets where id = 'scrim-uploads';
drop table public.scrim_uploads, public.highlights, public.tournament_entries;
drop function public.dashboard_caps();
```
```sql
-- ROLLBACK_400_ONLY (keeps 000300 and 000310): drops the match log and restores the 000300 cap function
drop table public.scrim_matches;
create or replace function public.dashboard_caps()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  n int;
  cap int := case tg_table_name when 'tournament_entries' then 50 when 'highlights' then 20 else 25 end;
begin
  execute format('select count(*) from public.%I where profile_id = $1', tg_table_name) into n using new.profile_id;
  if n >= cap then
    raise exception 'dashboard_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
```
Staging dry run of `ROLLBACK_ALL` on real Supabase (one call, ended in a raised error, nothing kept; staging had all three applied and no data): the guard passed, the bucket delete worked with `storage.allow_delete_query`, and afterwards the tables, the `scrim-uploads` bucket, the scrim storage policies, `dashboard_caps` and `upload_allowed` were all gone; a recount confirmed nothing was actually removed (12 tables, bucket and both functions still present).

Local test: `supabase/tests/local/run-dashboard-rollback.sh` applies everything on a throwaway Postgres 16, runs each rollback, and compares a fingerprint of columns, constraints, indexes, policies, functions and triggers against a database built without these migrations. Real Supabase blocks direct deletes from `storage.buckets` unless `storage.allow_delete_query` is set (the line above); if that ever fails, delete the empty bucket in the dashboard (Storage) instead; with its policies dropped it is unreachable anyway.

The `000600`/`000610` rollback is in [invite-lookup-server-only.md](invite-lookup-server-only.md) (PR #25).

## 5. Anonymous API checks (after each step, read only, public key from the served JavaScript, never printed)
- Before step 1: `GET /rest/v1/tournament_entries` (and the other four tables) returns 404 (table absent). After: 401.
- After step 1: `POST /rest/v1/rpc/upload_allowed` as anon: 401. `POST /storage/v1/object/scrim-uploads/<any path>` as anon: 400 or 401 (no policy). A signed in test user who is not on the allowlist cannot upload; with the allowlist empty nobody can.
- After `000610`: `POST /rest/v1/rpc/team_invite_info` as anon returns 401 (before: 200 `null`), and a valid invite link still renders the team name.

## 6. What each step unlocks, in one line
| Step | Unlocks | Does not unlock |
|---|---|---|
| 1 (`000300` + `000310`) | Tournament history and highlights on the resume, owner only | Uploads (flag false, allowlist empty) |
| 2 (`000400`) | Match log, owner only | Any analysis; sharing; leaderboards |
| 3 (`000600`, `000610`) | Invite lookup off the public API | Throttling of `join_team` |

## 7. Upgrade to Pro first?
Yes, recommended. Reasons: a real account exists; the Free plan has no backups; the migrations are additive with a tested rollback, but the rollback only protects the new objects, not a mistake elsewhere; Pro also unblocks the separate Preview project workflow and is already on the pilot readiness list as required before the first design partner. If the founder prefers to proceed on Free for steps 1 and 2 only: they add tables and cannot affect the existing row, a manual export is taken first, and the founder accepts the no backup risk in writing for these steps. Step 3 and anything that changes permissions should wait for Pro.

## 8. Turning new sign ups off temporarily
Options, least to most invasive:
1. **Supabase dashboard setting (recommended, no code).** Authentication, Sign In / Providers, turn off "Allow new users to sign up". Existing users (the test account) can still sign in; new Discord, Google and email attempts are refused by Supabase. The login page would show its generic error ("Couldn't send the link" or "That link didn't work"), so a short notice in the app is a worthwhile follow up. Reversible in one click. Applies per project; staging and production are separate.
2. **Auth hook "Before user created"** (Supabase Auth Hooks, a Postgres function that returns an error while a flag is set). Reversible by changing the flag, gives a clear message, needs a small migration and a dashboard hook setting: a proposal of its own.
3. **App level flag** (`SIGNUPS_ENABLED=false`): hides the form and uses `shouldCreateUser: false` for email links. It cannot stop OAuth (Discord, Google) from creating users, so it is not enough alone.
Decision needed: whether to pause sign ups now (option 1 takes effect immediately and does not touch code).

## 9. Decisions needed
Pro upgrade and timing; approval for each production dry run and apply (one at a time); whether to pause sign ups; whether to keep the test account as a permanent fixture (it is, until told otherwise).
