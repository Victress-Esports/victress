# Readiness review: gaps, contradictions and risks before the next approval cycle

**Status: REVIEW. This is not an approval document.** Founder directions recorded on 2026-11-06 are in the [decision register](decision-register.md); where this review says "proposed", check the register for the current status. No approval authorizes implementation, and every technical or legal question not marked resolved here is unresolved.
Inspected on 2026-11-06: branch `claude/strategy-foundation` at `9bf9c2c` (at the time of inspection: identical to the remote, clean tree, no later commits, no non-documentation changes versus `claude/design-pass`); the strategy document; `CLAUDE.md`; all six proposals and the README; the five migrations in `supabase/migrations/`; `app/api/*`, `lib/ratelimit.ts`, `next.config.ts`; and a read only aggregate query of the production database (section 4).

---

## 1. Contradictions and inaccuracies

| # | Finding | Where | Effect | Proposed resolution |
|---|---|---|---|---|
| C1 | **"Separate" versus "core expression."** The strategy document says Women in Esports is not "a separate business" or product; the latest instruction calls it "a separate shared-value/community-impact expression under the Victress master brand." | strategy section 4, `CLAUDE.md`, latest direction | Copy and `CLAUDE.md` cannot satisfy both literally | Resolved (decision 9, 2026-11-06): the strategy document governs; core expression through the three pillars. `CLAUDE.md` already matches |
| C2 | **README presented undecided items as decided.** "Approved direction" listed the About rewrite and verified organizations as decided; the criteria and the About draft are not approved | `README.md` | Risk of treating proposals as approved | README rewritten to separate *approved in direction* from *awaiting approval* (done in this package) |
| C3 | **Decision count.** README listed 12 decisions; the register uses your 11 | `README.md` | Confusion in the approval cycle | Register uses the 11; extra README items are folded in as sub-decisions (log scrubbing into 1, turnaround into 7, free allowance into the entitlement follow up) |
| C4 | **Roster composition claim is not enforced.** "Up to 10 (8 players and 2 coaches)" appears in `app/llms.txt/route.ts` and `components/app/TeamPanel.tsx`, and was repeated in the entitlements draft. The database caps **10 members total** and no function ever assigns the `coach` role | migrations `…0200`, `…0300` | An existing public claim exceeds functionality; the entitlements draft repeated it | Correct the entitlements draft now (done). Correct `llms.txt` and `TeamPanel` after approval (application change, not made here) |
| C5 | **"Owns more than one team" is already impossible.** A player can be in only one team (`already_in_team`, `in_other_team`, single `profiles.team_id`) | `…0300` | Informs decision 8 | Decision 8 direction (one team per Team subscription) fits the current schema, so no schema change is implied. Entitlements annotated (done) |
| C6 | **Link sharing versus gating.** The privacy design says link sharing can ship before safety readiness, but a link can be posted publicly, producing a public page without the directory opt in or any responder | privacy section 8, safety section 1 | Contradicts "no exposure increasing features without operational readiness" in spirit | Direction recorded in decision 5: link sharing does not launch until the Trust and Safety Owner, deputy, coverage schedule, time zone and report channel are established. None is established yet |
| C7 | **Coach seats.** The latest direction lists "coach seats" as Team only; the existing schema already has a `coach` role value inside the 10 member roster | entitlements | Ambiguous | Decision 8: coach permissions are a separate entitlement concept and are not implemented |
| C8 | **Entitlements draft lists extra Team only items** (team portfolio, team page features) beyond your list of pooled scrim analysis, player comparisons, team history and coach seats | entitlements 3A | Possible scope creep | Still unconfirmed: decision 8 did not address team portfolio or team page features; they remain proposals |

---

## 2. Privacy architecture: token security and authorization boundaries

Priority P0 = must be settled before the privacy migration is written. P1 = must be settled before launch.
Status key: items decision 1 approved as design direction are marked "approved direction"; everything else is a proposal. Nothing here is authorized for implementation.

