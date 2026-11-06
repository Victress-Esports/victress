# Privacy, identity and access architecture (proposal, revision 2)

**Status: PROPOSAL. Nothing here is implemented or applied.** No database, authentication, permission or application change is made until this design, and the production application of each step, is approved separately.
Basis: [docs/strategy/victress-business-purpose.md](../strategy/victress-business-purpose.md), section 3B (privacy, consent and player control; trustworthy recruitment) and section 4.
Related proposals: [safety operations](safety-operations.md), [organization verification](organization-verification.md), [minors and recruiter access](minors-and-recruiter-access.md), [entitlements](entitlements.md).
Not legal advice. Items marked **LEGAL** need counsel.

**Approved direction this revision implements:** private by default; separate player consent for public discovery and for leaderboards; deliberate Player Resume sharing.
**What changed from revision 1:** revision 1 used exact-handle lookups as the way to reach a shared profile. That is withdrawn. A handle is a public name that anyone can guess or ask about, so it must never act as access control. Link sharing now uses separate, high entropy, revocable sharing tokens (section 5), and the public directory is limited to players who explicitly opt in (section 4).

---

## 1. What the database exposes today (verified from `supabase/migrations/`)
The anonymous API key ships to every browser, so anything the `anon` role can read is readable by anyone, in bulk, without using the website.

