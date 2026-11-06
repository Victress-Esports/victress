# Privacy, identity and safety architecture (proposal)

**Status: PROPOSAL. Nothing in this document has been implemented or applied.** No database, authentication, permission or application change is made until this design is approved.
Strategic basis: [docs/strategy/victress-business-purpose.md](../strategy/victress-business-purpose.md), section 3B (privacy, consent and player control; trustworthy recruitment) and section 4 (barriers women competitors face, including harassment).
Not legal advice. Items marked **LEGAL** need counsel before implementation.

---

## 1. What the database exposes today (verified from `supabase/migrations/`)

The anonymous API key ships to every browser, so anything the `anon` role can read is readable by anyone, in bulk, without using the website.

| Object | Who can read | What is exposed | Source |
|---|---|---|---|
| `profiles` | **Everyone, including anonymous.** RLS policy "profiles are publicly readable" is `using (true)`. | Every row: `id`, `handle`, `display_name`, `avatar_url`, `game`, `role`, `rank`, `team_id`, `bio`, `created_at`, `updated_at`, `search_indexable`, `is_demo` | `20261106000200` (policy, grants), `…0300`, `…0400`, `…0500` (further column grants) |
| `public_profiles` view | Everyone | Same fields plus team name and slug. It is `security_invoker`, so it inherits the open policy. | `20261106000200`, `…0500` |
| `stat_entries` | **Everyone, including anonymous** | All stat rows for every player (`profile_id`, `game`, `season`, `metrics`, `created_at`) | `20261106000200` ("stats are publicly readable") |
| `player_games` | Everyone | Every player's games, roles, ranks | `20261106000300` |
| `teams` | Everyone | `id`, `name`, `slug`, `owner_id`, which links a team to its owner's profile id | `20261106000200` |
| `team_members` | Only the member and teammates | Roster (this one is correct) | `20261106000200` |
| `leaderboard()` and counts | Everyone | Ranked players per game | `20261106000300` |
| `avatars` storage bucket | Public read by URL | Uploaded images; the path begins with the user's uuid | `20261106000200` |
| `/api/handle-check` | Everyone | A handle availability oracle (rate limit is in memory, per server instance) | `app/api/handle-check/route.ts` |
| `handle_new_user()` trigger | n/a | Copies the Google or Discord **real name and picture** into the public profile at signup | `20261106000200` |

Email addresses are not exposed (good), and there are no contact fields yet.

**Conclusion.** Profile data is public to the whole internet by default. The search opt-in (`search_indexable`) only controls `robots`, `noindex` and the sitemap. Any client can still run `GET /rest/v1/profiles?select=*` and page through every player, including real names and photos copied from Google or Discord. A directory scrape of every woman who signed up is possible today. This is the main risk the design must close.

---

## 2. Design principles
1. **Private by default.** A new profile is visible only to its owner until they choose to share it.
2. **Sharing is deliberate and granular.** Sharing a Player Resume by link is a feature players keep. It must be an explicit choice, with explicit choices about which parts are shown.
3. **Separate four layers** (strategy section 3B): account identity, public player identity, competitive records, private contact details.
4. **Enumeration resistance.** Public reads go through exact-handle lookups, never open table scans.
5. **Consent before disclosure.** Private contact details are revealed only through a recorded, revocable, per-recipient grant.
6. **Safety is a product feature.** Reporting, blocking and moderation ship before any feature that increases a player's exposure to strangers (Scout Desk, spotlights).
7. **Do not over-promise.** No claim of safety, compliance or anonymity beyond what is built and tested.

---

## 3. Identity model: four separated layers

| Layer | Holds | Who can see it | Where |
|---|---|---|---|
| **Account identity** | Email, provider ids (Google, Discord), auth metadata | Only the account owner and the service. Never public. | `auth.users` (unchanged) |
| **Public player identity** | Handle, optional display name, optional avatar, optional bio, optional team | Whoever the owner allows (section 4). Real name and provider picture are **never** copied in automatically. | `profiles` (changed) |
| **Competitive records** | Games, roles, ranks, stats and, later, matches with provenance (`self_reported`, `api`, `demo_parsed`) | Per game and per record type, as the owner allows | `player_games`, `stat_entries`, later match tables |
| **Private contact** | Email, Discord or other contact for recruiters | **No one by default.** Revealed to one named recipient through a consent grant (section 6). | New table `contact_methods`, no read access for other roles |

---

## 4. Visibility model

### 4.1 Levels (new column `profiles.visibility`, default `private`)
| Level | Meaning | Indexing |
|---|---|---|
| `private` (default) | Only the owner (and their teammates, section 4.3) can see the profile. Everyone else gets the same 404 as a handle that does not exist (no way to tell the two apart). | Never |
| `shared` | Anyone who visits `victress.gg/{handle}` can see the sections the owner has switched on. Not listed anywhere, `noindex`. This preserves today's shareable profile link. | No |
| `searchable` | `shared` plus search engines may index it. This is today's `search_indexable = true`, folded into the same model. | Yes |

