# Proposal: linking a Discord account to a Victress account (Discord bot, phase 2)

**Status: PROPOSAL, direction approved by the founder 2026-11-12 (decisions in section 9). Nothing here is implemented, and no migration file exists.** It needs approval before any database, authentication, permission or privacy change (CLAUDE.md section 7). Production steps each need their own approval.
Builds on PR #53 (phase 1: signed interactions endpoint, `/help`, `/privacy`). Part of the Victress Scrim Intelligence bot: the bot is an interface into the existing platform, not a second system.

## 1. Goal and scope
A Victress player proves they own both a Victress account and a Discord account, once, so that later commands (`/profile`, `/scrim submit`, `/scrim status`, `/scrim stats`) act as that player.
In scope: `/link`, `/unlink`, `/profile` (link status and the player's own basics), one table for the link, one table for short lived codes, the confirmation page, tests.
Out of scope (separate proposals): server to team connection, scrim submission, team visibility of any player's data, notifications.

## 2. What exists and is reused
| Need | Reuse | Where |
|---|---|---|
| Victress identity | Supabase Auth user = `profiles.id` (email link, Google, Discord sign in). No second login system | main |
| Signed in server code | `requireUser()`, `supabaseServer()`, `supabaseAdmin()` (server only) | main |
| Token pattern | Share links: random token made on the server, only its SHA 256 hash stored, shown once, `no-referrer`, `no-store`, `noindex` | main (`/r/:token`, `profile_share_links`) |
| Teams and roles | `teams`, `team_members.role` in (`owner`, `coach`, `player`); read live, never copied into the link | main |
| Age gate, Terms and Privacy acceptance | `age_confirmations`, `legal_acceptances`, gate in `requireUser` | **PR #47, not merged** |
| Account deletion and export | `deleteAccount()` (cascade from the profile), export file | **PR #50, not merged** |
| Throttling pattern | In memory `rateLimit()` now; database attempt counter in `join-team-throttling.md` | main / proposal |
| Phase 1 endpoint | Verified Discord user id comes from the signed interaction (`member.user.id`, or `user.id`) | PR #53 |

**Hard dependency:** PR #47 and PR #50 land first. The migration number collisions with #42 and the exact order are settled in [discord-pilot-reconciliation.md](discord-pilot-reconciliation.md); this migration is `20261112000100_discord_account_link.sql`.

## 3. Rules the design enforces
1. One Discord identity belongs to at most one Victress account, and one Victress account has at most one Discord identity (the second is an open question, section 9).
2. A Discord user id comes only from Discord's signed interaction. Usernames, display names and avatars are never proof of identity and are never used to match accounts.
3. A link needs both sides: a verified Discord interaction and an authenticated Victress session that passed the age gate and Terms acceptance.
4. Each side sees the other side's identity before the link is made (section 4, step 3). This is the main defense against someone tricking a player into linking the wrong account.
5. Linking is an explicit, recorded consent. Linking does not publish a profile, change any visibility setting, join a team, or grant a team any access. Team role is checked live on every action.
6. Unlinking is immediate from either side and deletes the association. It does not delete scrim records (consistent with the published Privacy page).
7. The bot has no Supabase credentials of its own. The interactions route runs in the Victress backend and calls database functions; the account holder's own session completes the link.

## 4. Flow
1. **Discord:** the player runs `/link` in a server. The route, which already verified the signature, calls a service role only function that creates a code: 32 random bytes (base64url), valid 10 minutes, bound to that Discord user id. Only the SHA 256 hash is stored. The reply (visible only to the player) contains `https://victress.gg/link/discord/{code}` and the expiry. If the player is already linked it says so and offers `/unlink` instead. New code replaces any earlier unused code for that Discord user.
2. **Web:** the link opens `victress.gg/link/discord/{code}`. If signed out it goes to `/login` and returns here (existing `next` handling). The consent gate from #47 applies. Headers as `/r/:token`: `no-store`, `no-referrer`, `noindex`.
3. **Confirmation page** shows: "A Discord account asked to link to your Victress account", the Discord display name and username that ran `/link` (copied from the interaction into the code row for at most 10 minutes, deleted on use or expiry), and the Victress account it will link to. Plain text: only continue if you just ran `/link` yourself. What linking allows, what it does not (no profile publishing, no team access, no message reading), and how to unlink. Consent button.
4. **Completion:** the page calls `discord_complete_link(code_hash)` as the signed in user. The function checks the code is valid, unused and unexpired, the Discord id is not linked elsewhere, the profile has no link, and the consent records exist; then it inserts the link, marks the code used and clears the display hint. One transaction.
5. **Discord:** `/profile` now shows the link and the player's own basics. Nothing else changes.
6. **Unlink:** `/unlink` in Discord (service role deletes the row for the interaction's Discord id) or a button on the dashboard Account page (owner delete under RLS).

Residual risk, stated plainly: a player who ignores the warning and confirms a link someone else started would link that person's Discord account to their Victress account. Showing the Discord identity, the warning and the short expiry reduce this; they do not remove it. Any later feature that reveals private data to a linked Discord user should be reviewed with this in mind (for example, `/scrim stats` shows only the player's own data and only in a reply visible to them).

## 5. Migration (proposed, additive, not applied anywhere)
```sql
-- PROPOSAL ONLY, not in supabase/migrations
create table public.discord_links (
  profile_id uuid primary key references public.profiles (id) on delete cascade,       -- one Discord identity per account
  discord_user_id text not null unique check (discord_user_id ~ '^[0-9]{15,25}$'),      -- one account per Discord identity
  linked_at timestamptz not null default now(),
  consent_version text not null                                                          -- the confirmation text the player saw
);
create table public.discord_link_codes (
  code_hash text primary key,                                                            -- sha256 of the code; the code is never stored
  discord_user_id text not null check (discord_user_id ~ '^[0-9]{15,25}$'),
  display_hint text check (display_hint is null or char_length(display_hint) <= 80),    -- shown on the confirmation page, cleared on use
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create unique index discord_link_codes_one_open on public.discord_link_codes (discord_user_id) where used_at is null;

alter table public.discord_links enable row level security;
alter table public.discord_link_codes enable row level security;
create policy "owners read their link" on public.discord_links for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners remove their link" on public.discord_links for delete to authenticated using (profile_id = (select auth.uid()));
revoke all on public.discord_links, public.discord_link_codes from public, anon, authenticated;
grant select, delete on public.discord_links to authenticated;       -- no insert or update for clients
grant select, insert, update, delete on public.discord_links, public.discord_link_codes to service_role;
-- Functions (security definer, set search_path = ''):
--   discord_create_link_code(p_discord_user_id, p_code_hash, p_hint)  service_role only; refuses when already linked; 5 per hour per Discord id
--   discord_link_preview(p_code_hash)     authenticated; returns hint and expiry for a valid unused code, else nothing
--   discord_complete_link(p_code_hash, p_consent_version)  authenticated; auth.uid() only; returns ok | expired | invalid | discord_taken | profile_has_link | consent_required
--   purge_discord_link_codes()            service_role; deletes expired or used codes (called by the same scheduler as other purges)
```
Guild id, channel id, locale, avatar and message text are not stored. Account deletion removes the link by cascade; export (PR #50) gains one line for link status.
Rollback: `drop table public.discord_link_codes, public.discord_links;` plus the four functions. Nothing else references them.

## 6. Authorization rules (phase 2 and what they imply for phase 3)
| Action | Who | Enforced by |
|---|---|---|
| Create a link code | Any Discord user, in a server, via a verified interaction | Signature check, service role function, 5 per hour per Discord id |
| Preview or complete a link | The signed in account holder who passed age gate and Terms | RPC with `auth.uid()`, consent check in the function |
| Read own link | Owner | RLS |
| Unlink | Owner (web) or the Discord user (command) | RLS delete / service role scoped to the interaction's Discord id |
| Any other account's link | Nobody. No client can read or write another player's link | RLS, no grants |
| Team actions (phase 3 and later) | Linked account whose live `team_members.role` permits it (proposal: submit for a team needs `owner` or `coach`; players submit their own) | Checked at action time, never cached in the link |
Linking never implies consent to publish a profile, show statistics to a team, or show anything to a scout. Those stay separate player choices.

## 7. Privacy text and bot text to change with this work
- Privacy page: say a Discord user id is stored when a player links, that a short lived link request (including the Discord display name shown on the confirmation page) is held for up to 10 minutes, and how to unlink. Terms already require using the linking and consent process.
- `/privacy` and `/help` replies must stop saying nothing is saved, in the same change.
- Dashboard Account page: link status and Unlink.
- Nothing is claimed live until built and tested.

## 8. Tests
- Local Postgres (`supabase/tests/local/run.sh`): anon and strangers cannot read or write either table; clients cannot insert or update links; one Discord id per account both ways; expired, used, wrong and replayed codes fail; consent missing fails; completion is atomic; a second code replaces the first; hourly limit; cascade on account deletion; purge. Then the same suite in a rolled back transaction on staging.
- Route tests with signed interactions: `/link` while linked, `/link` twice, `/unlink` when not linked, `/profile` unlinked and linked, replies visible only to the user.
- Web tests against the mock: signed out redirect and return, consent gate, confirmation shows the Discord identity, completion, expired code message, link page has `no-store`, `no-referrer`, `noindex`.
- Private Discord test server, staging Supabase only.

## 9. Decisions (founder, 2026-11-12)
1. One Discord account per Victress account and one Victress account per Discord account. (Matches the two uniqueness rules in section 5.)
2. `/profile` shows the player's own linked game identity, privately, in a reply only they can see. Not shown to anyone else.
3. Players without a team can use individual scrim features; their records stay private to them.
4. Team specific information needs live team membership and the right role (section 6). Never cached in the link.
5. **Linking does not grant any data sharing permission.** `discord_links` holds no sharing fields, and the tests assert that profile visibility, share links and consents are unchanged by linking and unlinking.
Still open: the Discord display name shown on the confirmation page for up to 10 minutes (counsel), and a way to disable one link for moderation (separate proposal).
Dependency numbers: migration file is `20261112000100`; the consent check in `discord_complete_link` requires an `age_confirmations` row and at least one `terms` and one `privacy` row in `legal_acceptances` (the app gate handles which version is current). See [discord-pilot-reconciliation.md](discord-pilot-reconciliation.md).

## 10. Path to real use (why this matters beyond `/link`)
Linking is the gate for everything that follows; what blocks players from actually using Scrim Intelligence from Discord afterwards:
- **Match storage is not on main.** `game_matches`, `import_jobs` and the Riot client are in PR #35; the Ballchasing client and parser spike are on `claude/scrim-m2-rocket-league`. Phase 3 needs these decided and merged first, with the `provider` values extended for Ballchasing and uploads (additive).
- **Rocket League scrims are private matches.** The Victress Ballchasing account is a regular tier with an **upload quota of 10 per 24 hours and 70 per 7 days**, so routing every scrim replay through Ballchasing uploads cannot scale. The realistic options are (a) the player supplies a Ballchasing link to a replay they already uploaded and Victress reads it with its token where the replay's visibility allows, or (b) the player attaches the `.replay` file to the command and Victress parses it with its own pipeline. (b) needs the parser (39 of 50 matched, 78%, not validated) and a worker host. Which of these is the first supported path is a founder and counsel decision (replay files contain other players' names and platform ids).
- **Whose data a team replay is.** The approved default attributes parsed stats only to the submitter and stores other players as anonymous slots; showing a teammate's numbers to the team needs that player's opt in. Phase 3 therefore starts with the submitter's own results.
- **Ballchasing commercial use** is unconfirmed in writing.
- **Riot:** the key's status in Vercel is unverified (sandbox returned 401); custom games, which is what LoL scrims are, may only be shown through Riot Sign On with a production key.