### Token handling
- **R1 (P0, approved design direction, decision 1). Hash in the application server; the database never sees the token.** The current design passes the plaintext token to `resolve_share_link(p_token)`, so it would appear in PostgREST and database query logs and in error traces, even though only a hash is stored. Instead the Next.js server generates the token (Node `crypto.randomBytes(32)`), computes `sha256`, stores only the hash, and resolves with `resolve_share_link(p_hash)`. Plaintext exists only in the URL and in the server's memory for the request.
- **R2 (P0; server side resolution approved as direction, mechanism awaiting technical evidence). Authorization boundary: PostgREST is itself an anonymous endpoint.** Any function granted to `anon` can be called directly by anyone with the public anon key, bypassing the website, its headers and any Vercel edge rules. Therefore edge rate limiting and "uniform not found" in the Next.js route do not protect the functions. Options: **(A)** token resolution, directory and leaderboard functions are *not* executable by `anon` or `authenticated`; only the Next.js server calls them with a narrowly scoped server credential (a dedicated Postgres role with only `EXECUTE` on those functions, not the full service role key). **(B)** leave consented public functions callable by `anon` (acceptable for opted in directory and leaderboard data, because that data is public by consent) and rely on token entropy (256 bits, so brute force is infeasible) for token resolution. *Recommended:* A for token resolution, B acceptable for directory and leaderboard. Needs technical evidence: how Supabase supports a scoped role or signed JWT claim for server calls.
- **R3 (P1, not yet confirmed). Token in the URL path versus fragment.** A path token appears in browser history, proxies, Vercel request logs and chat app logs. A fragment (`/r#token`) never reaches servers but blocks server rendering and link previews. *Recommended:* path token with `Referrer-Policy: no-referrer`, log scrubbing, and no third party assets or scripts on token pages (a CSP enforces this). Evidence needed: what Vercel and Supabase allow for log scrubbing and retention.
- **R4 (P1, approved direction). Link previews outlive revocation.** Chat apps (Discord, Slack and others) fetch and cache the preview card and image. Revocation cannot purge those caches. Default the social preview of a token link to **generic** (Victress mark and the handle or display name only if the link allows it; never avatar or stats unless the owner opts in), and say so when the link is created.
- **R5 (P0, approved direction). Caching.** Token pages and the RPC calls behind them must never be cached: `dynamic = "force-dynamic"`, `Cache-Control: private, no-store`, and fetches with no data cache. A Next.js or Vercel cache would keep serving a revoked link.
- **R6 (P1, not yet confirmed). Image optimizer and signed avatar URLs.** `next.config.ts` allows `*.supabase.co` through the Next image optimizer, which can cache images by URL; a signed avatar URL could be cached and served to others after revocation. Private avatars must bypass the optimizer (unoptimized or an authenticated proxy), and the `*.supabase.co` allow pattern should be reviewed.
- **R7 (P1; link limits approved as direction, default expiry awaiting counsel, rest not separately confirmed). Link limits and schema.** Cap active links per player, rate limit creation, bound label length, decide the default expiry (none or a default such as 90 days), and validate the per link `fields` JSON against a fixed schema (reject unknown keys) so a field flag cannot be silently ignored.
- **R8 (P1, approved direction). Robots.** Do **not** add `Disallow: /r/` to `robots.txt`: a crawler that finds a leaked link must be able to read the `noindex` header. The path is never linked from public pages.
- **R9 (P1, not yet confirmed). Uniform responses and timing.** Run the same hash and lookup path for all inputs and return the same status, body shape and headers. Timing equality is verified statistically in tests; it is not guaranteed and is not claimed.
- **R10 (P2, not yet confirmed). View counts include bots and unfurlers.** Count only after basic bot filtering and present counts as indicative, never as proof that a person viewed.

### Other authorization boundary and anonymous endpoint gaps
The "Blocks" and "Outstanding" columns are this review's classification, not decisions. All nine gaps are unresolved.