Two further, separate consents (both default off):
- `scoutable`: whether verified recruiter accounts can find this player in Scout Desk (section 6). A player can be `private` publicly and still choose to be scoutable. This makes discovery a player decision and keeps visibility for women who want to be found by recruiters, not by everyone, under their control.
- `show_on_leaderboards`: whether the player appears on leaderboards.

### 4.2 Section controls inside a shared profile (all default off)
Show display name, show avatar, show bio, show team, show stats per game, show rank and role. Until the owner turns on a name, the profile shows only the handle. Provenance labels always travel with any stat that is shown.

### 4.3 Team context
Teammates see each other's display name, avatar, role and rank through the existing `is_team_member()` pattern, so rosters keep working without making anyone public.

### 4.4 Existing sharing and routing do not change
`victress.gg/{handle}`, `/join/{code}` and the OG image route keep their URLs. The change is what answers behind them: a `shared` or `searchable` profile renders as today, a `private` one returns the standard not-found page. With zero users in production today, there is no existing data to migrate. If any profiles exist at approval time, they are backfilled to `shared` so existing links keep working, and their owners are told.

---

## 5. Access architecture

### 5.1 Close anonymous table access
- Replace the open `profiles` policy (`using (true)`) with: owner reads own row, teammates read teammate rows via `is_team_member()`. Revoke `anon` and `authenticated` blanket `select` on `profiles`, `stat_entries`, `player_games`, and the `teams.owner_id` column.
- Public reads move to **`SECURITY DEFINER` functions** with a pinned `search_path` (the pattern already used by `claim_handle`, `leaderboard`, `sitemap_profiles`):
  - `get_shared_profile(p_handle)`: returns the profile only if `visibility <> 'private'`, and only the sections the owner enabled; returns nothing otherwise.
  - `get_shared_stats(p_handle, p_game)`: same rule, with provenance.
  - `leaderboard(...)`: restricted to `show_on_leaderboards` players (and the existing 10 player minimum).
  - `sitemap_profiles()`: unchanged rule (searchable only).
- The `public_profiles` view is retired in favor of those functions (a `security_invoker` view cannot read rows the caller may not read, and a `security definer` view is discouraged by Supabase advisors).

### 5.2 Application files that would change
`app/a/[handle]/page.tsx`, `app/api/og/profile/route.tsx`, `lib/profiles.ts`, `lib/leaderboard.ts`, `lib/sitemap-data.ts`, `app/a/leaderboard/[slug]/page.tsx`, `app/a/join/[code]/page.tsx`, `components/app/ProfileForm.tsx` (new controls), `types/database.ts`. Routes and URLs stay the same.

### 5.3 Reduce scraping of what remains public
- Exact-handle lookups only; no list endpoints for anonymous callers.
- Edge rate limiting (Vercel Firewall) on `/{handle}`, `/api/handle-check`, `/api/og/profile`, replacing the in-memory limiter.
- Uniform responses for private and non-existent handles (no oracle).
- Avatar objects get random file names; the bucket stays public by URL, but the URL is only ever sent to viewers the owner allowed. `robots.txt` is not a security control and is not relied on.

### 5.4 Signup defaults
`handle_new_user()` stops copying provider name and picture. The placeholder handle stays non-identifying. Onboarding and the profile editor offer explicit buttons ("Use my Google name", "Use my Discord picture") that read the provider's `identity_data` server side and save only when chosen, with the avatar host allow-listed (`cdn.discordapp.com`, `lh3.googleusercontent.com`) and the name clipped to 40 characters. Existing accounts are never overwritten.

---

## 6. Consent-controlled sharing and recruiter access

Needed before Scout Desk, designed now so Scout Desk cannot be built on an unsafe base.

### 6.1 Organizations and recruiters
- `organizations` (name, type: `team` | `collegiate` | `scouting`, verification status) and `org_members`. Recruiter accounts need the Scout entitlement **and** a manual Victress verification of the organization (impersonation is a real risk; criteria are an open decision).
- Recruiters never get table access. They use RPCs that return only scoutable profiles.

### 6.2 What a recruiter can see
For scoutable players only: handle and the sections the player enabled, game, role, rank, and the stats the player allows, always with provenance and context (role, sample size). No contact details. No in-platform messaging in the first release, which also removes the largest harassment surface.

