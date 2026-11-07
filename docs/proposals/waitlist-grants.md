# Proposal: waitlist grants (the live waitlist form cannot save)

Status: **APPLIED to production on 2026-11-07** (founder authorization, one `apply_migration` call; production version `20261107204332`, name `waitlist_service_role_grants`; repository file `20261107000620_waitlist_service_role_grants.sql`). **Not applied to staging** (staging was only dry run). Recount before and after: 0 waitlist rows, 0 auth users, 0 profiles, 0 teams. Merge order: this PR (#26) waits until #24 is merged and confirmed, because merging anything to `main` before #24 starts a production build from code that reads the deleted `NEXT_PUBLIC_SUPABASE_*` variables.

### Applied result (read only verification)
- Grants: service_role insert=true select=false; anon and authenticated have no privilege of any kind on `public.waitlist` (insert, select, truncate, references, trigger, maintain all false). Row level security still on.
- A rolled back transaction (one call, ended in a raised error, nothing kept): PASS service_role insert works, PASS anon insert denied, PASS authenticated insert denied.
- Anonymous API with the public key: `GET /rest/v1/waitlist` 401, `POST /rest/v1/waitlist` 401.
- No real row was inserted. The form on victressesports.com still needs one real test submission by the founder, with their own email, followed by a decision about deleting that row.

## Finding (read only, 2026-11-07)
- Production (`pmamceqshyfptvjgimsf`): `has_table_privilege('service_role', 'public.waitlist', 'insert')` is **false**. Table grants on `public.waitlist`: anon, authenticated and service_role each have only `REFERENCES, TRIGGER, TRUNCATE` (plus `MAINTAIN` on Postgres 17). 0 rows in the table.
- Staging (`cmvifuayvqhbfkeskoqi`): identical, and a probe as `service_role` inside a rolled back transaction returned `permission denied` for `INSERT` on `public.waitlist`.
- Cause: the project's default privileges for tables created by `postgres` in `public` give the API roles only `Dxtm` (truncate, references, trigger, maintain), not `arwd`. The waitlist migration (`20261106000100`) enabled row level security and granted nothing. `/api/waitlist` inserts with the service role (`app/api/waitlist/route.ts`), so every submission fails and the form shows "Couldn't save. Try again."
- **So the live waitlist form cannot work today.** Nothing was ever stored (0 rows). Every "Coming soon" button that opens the waitlist is affected. The contact and design partner forms are not (they send email through Resend and write nothing).
- Hygiene: anon and authenticated hold `TRUNCATE`, `REFERENCES`, `TRIGGER` and `MAINTAIN` on the waitlist. The REST API does not expose TRUNCATE, so this is not an exploit path, but no API role needs any of it.

## Every service role touch point in the code, and its grant
Callers of `supabaseAdmin()` on `main` and what they need (read only comparison on production and staging):

| Used by | Object | Needs | Production | Staging |
|---|---|---|---|---|
| `app/api/waitlist/route.ts` | table `waitlist` | INSERT | **missing** | **missing** |
| `lib/privacy.ts` (share links) | function `shared_profile` | EXECUTE | yes | yes |
| `lib/privacy.ts` (directory) | function `directory_profile` | EXECUTE | yes | yes |
| `lib/privacy.ts`, handle check | function `handle_available` | EXECUTE | yes | yes |
| `app/a/leaderboard/[slug]`, `lib/leaderboard.ts` | functions `board_entries`, `board_player_count` | EXECUTE | yes | yes |
| `lib/sitemap-data.ts` | functions `sitemap_directory_count`, `sitemap_directory_profiles` | EXECUTE | yes | yes |
| `app/a/dashboard/scrims/actions.ts` (upload record) | table `scrim_uploads` | INSERT, SELECT, DELETE | table absent (000300 not applied) | yes |
| `app/a/dashboard/scrims/actions.ts`, policies | function `upload_allowed` | EXECUTE | function absent | yes |
| join page, **only in #25** | function `team_invite_info` | EXECUTE | missing | missing |

So on `main` the only gap is the waitlist insert. `team_invite_info` is not a gap for today's code (the join page calls it as an anonymous visitor) and is handled by `20261107000600` in #25. The profile share link table is written by signed in users and updated inside the `SECURITY DEFINER` function `shared_profile`, so the service role needs nothing on it.

## Proposed migration `20261107000620_waitlist_service_role_grants.sql`
```sql
grant insert on public.waitlist to service_role;
revoke all on public.waitlist from anon, authenticated;
```
`revoke all` removes TRUNCATE, REFERENCES, TRIGGER and MAINTAIN in one version independent statement (the `MAINTAIN` privilege only exists on Postgres 17, so naming it would fail the local Postgres 16 test). Insert only: the application never reads the table with the service role; reading it stays a dashboard task. Row level security stays on with no policies.

## Dry run (one call, ends in a rollback). Run on staging first; on production only with approval
```sql
begin;
grant insert on public.waitlist to service_role;
revoke all on public.waitlist from anon, authenticated;
do $verify$
declare r text[] := '{}';
begin
  r := array_append(r, format('service_role insert=%s select=%s', has_table_privilege('service_role','public.waitlist','insert'), has_table_privilege('service_role','public.waitlist','select')));
  r := array_append(r, format('anon insert=%s select=%s truncate=%s references=%s trigger=%s maintain=%s',
    has_table_privilege('anon','public.waitlist','insert'), has_table_privilege('anon','public.waitlist','select'), has_table_privilege('anon','public.waitlist','truncate'),
    has_table_privilege('anon','public.waitlist','references'), has_table_privilege('anon','public.waitlist','trigger'), has_table_privilege('anon','public.waitlist','maintain')));
  r := array_append(r, format('authenticated insert=%s select=%s truncate=%s', has_table_privilege('authenticated','public.waitlist','insert'), has_table_privilege('authenticated','public.waitlist','select'), has_table_privilege('authenticated','public.waitlist','truncate')));
  set local role service_role;
  begin insert into public.waitlist (email, interest) values ('dryrun@test.invalid', 'pro'); r := array_append(r, 'PASS service_role insert works');
  exception when others then r := array_append(r, 'FAIL service_role insert: ' || sqlerrm); end;
  reset role;
  set local role anon;
  begin insert into public.waitlist (email, interest) values ('dryrun2@test.invalid', 'pro'); r := array_append(r, 'FAIL anon insert allowed');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon insert denied'); end;
  reset role;
  set local role authenticated;
  begin insert into public.waitlist (email, interest) values ('dryrun3@test.invalid', 'pro'); r := array_append(r, 'FAIL authenticated insert allowed');
  exception when insufficient_privilege then r := array_append(r, 'PASS authenticated insert denied'); end;
  reset role;
  raise exception E'WAITLIST GRANT DRY RUN (aborts, nothing kept)\n%', array_to_string(r, E'\n');
end $verify$;
rollback;
```
Expected: service_role insert=true select=false; anon and authenticated all false; the three PASS lines.

## Rollback
```sql
-- ROLLBACK
revoke insert on public.waitlist from service_role;
grant references, trigger, truncate on public.waitlist to anon, authenticated;
grant maintain on public.waitlist to anon, authenticated;
```
Restores the previous privileges (service_role keeps its default references, trigger, truncate). The `maintain` line exists only on Postgres 17 (production and staging); the local Postgres 16 test runs the rollback without it and the staging dry run covers it.

## Checks after applying (read only)
- `has_table_privilege('service_role', 'public.waitlist', 'insert')` is true; anon and authenticated have none.
- Anonymous API: `GET /rest/v1/waitlist` stays 401; `POST /rest/v1/waitlist` with the public key is denied.
- Submit one real test email through the site's waitlist form and confirm one row; delete it afterwards (production data change, needs its own approval).

## Decisions needed
Approval to apply (staging first). Whether to also revoke the default `TRUNCATE`, `REFERENCES` and `TRIGGER` from `service_role` on every table (not proposed here; the service role is trusted server code).
