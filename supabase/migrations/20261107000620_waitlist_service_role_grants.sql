-- Waitlist: give the service role the one privilege the application needs, and take everything else away from the API
-- roles. Additive for the application; a permission change for anon and authenticated. NOT APPLIED anywhere.
-- Proposal and evidence: docs/proposals/waitlist-grants.md.
--
-- Why: /api/waitlist inserts into public.waitlist with the service role. On current Supabase defaults a table created by a
-- migration gives the API roles only TRUNCATE, REFERENCES, TRIGGER and MAINTAIN, and the migration that created the
-- waitlist (20261106000100) granted nothing, so service_role cannot INSERT (checked read only on production and staging:
-- has_table_privilege('service_role', 'public.waitlist', 'insert') is false on both). The form returns "Couldn't save".
-- Row Level Security stays on with no policies, so anon and authenticated still cannot read or write rows.
grant insert on public.waitlist to service_role;
-- anon and authenticated never need any privilege on this table (TRUNCATE is not subject to row level security).
revoke all on public.waitlist from anon, authenticated;
