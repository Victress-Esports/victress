-- Account deletion removes the player's waitlist signup (it is keyed by email, not by account). Additive, and the smallest grant that
-- works: the service role may read the email column (needed to match the row) and delete rows. NOT APPLIED to production; needs
-- separate founder approval. anon and authenticated still have no privilege on this table, and row level security stays on.
grant select (email) on public.waitlist to service_role;
grant delete on public.waitlist to service_role;
