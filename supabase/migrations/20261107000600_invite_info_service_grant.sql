-- Step 1 of 2 (additive, safe with the current application). NOT APPLIED to production or staging.
-- Proposal: docs/proposals/invite-lookup-server-only.md.
-- Projects created on current Supabase defaults do not give service_role execute on functions created by migrations
-- (verified on the staging project: has_function_privilege('service_role', 'public.team_invite_info(text)', 'execute')
-- is false). The join page will call team_invite_info with the service role, so grant it explicitly BEFORE deploying that
-- page. This changes nothing for anyone who can already call the function.
grant execute on function public.team_invite_info(text) to service_role;