| # | Gap and detail | Blocks | Outstanding action or evidence |
|---|---|---|---|
| G1 | **Other anonymous APIs on the same database.** Supabase exposes GraphQL (`pg_graphql`) and may expose Realtime. Closing table grants and policies closes these too, but both must be verified on the live project after migration (advisors and direct requests). No Realtime publication appears in the migrations | Verification after the contract step | Evidence: live check of both interfaces |
| G2 | **Existence oracles beyond directory and handle check.** `claim_handle` errors ("taken"); the placeholder handle; `team_invite_info(code)` (a capability, acceptable); avatar storage paths that begin with the user id; `profiles.id` appearing in public responses. Directory responses should use opaque public ids | Design | Founder: scope and handling of each item; no decision recorded |
| G3 | **Placeholder handle leaks part of the user id.** `handle_new_user()` sets the handle to `p` plus the first 12 hex characters of the auth user id, so a public handle discloses 48 bits of an internal identifier. Proposal: a random placeholder not derived from the id, as part of the signup migration | Signup migration design | Founder: confirm; not yet approved |
| G4 | **Teammate audience is conflated with the owner.** Section 4 of the privacy design gives teammates whatever the owner shows. A leaked invite code lets a stranger join and see members' names and pictures. Proposal: a separate *team* audience with minimal defaults and its own field flags, and an optional owner approval step for joins. Invite regeneration exists | Design | Founder: team audience defaults and join approval; no decision recorded |
| G5 | **Search flag dependency.** `search_indexable` must be valid only with `directory_listed` (a check constraint plus a trigger that clears it when the directory opt in is removed). Search engines drop pages only on re-crawl; state that honestly | Design | Founder: confirm the constraint and trigger |
| G6 | **Who may report from a token page.** Not specified. Options: signed in users only, or anonymous reports with a human check. Anonymous reporting enables abuse; signed in only misses some viewers | Launch of link sharing | Founder; depends on the report channel (decision 5, not established) |
| G7 | **Demo data and previews.** Demo players (`is_demo`) and the preview environments use the directory and leaderboard rules too; seed data needs the consent flags set. Whether preview environments can reach production data is **unverified** | Implementation | Evidence: how previews are configured |
| G8 | **Handle namespace.** `/r/{token}` does not collide with handles (verified: handles are 3 to 20 characters, so `r` is not valid), but every new top level route must be added to the reserved handle list | New routes only | None now; reserve names when routes are added |
| G9 | **The weak rate limiter.** `lib/ratelimit.ts` is in memory per server instance, so it does not hold across instances. Edge rules are needed (capability and plan unverified) | Implementation of decision 2 | Evidence: edge rate limiting capability on the current plan |

---

## 3. Anonymous endpoint behavior (target versus today)
| Surface | Today | Target | Open issue |
|---|---|---|---|
| PostgREST tables (`profiles`, `stat_entries`, `player_games`, `teams.owner_id`) | Anyone can read all rows | No anonymous access | Verify GraphQL and Realtime too (G1) |
| `/{handle}` | Shows any profile | Directory opted in only; uniform not found otherwise | Timing equality (R9) |
| `/r/{token}` | Does not exist | Token resolution, no store, no referrer | R1 to R5 |
| `/api/og/profile` | Any handle | Token or opted in handle | Generic preview default (R4) |
| Directory, leaderboard, sitemap | Open | Opted in only | R2 option B accepted for consented public data |
| `/api/handle-check` | Anonymous, in memory limiter | Decision 2 | G9 |
| Avatars | Public bucket by URL | Private bucket, signed URLs | R6 |

---

## 4. Existing profile exposure and migration safety

### Evidence (read only aggregate counts, 2026-11-06)
Auth users 0, profiles 0, teams 0, team members 0, stat entries 0, player games 0, waitlist 0, avatar objects 0. The 5 applied migrations equal the 5 in the repository. **No profile is exposed today, and no backfill is needed today.**
Not verifiable from here: whether victress.gg is publicly reachable with sign in enabled, and the live Vercel configuration. The count can change at any time.

### Risks
1. **A signup before the migration creates a public profile** with the provider's real name and picture (the current trigger copies them), and the open read policy lets anyone enumerate it. Scraped copies cannot be recalled.
2. **Ordering.** Per decision 4 the whole privacy migration (expand, switch and contract) must be complete before public sign in opens. In particular the signup trigger change must precede the first real signup.
3. **Application and database must change together.** The app reads `profiles`, `public_profiles`, `stat_entries`, `player_games` and `leaderboard()` as `anon` today; `/api/handle-check` queries `profiles` as `anon`, and the social card and sitemap routes read public data the same way. Revoking access before the app uses the new functions breaks the site.
4. **Default privileges.** New Postgres functions are executable by `PUBLIC` by default. Every new function must explicitly revoke from `public`, `anon` and `authenticated` and grant only what is intended (16 of the 22 existing functions have an explicit revoke; the other six are two pure helpers and four intentionally public read functions; new functions must be explicit).
5. **Generated types** (`types/database.ts`) and RPC signatures change.

### Recommended sequence (expand, then contract)
1. **Expand (additive, rolled back test first):** new columns (`visibility` or the separate consent flags), `profile_share_links`, new functions with explicit grants, the new signup trigger and random placeholder handle. Old policies still in place.
2. **Switch:** deploy the application reading only through the new functions (`/r/{token}` live, `/{handle}` restricted to opted in players).
3. **Contract:** replace the open policies with owner and teammate only; revoke anonymous table and column grants; retire `public_profiles` and the old `sitemap` and `leaderboard` signatures; make the avatar bucket private.
4. **Verify on the live project:** run the negative tests (privacy document section 10), the Supabase advisors, direct REST, GraphQL and storage requests as `anon`.

