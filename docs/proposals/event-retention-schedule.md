# Proposal: schedule the 12 month product event cleanup

**Status: PROPOSAL.** Tested on staging 2026-11-15. **Not applied to production.** Needs founder approval, plus the matching Privacy Policy text.

## Why it is not scheduled today
`public.purge_events(p_months)` was added with the events table (`20261113000100`) and deliberately left unscheduled. Scheduling needs the `pg_cron` extension, which is an environment change, so it was listed as "needs approval" on 2026-11-13. `pg_cron` was available but not installed on staging (production not checked; same Supabase platform). Until a job exists, events are kept until the account is deleted, and the Privacy Policy says exactly that.

## Recommended mechanism: Supabase Cron (pg_cron) inside the database
- It runs a SQL function inside Postgres: no HTTP endpoint to protect, no secret, no Vercel cron, and no application code.
- Supabase's own documented method (supabase.com/docs/guides/cron): jobs live in `cron.job`, and every run is logged in `cron.job_run_details`.
- Alternatives considered: a Vercel Cron calling an API route (needs a new route, a shared secret and code; more to secure), or an Edge Function (more moving parts). Neither is needed.

## SQL (as applied on staging as migration `schedule_event_purge`)
```sql
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.schedule('victress-purge-events-12-months', '17 3 * * *', $$select public.purge_events(12)$$);
```
Rollback: `select cron.unschedule('victress-purge-events-12-months');` (keeps the extension). Disabling the extension deletes every job.
It is kept out of `supabase/migrations` on purpose: the local test Postgres has no `pg_cron`, and production gets it only as its own approved step.

## What is deleted, and when
- Only rows in `public.events` whose `created_at` is more than 12 calendar months before the run (`now() - make_interval(months => 12)`). Nothing else: events have no dependants, and accounts, games and teams are untouched.
- The job runs daily at 03:17 UTC, so an event is deleted within about a day after it turns 12 months old.
- `purge_events` refuses a retention under 1 month.
- Staging test (rolled back): an event 12 months and 1 day old was deleted; events 11 months 29 days old and new were kept; the account remained; `purge_events(0)` was refused. Job state: `17 3 * * *`, active, runs as `postgres`.
- Production has no events table yet, so the job can only be scheduled after migration `20261113000100`.

## Privacy Policy language (to replace the current line once scheduled in production)
Current: "Product events: until you delete your account."
Proposed: "Product events: 12 months after they are recorded, or sooner if you delete your account."