### 6.3 Contact is a request, not a field
1. A recruiter sends a **contact request** (`contact_requests`: from org and member, to profile, short message, status `pending | accepted | declined | expired | withdrawn`).
2. The player sees who is asking (organization, verification status) and can accept, decline silently, or block.
3. Accepting creates a **contact grant** (`contact_grants`: to profile, grantee org or member, which `contact_methods` row, `expires_at`, `revoked_at`) that reveals the chosen method to that grantee only. The player can revoke at any time.
4. Every grant, view and revoke is written to an `access_log` (who, what, when). Players can see which organizations viewed or contacted them.

### 6.4 Minors (**LEGAL**)
Recruiter contact with players under 18 needs a legal position before it exists. Until then, players who are not confirmed adults are not scoutable and contact requests to them are not allowed. This depends on the age-enforcement proposal (a stored age band or confirmation, not a date of birth).

---

## 7. Reporting, blocking and moderation (minimum capability)

### 7.1 Blocking (`blocks`)
A blocked account cannot see the blocker's shared profile (it gets the not-found response), cannot send contact requests, and cannot use the blocker's team invite. Enforced inside the RPCs, not only in the interface. Blocks are private; the blocked party is not notified.

### 7.2 Reporting (`reports`)
- A report button on shared profiles, contact requests and teams.
- Fields: reporter, target type and id, reason (`harassment | impersonation | hate | sexual_content | minor_safety | privacy_violation | spam | other`), details (limited length), status (`open | triaged | actioned | dismissed`), timestamps.
- Reporters can insert and see the status of their own reports; nobody else can read them. Staff review through a server-only path.

### 7.3 Moderation actions (`moderation_actions`, `profiles.moderation_state`)
Staff can hide a profile, suspend an account, or remove content (avatar, bio, handle), with reason, actor and optional expiry. A profile reported for `minor_safety` or serious harassment can be hidden pending review.

### 7.4 Workflow (operational, not just technical)
- Intake: report rows plus an email alert to a monitored mailbox (Resend, already used).
- Interim tooling: Supabase dashboard and SQL for the first release; a protected admin screen later.
- Severity tiers with internal response targets. These are internal goals, **not public commitments**, until Victress has people to meet them.
- Evidence retention, an appeals path, and a documented process for legal requests and for reporting illegal content (**LEGAL**).
- Decision needed: who reviews reports, and during what hours.

### 7.5 Other protections
Handle reservation and basic content checks stay, but automated filtering is not relied on alone. Pseudonymous handles are the default. Team invite codes can already be regenerated (`regenerate_invite_code`); the owner can also remove members (`remove_team_member`).

---

## 8. Data lifecycle
- Self-serve account deletion and data export (not built today). Deletion cascades player data; report records are retained minimally for safety.
- `access_log` retention period and what players can see (**decision and LEGAL**).
- Provenance and verification do not change the privacy rules: a verified record is still shared only as the owner allows.

---

## 9. Compatibility with what exists
| Existing feature | Effect | Mitigation |
|---|---|---|
| Shareable profile URL | Unchanged for `shared` and `searchable` | Served through `get_shared_profile`; private is a uniform 404 |
| Search opt-in | Folded into `visibility = searchable` | Same sitemap and indexing rules |
| Dashboard, own stats, profile editing | Unchanged (owner policy) | Covered by tests |
| Team rosters | Teammates still see each other | `is_team_member()` policy |
| Leaderboards | Only players who opted in appear | New flag; existing 10 player minimum stays |
| OG images, sitemap | Must respect visibility | Updated routes (section 5.2) |
| Join links | Unchanged | `team_invite_info` stays |

---

## 10. Phased delivery and tests (after approval)
1. **Foundation migration (additive, rolled-back test first):** `visibility`, `scoutable`, `show_on_leaderboards`, `blocks`, `reports`, `moderation_actions`; new policies and functions; revoke anonymous table reads. Update the app to call the functions. Tests: anonymous cannot `select` from `profiles`, `stat_entries`, `player_games`; owner can; shared profile resolves via the function; private returns nothing; teammates see each other; blocked users get nothing; leaderboards exclude non-opted-in players; claim handle, team create and join still pass; Playwright confirms share link, private 404 and OG image behavior.
2. **Signup privacy:** `handle_new_user()` change and the explicit provider-choice actions.
3. **Contact consent and organizations** together with Scout Desk (needs billing entitlements).
4. **Moderation tooling** beyond the interim dashboard path.
Production application of each step needs separate approval.

---

## 11. Decisions needed
1. Approve the three visibility levels plus the separate `scoutable` and leaderboard consents.
2. Approve moving all public reads to exact-handle functions (closing anonymous table reads), accepting that handles remain guessable one at a time.
3. Who reviews reports, and the interim tooling choice.
4. Recruiter organization verification criteria.
5. **LEGAL:** age handling and recruiter contact with minors; retention; legal requests; whether any gender self-identification is ever collected (not proposed; it would be voluntary, opt-in and legally reviewed).
