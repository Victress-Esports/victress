-- Scrim uploads: close the direct Storage path while uploads are off. Additive; run right after 20261107000300.
-- NOT APPLIED to production. 20261107000300_dashboard_foundation.sql must not be applied to production on its own: it
-- creates the scrim-uploads bucket, and until this migration is applied alongside it a signed in user could upload to
-- their own folder by calling Storage directly, whatever the application flag says (docs/proposals/privacy-rollout.md).
--
-- 1. design_partner_allowlist: the approved design partners. Only service_role can read or write it; no user (and no
--    anonymous visitor) can add themselves, list others or read it.
-- 2. upload_allowed(): tells the signed in user whether they alone are on the list. Used by policies and the application.
-- 3. The Storage insert policy now also requires the allowlist. Reading and deleting one's own files stays possible, so
--    someone removed from the list can still delete what they stored.
-- 4. Clients can no longer write scrim_uploads at all (so they cannot set size_bytes): the server action records an upload
--    with the service role, after checking the flag, the allowlist, the path, and the real size reported by Storage.

create table public.design_partner_allowlist (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 200)
);
alter table public.design_partner_allowlist enable row level security;
-- No policy for anon or authenticated: with RLS on and no policy, they see nothing. Privileges are revoked as well.
revoke all on public.design_partner_allowlist from anon, authenticated;
grant select, insert, update, delete on public.design_partner_allowlist to service_role;

create function public.upload_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.design_partner_allowlist a where a.profile_id = (select auth.uid()));
$$;
revoke execute on function public.upload_allowed() from public, anon;
grant execute on function public.upload_allowed() to authenticated, service_role;

drop policy "users upload to their own scrim folder" on storage.objects;
create policy "approved partners upload to their own scrim folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'scrim-uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.upload_allowed()
  );

-- Recording an upload is a server only action. Remove every client write path to scrim_uploads.
drop policy "owners record their uploads" on public.scrim_uploads;
revoke insert on public.scrim_uploads from authenticated;
grant select, insert, delete on public.scrim_uploads to service_role;
