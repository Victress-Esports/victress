# Decision register (11 decisions)

**Nothing in this register authorizes implementation.** An approved design direction, a provisional approval or an approval with conditions records what the founder has decided about *direction*. It is not permission to change application code, database schema, migrations, authentication, production configuration, billing or pricing. Each implementation step needs its own explicit authorization.
Founder direction recorded: 2026-11-06. Branch `claude/strategy-foundation` (documentation only). Context: [readiness review](readiness-review.md), [README](README.md), [strategy document](../strategy/victress-business-purpose.md).

Approval types still needed: **F** founder. **L** qualified legal counsel. **T** technical evidence. **O** operational ownership (a named person must accept).

## Status legend
| Status | Meaning |
|---|---|
| **Approved design direction** | The founder approved the design as the direction. Details may still need confirmation. Not authorization to implement. |
| **Approved provisionally** | Approved for now, expected to be reviewed when conditions (such as real staffing) are known. |
| **Approved with conditions** | Approved only if the stated conditions are met. Conditions are listed in the entry. |
| **Awaiting counsel** | Cannot be finalized until qualified legal counsel has reviewed the relevant questions. |
| **Awaiting appointment or operational readiness** | Needs people or operations that have not been established. |
| **Deferred** | Not being decided now. The founder will resume it separately. |

## Summary
| # | Decision | Status | Implementation authorized? |
|---|---|---|---|
| 1 | Sharing token design (server side creation, hashing and resolution) | **Approved design direction** (with amendments). The 90 day expiry and link sharing policy are **Awaiting counsel** | No |
| 2 | Anonymous handle availability check, edge rate limited, uniform responses | **Approved design direction** | No |
| 3 | Player controlled profile pictures (private storage, explicit player choice) | **Approved design direction** (with clarification; lifecycle documented below, not implemented) | No |
| 4 | Privacy migration before public sign in opens (expand, switch, contract) | **Approved with conditions** | No |
| 5 | Trust and Safety Owner, deputy, coverage, report channel | **Awaiting appointment or operational readiness** | No |
| 6 | Response targets | **Approved provisionally** (internal goals only) | No |
| 7 | Organization verification criteria, evidence, records, recruiter terms | **Awaiting counsel** (criteria stay proposals; individual scouts excluded) | No |
| 8 | One team per Team subscription; roster "up to 10 members" | **Approved design direction** (with clarification) | No |
| 9 | About page and homepage Women in Esports wording | **Approved and implemented** (founder direction 2026-11-06, second review: follow the strategy document) | Yes, copy only (branch `claude/marketing-finish`, unmerged) |
| 10 | Identify and engage qualified counsel | **Approved with conditions** (engagement work only; legal questions stay open) | Engagement work only; no legal conclusion is authorized |
| 11 | Demo files and Scrim Intelligence evaluation track | **Deferred** | No |

**Precedence:** where an older proposal (notably `privacy-safety-architecture.md` sections 5.2, 5.3 and 8, and `safety-operations.md` section 1) conflicts with a direction recorded here, this register governs. Those older sections have not been rewritten; this is an outstanding documentation item, not an approval.

Dependency view (unchanged): 1, 2, 3 and 4 feed the privacy milestone; 5 and 6 gate link sharing *launch* and report review, not design work; 7 and 10 gate recruiter features; 8 and 9 are independent; 11 is a separate track.

---

## 1. Sharing token design
**Status: Approved design direction (with amendments). Expiry and link sharing policy: Awaiting counsel. Implementation: not authorized.**

### Founder direction (2026-11-06)
- Approved as the **design direction**: server side token creation, hashing and resolution for Player Resume sharing. **The database must never receive the plaintext token, and token resolution must remain server side.**
- Retain the proposed protections: instant revocation, no caching, generic social previews, link limits, and indexing controls (`noindex`, no `Disallow` for `/r/`).
- The **90 day expiry is a proposed default, not a final policy.** Expiry and link sharing policy remain subject to qualified legal review, **particularly for players whose ages are unknown.**
- Approval of this direction does **not** authorize implementation.