Each of expand, switch and contract needs its own explicit authorization, an immediate profile count check (stop and plan if profiles exist), the rolled back negative test suite passing with pre-existing rows, and a rollback plan. Authorization to begin the milestone is not authorization to execute any production step.

### If profiles exist before the migration
Decision 4 requires work to stop and a specific migration plan and owner communication plan to be prepared for the founder's review. Nothing about handling, notification wording or timing is approved. For orientation only: provider copied names cannot be told apart from names the player typed, so any approach (making all existing profiles private, blanking copied names, or grandfathering them) has privacy trade-offs the founder must decide. No option is proposed as the default.

### Tests to write before any production application
Rolled back transaction suites with **pre-existing rows**: owner can read and edit own data; anonymous and other authenticated users cannot read private rows through tables, functions, GraphQL or storage; opted in profiles appear only with their enabled fields; revocation and expiry are immediate; token functions never return plaintext or accept handles; claim handle, team create and join, stat entry and leaderboard minimum still work; signup trigger no longer copies provider data and generates a random placeholder.

---

## 5. Operational gaps that could prevent launch
- No named Trust and Safety Owner, deputy, hours or reporting mailbox (decision 5).
- No community guidelines, acceptable use or recruiter terms (legal).
- No data breach and incident response plan, and no process for access, deletion and export requests; self serve deletion and export are not built.
- No policy for backups containing deleted data, or retention for access logs, report records and verification evidence.
- Immutable verification records can conflict with deletion rights (legal).
- Staff tooling for reports and verification does not exist; interim dashboard and SQL access needs defined permissions.
- No process for Victress staff access to private data (who, why, audit).
- Edge rate limiting and log scrubbing are unverified capabilities.
- Terms and privacy text are placeholders pending legal review, and marketing must not claim privacy or safety features before they ship.

---

## 6. What cannot responsibly be decided without counsel or evidence

**Qualified legal counsel (L):** age thresholds and recruiter contact with minors; whether player initiated link sharing is acceptable for players of unknown age; the data Victress may collect about age; recruiter terms and code of conduct; retention of access logs, report records, verification evidence and backups; deletion versus immutable records; mandatory reporting and handling of illegal content; legal requests; breach notification; consent text for people appearing in demo files; privacy and terms text; any COPPA or other compliance statement (none may be made without counsel).

**Technical evidence (T):** Vercel edge rate limiting and log scrubbing capabilities and plan; scoped server credential options in Supabase (R2); GraphQL and Realtime exposure on the live project; parser reliability, attribution, file sizes and compute cost on real demos (decision 11); whether signed avatar URLs can bypass the image optimizer cleanly; whether victress.gg is reachable and sign in is enabled.

**Founder (F):** all 11 decisions; the "separate" wording (C1); link sharing gating (C6); coach seats and Team only items (C7, C8).

**Operational ownership (O):** Trust and Safety Owner and deputy; reviewers; engineering contact for protective actions; who performs organization verification.

---

## 7. Recommended next implementation milestone
**Milestone 1: Privacy and access foundation, design freeze and test first build (no production application).**
- *Entry criteria (see the register's conditions section):* the founder's explicit written authorization naming the scope; confirmation of which of R3, R6, R9, R10, the rest of R7 and G1 to G9 are in scope; the technical evidence listed there; acceptance of the migration safeguards (decision 4). Decisions 1 to 4 are approved as direction or with conditions, which is not authorization. The Trust and Safety appointments (decision 5) and counsel's answer on link sharing for players of unknown age are required before link sharing launches, not before the milestone begins.
- *Work (after approval, not before):* write the additive migration and the negative test suite; run them in rolled back transactions; update the application to use the new functions behind the expand and switch steps; regenerate types.
- *Exit criteria:* every negative test passes with pre-existing rows; the advisors are clean; each of the expand, switch and contract steps has its own authorization request with a rollback plan.
- *In parallel, no code:* establish the Trust and Safety appointments (decision 5, not yet established) and engage counsel (decision 10, approved work). Demo files and consent (decision 11) are deferred and separate from this milestone.

Dependency order is unchanged: privacy architecture, minimum safety readiness, provenance schema, scrim validation spike (when real files exist), entitlements, organization verification, Scout Desk planning. **No first game integration is approved** and none is proposed until validation evidence exists.
