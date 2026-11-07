-- Step 2 of 2 (permission change). NOT APPLIED to production or staging. Apply only AFTER 20261107000600 and AFTER the
-- application that resolves invite codes with the service role is deployed: the previous join page calls this function
-- as an anonymous visitor and would show every invite as invalid once this runs.
-- Proposal: docs/proposals/invite-lookup-server-only.md, option 3 of docs/proposals/team-invite-rate-limiting.md.
--
-- team_invite_info(code) answers a visitor who is not signed in with a team name and size, so anyone with the public key
-- could call it directly through the REST API and test guesses without limit. Take it off the public API.
-- join_team(code) is unchanged: it needs a signed in user and is the next item (attempt throttling, option 2).
revoke execute on function public.team_invite_info(text) from public, anon, authenticated;