### Original proposal (retained)
- **Proposed default:** `victress.gg/r/{token}`; 256 bit secure random token; only a hash stored; shown once; per link field scope; expiry; instant revocation; `no-referrer`, `noindex`, `no-store`. Plus the refinements in the [readiness review](readiness-review.md) section 2.
- **Alternatives:** (a) token in the URL path (default); (b) token in the URL fragment (`/r#token`), which keeps it out of server and CDN logs but prevents server rendering and link previews; (c) no link sharing, directory opt in only.
- **Benefits and drawbacks:** (a) simple, works with previews, but the token appears in logs unless scrubbed. (b) strongest log hygiene, but no previews and more client code. (c) simplest and safest, but removes deliberate Resume sharing, which was approved.
- **Implications:** *Security* a forwarded link works for any holder; revocation cannot recall copies or cached unfurls. *Privacy* link pages must never load third party assets. *Legal* whether link sharing is appropriate for players whose age is unknown (see decision 10). *Operational* log scrubbing and a way to answer "I lost my link" (create a new one).
- **Dependencies:** evidence that Vercel and Supabase logs can be scrubbed or minimized for `/r/` paths; edge rate limiting availability on the current Vercel plan (unverified).

### What the direction covers and what it does not yet settle
| Item | State |
|---|---|
| R1 token created, hashed and resolved in the application server; database never sees plaintext | **Approved direction** |
| R2 token resolution server side only (the database's own anonymous API must not be able to resolve tokens) | **Approved direction.** The mechanism (a narrowly scoped server credential versus other options) still needs **technical evidence** |
| R4 generic social previews; R5 no caching; R8 robots handling; revocation; link limits (the cap on active links from R7) | **Approved direction** as retained protections |
| Rest of R7: link creation rate limit, label bounds, per link `fields` schema validation | **Not separately confirmed** |
| R3 path token versus fragment, log scrubbing, third party asset policy | **Not yet confirmed.** Path token with `no-referrer` is the proposal; needs evidence on log scrubbing |
| R6 avatar image optimizer behavior for signed URLs | **Not yet confirmed** (see decision 3) |
| R9 uniform response timing; R10 view count and bot handling | **Not yet confirmed** |
| Default expiry (90 days) and any limit on link sharing for players of unknown age | **Awaiting counsel.** Treat 90 days as a configurable proposal |

---

## 2. Anonymous handle availability check
**Status: Approved design direction. Implementation: not authorized.**

### Founder direction (2026-11-06)
Anonymous handle availability checks are approved, with **edge rate limiting** and **uniform responses for taken and reserved handles.** The endpoint must disclose **only availability**: it must not expose account or profile information, and must not distinguish a taken handle from a reserved one.

### Current state (verified in the repository; the target below is not implemented)
- `app/api/handle-check/route.ts` returns four distinct statuses today: `invalid`, `reserved`, `taken` and `available`. Taken and reserved are **not** uniform yet.
- It queries `profiles` as the anonymous role, so it depends on the open read policy. Once anonymous profile reads are closed (decision 4, contract step) it would fail unless a dedicated availability function exists. That function is not designed or authorized.
- Rate limiting is in memory per server instance (`lib/ratelimit.ts`).

### Original proposal (retained)
- **Alternatives considered:** require sign in; CAPTCHA for anonymous callers.
- **Implications:** *Privacy* "unavailable" confirms that a name is in use or reserved, even for a private profile; handles are pseudonyms. *Security* the current limiter (`lib/ratelimit.ts`) is in memory per server instance and is weak. *Operational* needs edge rules.
- **Open technical evidence:** edge rate limiting availability and rules on the current Vercel plan (unverified).

---

## 3. Player controlled profile pictures
**Status: Approved design direction (with clarification). Implementation: not authorized.**

### Founder direction (2026-11-06)
Approved: a Google or Discord picture may be copied into **private storage only after the player explicitly chooses it.** The behaviors below must be documented. **None of them is implemented today.**

### Current state (verified in the repository)
- `handle_new_user()` copies the provider's picture URL into `profiles.avatar_url` automatically at signup (hot linked, not copied).
- Uploaded avatars go to the **public** `avatars` bucket, readable by URL.
- A player can replace or remove an uploaded photo in the profile editor (`setAvatarAction`).
- There is no private bucket, no signed URL, no provider picture selection, and **no account deletion feature**. Deleting an auth user cascades database rows, and whether storage objects are removed is **to be verified**; no cleanup job exists.

### Proposed lifecycle (design only)
| Event | Proposed behavior |
|---|---|
| **Selection** | A button such as "Use my Google picture" appears in onboarding and the profile editor, only when the provider supplies one. Nothing is copied or stored before the player acts. The server reads the provider URL from the player's own identity data, validates the host against an allow list (`cdn.discordapp.com`, `lh3.googleusercontent.com`), fetches it with size, type and time limits (server side request controls), decodes and re-encodes the image, strips metadata, and stores it in a **private** bucket under a random object name. The profile stores the object reference, not a provider URL. A preview before saving is recommended |
| **Visibility** | Having a picture does not make it visible. Showing it to any audience (link, directory, team) is a separate per audience field setting, off by default. Viewers receive short lived signed URLs minted by server side code |
| **Provider disconnection** | The stored copy is Victress's own image and does not depend on the provider after it is copied. Proposed: it stays until the player removes or replaces it, and the interface says so. Whether disconnecting a provider should instead offer to delete the copy, and the consent basis for keeping it, are **open questions** (founder and counsel) |
| **Replacement** | The player picks a new provider picture or uploads one. The new object is saved first, the profile reference switches, and the old object is deleted. Previously issued signed URLs expire on their own short lifetime (value to be set) |
| **Deletion** | The player removes the picture: the object is deleted from private storage and the reference cleared. It disappears from every audience once existing signed URLs expire. Copies already cached by third parties (chat previews, browsers) cannot be recalled, which the interface should state |
| **Account deletion** | Must delete the account's avatar objects explicitly (database cascade alone is not assumed to remove storage objects), share links, profile and related rows, and queue provider copies and logs for removal according to the retention policy. Backup retention and the timing guarantee are **legal questions**. Self serve account deletion does not exist today |

### Open points for later confirmation
Signed URL lifetime; image size and dimension limits; whether the Next.js image optimizer (`*.supabase.co` is currently allowed) must be bypassed for signed URLs (readiness review R6); moderation of pictures once safety operations exist.

---

## 4. Privacy migration before public sign in opens
**Status: Approved with conditions. Implementation: not authorized.**

### Founder direction (2026-11-06)
The privacy migration **must happen before public sign in opens**, using the **expand, switch, contract** sequence. The zero profile finding is useful but **is not permission to skip migration safeguards.**

### Conditions
1. **Check the profile count immediately before execution** of each production step. The check covers at least `auth.users`, `public.profiles`, teams, stat entries, player games and avatar objects, with the time and the person who ran it recorded.
2. **If profiles exist, stop.** Do not run any step. Prepare a **specific migration plan and an owner communication plan for the founder's review.** No notification wording, timing or handling is assumed to be approved; this includes whether existing profiles become private, are blanked, or are grandfathered.
3. Test and demo rows count as profiles unless the founder says otherwise.
4. Each production step (expand, switch, contract) needs its own explicit authorization, a rollback plan, and the rolled back test suite passing with pre-existing rows.

### Evidence and state
Read only counts on 2026-11-06: auth users 0, profiles 0, teams 0, team members 0, stat entries 0, player games 0, waitlist 0, avatar objects 0; the 5 applied migrations match the repository. **Current finding only.** Whether victress.gg is reachable with sign in enabled is **not verified**; confirming that sign in is not open before the migration is a production configuration matter for the founder.

### Original proposal (retained)
Expand (additive columns, tables, functions, trigger change) then switch (application uses only the new functions) then contract (revoke open policies and grants, retire `public_profiles`, make the avatar bucket private). See the [readiness review](readiness-review.md) section 4.

---

## 5. Trust and Safety Owner, deputy, coverage and report channel
**Status: Awaiting appointment or operational readiness. Nothing is assigned.**

### Founder direction (2026-11-06)
Keep these as **required appointments before link sharing launches.** Do not assign, or imply that anyone has accepted, these roles.

### What still needs to be established
| Item | State |
|---|---|
| Trust and Safety Owner | **Not established.** No person named or accepted |
| Deputy | **Not established.** No person named or accepted |
| Coverage schedule (review days and hours) | **Not established** |
| Time zone | **Not established** |
| Report channel (mailbox or form) | **Not established** |
| Who may report from a token page (readiness review G6: signed in users only, or anonymous with a check) | **Not decided**; depends on the report channel |
| Interim tooling and access permissions | Proposed only (Supabase dashboard and SQL); not approved |

### Original proposal (retained)
One named owner and one deputy; business hours review; automatic reversible hold outside hours; the reporting page states real hours. Alternatives: founder as interim owner with a named external deputy; contracted moderation; delay exposure increasing features until a dedicated hire. *Implications:* legal mandatory reporting duties fall on the operator; single person dependency; reviewer wellbeing; staff access needs least privilege. See [safety operations](safety-operations.md).

---

## 6. Response targets
**Status: Approved provisionally. Internal operational goals only.**

### Founder direction (2026-11-06)
The proposed response times are approved as **internal operational goals only, not public promises or guarantees.** They are **provisional and subject to review once staffing and actual coverage are established.**

| Severity | Provisional internal goal |
|---|---|
| S1 urgent | First review within 4 staffed hours |
| S2 serious | First review within 1 business day |
| S3 standard | First review within 3 business days |
| Appeals | Acknowledged within 2 business days; decided within 5 business days |

These are not published anywhere and must not appear in public copy. Because no owner, deputy or coverage schedule exists (decision 5), the targets cannot yet be measured against real staffing.

---

## 7. Organization verification criteria
**Status: Awaiting counsel. The criteria remain proposals. Final approval deferred.**

### Founder direction (2026-11-06)
- **Do not finalize** verification policy, evidence retention, immutable record requirements or recruiter terms until qualified counsel has reviewed the relevant questions.
- The seven criteria (C1 to C7) and the per type evidence requirements in [organization verification](organization-verification.md) **stay proposals.**
- **Individual scouts stay excluded from the initial scope.**
- **Do not sell or enable Scout access** before verification capacity and the necessary policy are established.

### Items waiting for counsel
Verification policy; evidence retention; immutable record requirements (including conflict with deletion rights); recruiter terms and code of conduct.

---

## 8. Teams per Team subscription
**Status: Approved design direction (with clarification). Implementation: not authorized.**

### Founder direction (2026-11-06)
- Approved: **one team per Team subscription**, and the roster wording **"up to 10 members"**, which matches the current database constraint (`join_team` counts all members; there is no player and coach split).
- **Coach permissions remain a separate entitlement concept.** Do not describe coach seats or coach specific permissions as implemented unless the repository confirms they exist.

### What the repository confirms today
- A player can belong to only one team (`create_team` returns `already_in_team`; `join_team` returns `in_other_team`; `profiles.team_id` is a single value).
- `team_members.role` allows the values `owner`, `coach` and `player`, but **no function assigns `coach`**, and no coach permissions, seats or coach specific features exist. Coach seats are therefore **not implemented** and must not be described as available.
- The wording "8 players and 2 coaches" appears in `app/llms.txt/route.ts` and `components/app/TeamPanel.tsx`. It does not match the database. Correcting those two files is an application change and is **not authorized** here.

---

## 9. About page and homepage Women in Esports wording
**Status: Approved and implemented in copy (branch `claude/marketing-finish`, not merged or deployed).**

### Founder direction (2026-11-06, second review)
- The founder supplied the business purpose and Creating Shared Value document (`docs/strategy/victress-business-purpose.md`) and directed that **Creating Shared Value be fully integrated for Women in Esports** on the marketing site.
- This settles the earlier open question (readiness review C1) in favour of the strategy document: Victress Women in Esports is **a core expression of why Victress exists, delivered through the same three pillars**. It is not a separate product, program, company or fourth pillar. This supersedes the earlier wording "a distinct shared-value and community-impact initiative".
- The phrase "distinct in presentation, not in substance" remains unused.

### What was implemented
- About page: [about-page-draft.md](about-page-draft.md) published, plus a short "Good for players. Good for the business." paragraph taken from strategy section 2.
- Homepage section: reframed from "community initiative in development" to "Why Victress exists"; the "mentorship opportunities" line is removed; each area names the pillar that delivers it with its real status; links to the About section.
- `llms.txt` and the SEO audit expectations updated to match.

### Still held back (unchanged)
The draft's held back statements stay unpublished: player privacy control, reporting and blocking, verified data, outcomes, partnerships. They wait for decisions 1 to 5.

---

## 10. Qualified counsel
**Status: Approved with conditions. Approves the research and engagement work only.**

### Founder direction (2026-11-06)
Proceed with **identifying and engaging qualified legal counsel** with esports, youth online platform or comparable experience. This does **not** approve any legal conclusion or policy decision. **All legal questions stay open until counsel provides advice.**

### Engagement record (to be completed once established)
| Item | State |
|---|---|
| Counsel identified or engaged | **Not yet** |
| Responsible recipient of the answers | **Not yet established** |
| Target date | **Not yet established** |
| Questions to counsel | Recorded in [minors and recruiter access](minors-and-recruiter-access.md) (ten questions) and [readiness review](readiness-review.md) section 6 (retention, recruiter terms, mandatory reporting, breach notification, demo consent, link sharing and expiry for players of unknown age) |

Until counsel advises: recruiter discovery and contact stay disabled for all players; no age mechanism, exception or legal conclusion is proposed.

---

## 11. Demo files and Scrim Intelligence evaluation
**Status: Deferred. Separate from the privacy milestone.**

### Founder direction (2026-11-06)
Keep the demo file research and Scrim Intelligence evaluation track **separate from the privacy milestone.** Do not select a first game or begin implementation. When the founder resumes this track, the demo file requirements, the written consent process, privacy handling and the spike pass criteria will be established then. No first game is approved.

---

## Conditions that must be satisfied before the privacy milestone can begin
"Begin" means starting implementation of the privacy and access foundation. Design approvals above do not start it.

**A. Authorization.** The founder gives explicit written authorization to start the milestone, naming its scope. **Authorization to begin the milestone is not authorization to execute any production change.** Production application of each step (expand, switch, contract) needs its own explicit authorization.

**B. Design points still to confirm.** Decision 1 approved the core architecture, but these are not yet confirmed: R3 (path token, log scrubbing, third party asset policy), R6 (image optimizer and signed avatar URLs), R9 and R10 (timing equality, view counts), and the rest of R7. The readiness review gaps G1 to G9 are all **unresolved**; the founder should confirm which are in the milestone scope. Where each stands (classification from the [readiness review](readiness-review.md) section 2, not a decision):

| Gap | Blocks | Outstanding |
|---|---|---|
| G1 GraphQL and Realtime exposure | Verification after the contract step | Evidence: live check (C.5 below) |
| G2 Existence oracles beyond the handle check | Design | Founder: scope and handling; opaque public ids; `claim_handle` responses; avatar paths |
| G3 Placeholder handle derived from the user id | Signup migration design | Founder: confirm a random placeholder |
| G4 Team audience and invite code exposure | Design | Founder: team audience defaults and optional join approval |
| G5 Search flag dependency | Design | Founder: confirm constraint and trigger |
| G6 Who may report from a token page | Launch of link sharing | Founder; depends on decision 5 |
| G7 Demo data and preview environments | Implementation | Evidence: whether previews touch production data (unverified) |
| G8 Handle namespace | New routes only | None now; reserve any new top level route names |
| G9 In memory rate limiter | Implementation of decision 2 | Evidence: edge rate limiting capability on the current plan |

**C. Technical evidence (no implementation needed to gather it).**
1. Edge rate limiting availability and rules on the current Vercel plan (decision 2).
2. A server only, narrowly scoped database credential option in Supabase for token resolution (decision 1, R2).
3. Log scrubbing or minimization for `/r/` URLs on Vercel and Supabase (R3).
4. Private bucket, signed URL and image optimizer behavior (decision 3, R6).
5. Live exposure check of the database's GraphQL and Realtime interfaces (G1).
6. Whether public sign in is currently open (decision 4).

**D. Migration safeguards (decision 4).** The count check and the stop and plan procedure from decision 4 are followed; the rolled back negative test suite must be specified and accepted by the founder; a rollback plan must exist for each of the three steps.

**E. Legal dependency on policy values.** The default expiry and any link sharing limit for players of unknown age depend on counsel. The founder can decide whether the milestone builds link sharing with a configurable expiry behind a disabled switch, or waits. **This is not assumed.**

### Required before launch, not before the milestone begins
Link sharing must not launch until the Trust and Safety Owner, deputy, coverage schedule, time zone and report channel exist (decision 5) and counsel has addressed link sharing for players of unknown age (decision 10). The provisional response targets (decision 6) are reviewed once coverage is known.

### Not required for the privacy milestone
Decisions 7, 8, 9 and 11. Decision 10's engagement work can run in parallel.
