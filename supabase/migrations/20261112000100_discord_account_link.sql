-- Discord account linking (additive). NOT APPLIED anywhere. Run after 20261110000100_age_gate_legal_acceptance.sql (it checks the consent tables).
-- Design: docs/proposals/discord-account-linking.md. A player proves a Discord account (a signed Discord interaction) and a Victress
-- account (their signed in session) once. One Discord account per Victress account and one Victress account per Discord account.
--  * discord_links: the association. Holds the Discord user id only (never a username, avatar, server or channel). Clients can read and
--    delete their own row; they cannot insert or update it. It holds no sharing or visibility setting: linking grants nothing.
--  * discord_link_codes: short lived (10 minute) one time codes. Only the SHA 256 hash of the code is stored; the display name Discord
--    showed for the requester is kept only until the code is used or expires, and codes are purged after a day.
--  * The link is created only by discord_complete_link(), run as the signed in player, after they have passed the age gate and accepted
--    the Terms and Privacy Policy. Creating a code and unlinking from Discord are service role only.
-- Rollback: drop function public.discord_create_link_code(text, text, text), public.discord_link_preview(text),
--   public.discord_complete_link(text, text), public.discord_unlink(text), public.purge_discord_link_codes();
--   drop table public.discord_link_codes, public.discord_links;

create table public.discord_links (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  discord_user_id text not null unique check (discord_user_id ~ '^[0-9]{15,25}$'),
  linked_at timestamptz not null default now(),
  consent_version text not null check (consent_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
);

create table public.discord_link_codes (
  code_hash text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  discord_user_id text not null check (discord_user_id ~ '^[0-9]{15,25}$'),
  display_hint text check (display_hint is null or char_length(display_hint) <= 80),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  check (expires_at > created_at and expires_at <= created_at + interval '30 minutes')
);
create unique index discord_link_codes_one_open on public.discord_link_codes (discord_user_id) where used_at is null;
create index discord_link_codes_created_idx on public.discord_link_codes (discord_user_id, created_at desc);

alter table public.discord_links enable row level security;
alter table public.discord_link_codes enable row level security;
create policy "owners read their discord link" on public.discord_links for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners remove their discord link" on public.discord_links for delete to authenticated using (profile_id = (select auth.uid()));
-- No policy on discord_link_codes: with RLS on, nobody but the functions below can touch it.

revoke all on public.discord_links, public.discord_link_codes from public, anon, authenticated, service_role;
grant select, delete on public.discord_links to authenticated;
grant select, delete on public.discord_links to service_role;   -- the bot route reads the link; unlinking is also done by function

-- 1. Discord side: create a code for the Discord user who ran /link. Service role only.
create function public.discord_create_link_code(p_discord_user_id text, p_code_hash text, p_hint text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_discord_user_id is null or p_discord_user_id !~ '^[0-9]{15,25}$' or p_code_hash !~ '^[0-9a-f]{64}$' then return 'invalid'; end if;
  if exists (select 1 from public.discord_links where discord_user_id = p_discord_user_id) then return 'already_linked'; end if;
  -- At most 5 codes per Discord account per hour (replaced and expired ones count).
  if (select count(*) from public.discord_link_codes where discord_user_id = p_discord_user_id and created_at > now() - interval '1 hour') >= 5 then
    return 'rate_limited';
  end if;
  -- A new code replaces any open one.
  update public.discord_link_codes set used_at = now(), display_hint = null where discord_user_id = p_discord_user_id and used_at is null;
  insert into public.discord_link_codes (code_hash, discord_user_id, display_hint, expires_at)
    values (p_code_hash, p_discord_user_id, left(nullif(btrim(p_hint), ''), 80), now() + interval '10 minutes');
  return 'ok';
end;
$$;

-- 2. Web side: what the confirmation page shows. Signed in players only.
create function public.discord_link_preview(p_code_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare c record;
begin
  if (select auth.uid()) is null then return jsonb_build_object('status', 'unauthorized'); end if;
  select * into c from public.discord_link_codes where code_hash = p_code_hash;
  if not found or c.used_at is not null then return jsonb_build_object('status', 'invalid'); end if;
  if c.expires_at <= now() then return jsonb_build_object('status', 'expired'); end if;
  return jsonb_build_object('status', 'ok', 'hint', c.display_hint, 'expires_at', c.expires_at);
end;
$$;

-- 3. Web side: the signed in player confirms. Everything is checked here, in one transaction.
create function public.discord_complete_link(p_code_hash text, p_consent_version text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  c record;
begin
  if uid is null then return 'unauthorized'; end if;
  if p_consent_version is null or p_consent_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return 'invalid'; end if;
  -- The player must have passed the age gate and accepted the Terms and the Privacy Policy.
  if not exists (select 1 from public.age_confirmations where profile_id = uid)
     or not exists (select 1 from public.legal_acceptances where profile_id = uid and document = 'terms')
     or not exists (select 1 from public.legal_acceptances where profile_id = uid and document = 'privacy') then
    return 'consent_required';
  end if;
  select * into c from public.discord_link_codes where code_hash = p_code_hash for update;
  if not found or c.used_at is not null then return 'invalid'; end if;
  if c.expires_at <= now() then return 'expired'; end if;
  if exists (select 1 from public.discord_links where profile_id = uid) then return 'profile_has_link'; end if;
  if exists (select 1 from public.discord_links where discord_user_id = c.discord_user_id) then return 'discord_taken'; end if;
  insert into public.discord_links (profile_id, discord_user_id, consent_version) values (uid, c.discord_user_id, p_consent_version);
  update public.discord_link_codes set used_at = now(), display_hint = null where code_hash = p_code_hash;
  return 'ok';
end;
$$;

-- 4. Discord side: /unlink. Service role only. Also closes any open code.
create function public.discord_unlink(p_discord_user_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  update public.discord_link_codes set used_at = coalesce(used_at, now()), display_hint = null where discord_user_id = p_discord_user_id and used_at is null;
  delete from public.discord_links where discord_user_id = p_discord_user_id;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- 5. Housekeeping: codes are kept for a day (so the hourly limit works) and then deleted.
create function public.purge_discord_link_codes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  delete from public.discord_link_codes where created_at < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.discord_create_link_code(text, text, text), public.discord_unlink(text), public.purge_discord_link_codes() from public, anon, authenticated;
grant execute on function public.discord_create_link_code(text, text, text), public.discord_unlink(text), public.purge_discord_link_codes() to service_role;
revoke execute on function public.discord_link_preview(text), public.discord_complete_link(text, text) from public, anon;
grant execute on function public.discord_link_preview(text), public.discord_complete_link(text, text) to authenticated;