| Object | Who can read today | What is exposed | Source |
|---|---|---|---|
| `profiles` | **Everyone, including anonymous.** Policy "profiles are publicly readable" is `using (true)`. | Every row: `id`, `handle`, `display_name`, `avatar_url`, `game`, `role`, `rank`, `team_id`, `bio`, `created_at`, `updated_at`, `search_indexable`, `is_demo` | `20261106000200`, `…0300`, `…0400`, `…0500` |
| `public_profiles` view | Everyone (`security_invoker`, so it inherits the open policy) | Same fields plus team name and slug | `…0200`, `…0500` |
| `stat_entries` | **Everyone, including anonymous** | All stat rows for every player | `…0200` |
| `player_games` | Everyone | Every player's games, roles, ranks | `…0300` |
| `teams` | Everyone | `id`, `name`, `slug`, `owner_id` (links a team to its owner's profile) | `…0200` |
| `team_members` | Only the member and teammates | Roster (correct) | `…0200` |
| `leaderboard()` and count functions | Everyone | Ranked players per game | `…0300` |
| `avatars` storage bucket | Public read by URL; path starts with the user id | Uploaded images | `…0200` |
| `/api/handle-check` | Everyone | Whether a handle is taken (in-memory rate limit, per instance) | `app/api/handle-check/route.ts` |
| `/api/og/profile` | Everyone | Social card for any handle | `app/api/og/profile/route.tsx` |
| `handle_new_user()` trigger | n/a | Copies the Google or Discord **real name and picture** into the public profile at signup | `…0200` |

Email addresses are not exposed, and there are no contact fields yet. Search opt-in (`search_indexable`) controls only `robots`, `noindex` and the sitemap; it does not make anything private. Today anyone can run `GET /rest/v1/profiles?select=*` and page through every player.

---

## 2. Principles
1. **Private by default.** A new profile is visible only to its owner.
2. **A handle is a name, never a key.** Access to private material is granted by an unguessable token or by a recorded consent, never by knowing or guessing a handle, an id or a URL pattern.
3. **Each audience is a separate consent**, and none implies another.
4. **Private fields stay private everywhere**: direct table requests, RPCs, storage URLs, social cards, sitemaps and error behavior. Closing the web page is not enough.
5. **Separate four layers**: account identity, public player identity, competitive records, private contact.
6. **Consent before disclosure; revocation takes effect immediately.**
7. **No claim of anonymity or safety beyond what is built and tested.**

---

## 3. Identity layers
| Layer | Holds | Visible to | Where |
|---|---|---|---|
| Account identity | Email, provider ids, auth metadata | The owner and the service only | `auth.users` (unchanged) |
| Public player identity | Handle, optional display name, avatar, bio, team | Only audiences the owner enables (section 4) | `profiles` (changed) |
| Competitive records | Games, roles, ranks, stats, later matches with provenance (`self_reported`, `api`, `demo_parsed`) | Per record type and audience, as the owner allows | `player_games`, `stat_entries`, later match tables |
| Private contact | Email, Discord or other contact | **No one by default.** Revealed to one named recipient through a consent grant | New `contact_methods`, no read access for any other role |

---

## 4. Audiences and consents (all default off)
A player has a private profile and may grant five separate things:

| # | Audience | Mechanism | Listed or findable? | Search indexing |
|---|---|---|---|---|
| 0 | **Owner** (and their teammates, for team context) | Always | No | No |
| 1 | **People the owner sends a link to** | Sharing token (section 5) | No. Not discoverable | Never (`noindex`) |
| 2 | **Public directory** | `profiles.directory_listed`, explicit opt in | **Yes**, on the public directory and at `victress.gg/{handle}` | Only if a further separate flag is on |
| 3 | **Search engines** | `profiles.search_indexable` (exists today), valid only with 2 | Yes | Yes |
| 4 | **Recruiters** (Scout Desk) | `profiles.scoutable`, explicit opt in. **Gated** (see section 8 and the other proposals) | Only to verified organizations | No |
| 5 | **Leaderboards** | `profiles.show_on_leaderboards`, explicit opt in | Yes, as handle only unless the name is also shared | No |

Rules:
- **Public directory access is limited to players who explicitly opt in.** Public pages, the directory listing, search results and the sitemap read only profiles with `directory_listed = true`. There is no anonymous path that returns a profile that has not opted in.
- `victress.gg/{handle}` serves only directory listed profiles. For every other handle (private, link-only or non-existent) it returns the **same** not-found response with the same timing and headers, so it reveals nothing.
- **Per-field audience flags** (all off by default): display name, avatar, bio, team, stats per game, rank and role. Each audience (link, directory) has its own field settings, so a player can show more to a recruiter's link than to the public directory. Provenance labels always travel with any stat shown.
- Teammates see each other's display name, avatar, role and rank through the existing `is_team_member()` pattern, so rosters work without making anyone public.

---

## 5. Link sharing with sharing tokens (replaces exact-handle lookup)

A Player Resume is shared deliberately by creating a **sharing link**. The link is `https://victress.gg/r/{token}`; it never contains the handle or id.

### 5.1 Token properties
- **High entropy:** 32 bytes (256 bits) from a cryptographically secure random generator, encoded base64url (43 characters). Not derived from the handle, user id, time or a counter. Unguessable by enumeration.
- **Stored hashed.** The database stores `sha256(token)`, never the token. Because the token is random and long, an unsalted hash is sufficient; a database read does not yield working links. The full link is shown **once** at creation, with a copy button; losing it means creating a new link.
- **Revocable and expiring.** Revocation sets `revoked_at` and takes effect on the next request. Optional `expires_at`. A player may keep several links (for example one per recruiter or team), each with a label, so one can be revoked without breaking the others.
- **Scoped.** Each link carries its own field settings (section 4), defaulting to the player's link defaults.
- **Accountable to the owner.** The player sees each link's label, creation date, expiry, view count and last viewed time. Detailed viewer identity is not collected.

### 5.2 Table (proposed shape, not final SQL)
`profile_share_links(id, profile_id, token_hash unique, label, fields jsonb, created_at, expires_at, revoked_at, last_viewed_at, view_count)`. Owner can insert, update (label, revoke) and select their own rows; **no other role has any access**. A function creates the link and returns the token once.

### 5.3 Resolution
`resolve_share_link(p_token)` is `SECURITY DEFINER` with a pinned `search_path`. It hashes the token, finds a non-revoked, non-expired link, and returns **only** the fields that link allows. Invalid, revoked, expired and unknown tokens all return the identical not-found response (same shape and timing). It is the only way token links reach data.

### 5.4 Web behavior for token pages
- `Referrer-Policy: no-referrer`, so the token is not leaked to third party sites.
- `X-Robots-Tag: noindex, nofollow` and `Cache-Control: private, no-store`, so neither search engines nor shared caches keep it, and revocation is immediate.
- The social card (`/api/og/profile`) accepts a token, not a handle, and renders only fields the link allows. Chat apps that unfurl the link fetch it like any viewer; this is a known property of sharing a link to a chat.
- Platform and server logs record request URLs. Production logging must scrub or hash `/r/` path segments.
- Rate limiting at the edge on `/r/*`; repeated invalid tokens from one source are blocked.

### 5.5 Honest limits
A link works for whoever holds it, including anyone it is forwarded to. The product states this at creation. Revocation stops future views but cannot unsee what was already viewed or copied. Players who need tighter control can scope fields, set an expiry, and revoke.

---

## 6. Access architecture

### 6.1 Close anonymous table access
- Replace the open `profiles` policy with: owner reads own row; teammates read through a roster function. Revoke `anon` and `authenticated` blanket `select` on `profiles`, `stat_entries`, `player_games`, the `teams.owner_id` column and anything else holding profile data.
- All non-owner reads happen through `SECURITY DEFINER` functions that check the relevant consent flag:
  - `resolve_share_link(token)` (section 5)
  - `get_directory_profile(handle)`: only if `directory_listed`; otherwise identical not-found
  - `list_directory(filters, page)`: only opted in players, only fields they chose to show, page size limited, no total count of hidden rows
  - `leaderboard(...)`: only `show_on_leaderboards` players (the 10 player minimum stays)
  - `sitemap_profiles()`: only `directory_listed and search_indexable`
  - `team_roster()`: teammates only
- Retire the `public_profiles` view (a `security_invoker` view cannot read rows the caller may not read, and `security definer` views are discouraged by Supabase advisors).

### 6.2 Every anonymous surface and its new rule
| Surface | New behavior |
|---|---|
| PostgREST `profiles`, `stat_entries`, `player_games`, `teams.owner_id` | No anonymous access |
| `/{handle}` | Directory listed profiles only; uniform not-found otherwise |
| `/r/{token}` | Token resolution only (section 5) |
| `/api/og/profile` | Token or directory listed handle; uniform not-found otherwise |
| Leaderboard RPCs and pages | Opted in players only |
| Sitemap | Directory listed and search indexable only |
| `team_invite_info(code)` | Unchanged (a join code is already a capability) |
| `/api/handle-check` | Rate limited at the edge; answers only "available" or "not available", so it does not reveal whether a profile is public, private or reserved. Whether to require sign in is a decision (section 10) |
| Avatars (storage) | Private bucket, short lived signed URLs minted by the functions above (section 6.3) |

### 6.3 Avatars and provider pictures
Make the `avatars` bucket private and have the functions mint signed URLs only for allowed viewers, so a revoked link or an unlisted profile cannot leak a photo through a remembered URL. When a player chooses "use my Google or Discord picture", the server **copies it into the private bucket** rather than hot-linking the provider's public URL, so revocation is effective. Allow-listed provider hosts (`cdn.discordapp.com`, `lh3.googleusercontent.com`) are used only for the one time fetch.

### 6.4 Signup defaults
`handle_new_user()` stops copying provider name and picture. The placeholder handle remains non-identifying. Onboarding and the profile editor offer explicit choices that read the provider's `identity_data` server side and save only on the player's action. Existing accounts are never overwritten.

### 6.5 Application files that would change
`app/a/[handle]/page.tsx`, new `app/a/r/[token]/page.tsx`, `app/api/og/profile/route.tsx`, `lib/profiles.ts`, `lib/leaderboard.ts`, `lib/sitemap-data.ts`, `app/a/leaderboard/[slug]/page.tsx`, `components/app/ProfileForm.tsx` (audience, field and link controls), `types/database.ts`. The `/{handle}` and `/join/{code}` routes stay; `/{handle}` is then directory only. Preview and routing rules in `middleware.ts` are unchanged.

---

## 7. Consent-controlled recruiter access and contact (summary)
Unchanged in principle from revision 1, and **gated** until the preconditions in section 8 are met. Recruiters never get table access; they use RPCs that return only `scoutable` profiles, only for verified organizations ([organization verification](organization-verification.md)). Contact is a request the player accepts, which reveals one chosen contact method to one recipient through a revocable, logged grant; private contact details are never a profile field. No in-platform messaging in the first release. Recruiter discovery and contact for minors: see [minors and recruiter access](minors-and-recruiter-access.md).

---

## 8. Exposure-increasing features are gated
The public directory, the `scoutable` flag, contact requests, Scout Desk, named leaderboards and player spotlights increase a player's exposure to strangers. They do **not** ship until all of the following are in place: the privacy foundation (this document), a staffed reporting and blocking capability ([safety operations](safety-operations.md)), organization verification where recruiters are involved, and the legal review for minors. Link sharing, which the player controls and revokes, can ship with the privacy foundation.

---

## 9. Compatibility with what exists
| Existing feature | Effect | Mitigation |
|---|---|---|
| Shareable profile URL `victress.gg/{handle}` | **Changes meaning**: it now works only for players who opted into the public directory. Link sharing moves to `/r/{token}`. | Zero users in production today, so no existing links break. **Precondition:** confirm the profile count at approval time; if any exist, decide between a one time notice and a temporary directory opt in for them |
| Search opt-in | Becomes valid only with directory opt in | Same sitemap and indexing rules |
| Dashboard, own stats, editing | Unchanged (owner policy) | Covered by tests |
| Team rosters | Unchanged for teammates | Roster function |
| Leaderboards | Opted in players only | New flag; 10 player minimum stays |
| OG images, sitemap | Respect the new consents | Updated routes |
| Join links | Unchanged | `team_invite_info` |

---

## 10. Phases and tests (after approval; each production step needs separate approval)
1. **Foundation migration** (additive, rolled-back test first): consent columns, `profile_share_links`, new functions, new policies, revoked anonymous reads. App updated to call the functions.
2. **Signup privacy** and the private avatar bucket.
3. **Safety tables and tooling** ([safety operations](safety-operations.md)).
4. **Organizations, recruiter access, contact consent** (gated, with Scout Desk).

**Required negative tests (all must pass before production):**
- Anonymous `select` on `profiles`, `stat_entries`, `player_games` and `teams.owner_id` returns nothing or is denied.
- `/{handle}` for a private profile, a link-only profile and a non-existent handle return identical responses and comparable timing.
- A private field (bio, name, avatar, stats) is absent from every response when its flag is off, across RPCs, OG images and sitemaps.
- Token properties: 43 character random tokens; only the hash is stored; a revoked or expired token returns the uniform not-found at once; a handle or id cannot be substituted for a token.
- Token pages send `Referrer-Policy`, `noindex` and `no-store` headers.
- Directory and leaderboard functions return only opted in players and never reveal how many hidden profiles exist.
- Existing flows (claim handle, team create and join, stat entry, owner editing) still pass.

---

## 11. Decisions still needed
1. Approve the token sharing design (hash only storage, shown once, per link field scope, expiry, `no-referrer`).
2. `/api/handle-check`: keep anonymous with edge rate limiting, or require sign in?
3. Copy provider pictures into the private bucket (recommended) or offer upload only?
4. Production profile count at approval time, and how any existing profiles are handled (section 9).
5. Log scrubbing for `/r/` URLs on Vercel and Supabase.
6. **LEGAL:** retention of access logs and report records; whether link sharing is acceptable for players whose age Victress does not know (see [minors](minors-and-recruiter-access.md)).
