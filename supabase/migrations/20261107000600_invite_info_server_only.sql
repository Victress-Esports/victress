-- Team invite lookup becomes server only (additive permission change). NOT APPLIED to production or staging.
-- Proposal: docs/proposals/invite-lookup-server-only.md, option 3 of docs/proposals/team-invite-rate-limiting.md.
--
-- team_invite_info(code) answers a visitor who is not signed in with a team name and size, so anyone with the public key
-- could call it directly through the REST API and test guesses without limit. Take it off the public API: only the
-- application server (service role) can call it, behind an app level limit on the join page.
-- join_team(code) is unchanged: it needs a signed in user and is the next item (attempt throttling, option 2).
revoke execute on function public.team_invite_info(text) from public, anon, authenticated;
grant execute on function public.team_invite_info(text) to service_role;
