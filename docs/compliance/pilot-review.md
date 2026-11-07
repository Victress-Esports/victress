# Design partner pilot: compliance review and rollout checklist (for legal counsel)

Status: **draft for counsel review, 2026-11-07.** Nothing described as "proposed" or "open" here is implemented or decided. Nothing in this document is a legal conclusion, and Victress makes no claim of compliance with any law or standard (including COPPA, GDPR, CCPA or any equivalent). Where this document says "implemented", it means the code or migration exists on a branch and passed the tests named; **none of it is deployed and no migration has been applied to production.**

Related: [strategy document](../strategy/victress-business-purpose.md), [decision register](../proposals/decision-register.md), [privacy rollout and rollback](../proposals/privacy-rollout.md), [privacy and safety architecture](../proposals/privacy-safety-architecture.md), [entitlements](../proposals/entitlements.md), [existing compliance audit](../compliance-audit.md).

Legend: **Implemented** (on a branch, tested as stated). **Proposed** (a design or default awaiting a decision). **Open** (a question for counsel or the founder). **Not built**.

## 1. What the pilot is

The Founding Design Partner pilot is a 4 to 6 week program for women's competitive rosters, Game Changers teams and collegiate programs (founder's terms, as published on `/design-partner`). Partners receive free priority access to Phase 1 Scrim Intelligence and Player Resume features, structured performance analytics and direct input into product development. Partners are asked for regular scrim or practice file uploads, a weekly 15 minute feedback check in with the coach or captain, and willingness to take part in a mutually approved case study.

Today, **Scrim Intelligence does not analyze anything.** No parser has been validated, no integration with any game is approved or proven, and uploaded files are stored only. "Game Changers" is a third party program name used descriptively; the site's trademark notice currently refers to game names only (counsel may want it widened).

## 2. Systems and data inventory

| Item | What it holds | Who can read it | Status |
|---|---|---|---|
| Account (Supabase Auth) | Sign in identity and email | The user; server side service | Existing |
| `profiles` | Handle, optional display name, photo URL, bio, game, role, rank, team, consent flags | Owner only after the privacy contract step; public only through service role functions and only per consent | Implemented (branch), not applied |
| `stat_entries` | Player entered stats, source `manual` = Self-reported | Owner; public only if the player allowed stats | Implemented (branch) |
| `tournament_entries`, `highlights` | Player entered tournament history; links to clips hosted elsewhere | Owner only. Not part of any public view or share link | Implemented (branch), not applied |
| `profile_share_links` | SHA-256 hash of a sharing token, label, field scope, expiry, revocation, view count | Owner (token hash is not readable by anyone, including the owner) | Implemented (branch), not applied |
| `scrim_uploads` + private Storage bucket `scrim-uploads` | File name, game, size, storage path; the file itself | Owner only | Implemented (branch), not applied |
| Contact and waitlist forms (Resend) | Names, emails, organization details sent by email to hello@victressesports.com; waitlist rows | Staff mailbox; waitlist table not publicly readable | Existing; privacy policy placeholder does not yet cover contact forms |
| Analytics (GTM / GA4) | Not part of these branches; separate branch `claude/analytics-gtm`, consent gated, off by default | n/a | Separate, unreviewed |

Account identity, public player identity, competitive records and private contact details are kept separate by design. Contact details are never disclosed without the player's consent. No recruiter discovery or contact exists, and `scoutable` cannot be written by users.

## 3. Demo file handling and privacy

### 3.1 What a demo or replay file may contain
Victress has **not yet examined real demo files** (real CS2 demos will be supplied when validation begins). The following is general expectation, to be confirmed against actual files before any claim is made to users or partners:

- Player identifiers for everyone in the match, not only the uploader: in game names and, depending on the game, platform account identifiers.
- Match events and positional data for all players, including opponents and teammates.
- Depending on the game, recording settings and the file, possibly chat messages and possibly voice communications. Whether a given format records chat or voice at all is **unverified** for each of the formats the uploader accepts (`.dem`, `.rofl`, `.replay`, and archives `.zip`, `.gz`, `.bz2`, `.7z`).
- Archives could contain anything; contents are not inspected.

The accepted extension list is a placeholder in `content/provenance.ts`. It is not a statement that any format is supported or parseable.

### 3.2 What Victress does with an uploaded file today (implemented, not deployed)
- The file goes from the player's browser straight into a **private** Storage bucket, inside a folder named for the player's user id. Storage policies allow the owner (and no other signed in user, and no anonymous visitor) to read, upload and delete within that folder.
- The server records name, game, size (taken from Storage, not the browser) and path. Limits: 200 MB per file, 25 files per player, extension allow list, path must be in the owner's folder. Stored status is the only state.
- **The file is not opened, parsed, scanned or analyzed.** No stats are derived from it. The interface says so ("stored privately, not analyzed") and labels automated analysis "Coming soon".
- Before the file picker unlocks, the player confirms: they took part in this practice, the file may contain other players' names, voice or chat, and they will not share it.
- The file is not shared with partners' staff, Victress staff workflows, recruiters or any third party by any feature. Staff access to Storage through the Supabase dashboard or service credentials is technically possible and is **an open governance question** (section 3.4).
- Tests: `supabase/tests/local/run-dashboard.sh`, 20 of 20 assertions on a throwaway local Postgres (anonymous and stranger access denied, own folder only, size and cap limits, private bucket). Browser tests of the upload, list and delete flow ran against a mock Supabase, not real Storage.

### 3.3 Retention and deletion
Implemented:
- A player can delete a file. The server removes the Storage object and then the record.
- Deleting a profile row removes its upload records (cascade).

**Gaps found while writing this document (to fix or decide before uploads open):**
1. Deleting an account or profile removes the database rows but **does not by itself remove the Storage objects**; files could be orphaned. A deletion routine (and an account deletion flow, which does not exist yet) is needed.
2. **No retention period is defined.** Files stay until the player deletes them. Any period, automatic expiry, or end of pilot deletion is **Proposed/Open** for counsel and the founder. This document does not state one.
3. Backups, Storage replication and log retention at Supabase are not documented here and must be confirmed with the provider's terms before any statement is made to users.
4. There is no process for a third party (for example an opponent whose name appears in a file) to ask for removal. **Open.**
5. Deletion of data requested by a partner team at the end of the pilot: process **Open**.

### 3.4 Questions for counsel (demo files)
- Is a player's confirmation sufficient for other participants' names, voice or chat appearing in a file, and what notice or consent from other participants (including opponents) is needed? Does the answer differ if voice is present?
- Applicable regimes for recorded voice and chat, and for minors in matches (see section 7).
- Required retention limits, deletion timelines and any deletion on request obligations; whether the processor terms with Supabase and others cover this use.
- Whether staff access for support or validation is permitted, and under what logging and purpose limits.
- Whether the file, once parsed in a later phase, creates additional obligations (derived data about named third parties).
- Content risk: files are not scanned for malware or unlawful content. What handling is required?

## 4. Partner case study terms

Agreed wording (published on `/design-partner`): *"Willingness to take part in a mutually approved case study on the findings. Nothing is published without written sign off from both Victress and the partner team."*

Policy as agreed:
1. A case study is optional to create and **mutually approved**: no case study, quote, statistic, screenshot, name or logo is published unless **both Victress and the partner team have signed off in writing** on the exact text and assets to be published.
2. Either side may decline to approve; declining ends that case study and does not affect pilot access already given.
3. Findings are described as what was observed, in context, and never as a judgment of any player's ability. Provenance labels are kept (Self-reported, API, Demo parsed). No outcome (placement, recruitment, improvement) is claimed unless it actually happened and is supported.

**Open (not decided; not to be invented):**
- Who signs for the partner team (coach, captain, organization, each player) and what authority proof is needed.
- Whether individual players named or identifiable in a case study must separately consent, and how, particularly minors and collegiate students (student record rules are for counsel).
- Whether data may be anonymized or aggregated and what "anonymized" means here.
- Whether approval can be withdrawn after publication and what Victress then does.
- Whether any compensation, endorsement or testimonial rules apply (the pilot is free).
- Form of the written agreement (pilot terms document), which does not exist yet.

## 5. Feature flag gating

Exposure increasing features are **off unless an environment flag is exactly `"true"`**. Each default is `false` in `.env.example`. Server code checks the flag; a missing, empty or misspelled value is off.

| Flag | Gates | Where enforced | Default | What switching on additionally requires |
|---|---|---|---|---|
| `DIRECTORY_ENABLED` | Public player profiles by handle, social cards, leaderboards, profile sitemap | `lib/privacy.ts` (`directoryProfile`), leaderboard and sitemap code, privacy action (refuses to turn listing/leaderboards on) | off | Privacy migrations applied (decision 4 steps, each separately authorized, profile count checked), Trust and Safety owner and report channel live (decision 5), counsel review (decision 10) |
| `SHARING_ENABLED` | Creating and resolving private sharing links (`/r/[token]`) | `lib/privacy.ts` (`sharedProfile`), share link actions | off | Same as above, plus open design points R3 (token in path versus fragment, log scrubbing) and expiry default (proposed 90 days, awaiting counsel) |
| `SCRIM_UPLOADS_ENABLED` | Scrim file upload interface and recording uploads | `lib/dashboard.ts`, scrims page, `recordScrimUploadAction` | off | Privacy foundation live and approved; counsel sign off on section 3; retention and deletion routine; malware/content handling; confirm provider upload limits |
| `NEXT_PUBLIC_BILLING_ENABLED` | Paid plans and billing | Read by `lib/entitlements.ts` for the hub status panel only. **No billing, checkout or webhook code exists.** | off | Separate approval; Stripe sandbox plumbing built and tested; plan descriptions and prices unchanged without approval |

Other standing gates: Scout Desk (player discovery) is **Scout plan only** and not available to any plan yet; recruiter discovery and contact are disabled for all players pending qualified legal review; individual scouts are excluded; Scout access is not sold or enabled until verification capacity and policy exist.

**Technical limits of the flags (important for counsel and engineering):**
1. Flags are application level. Once the dashboard migration is applied, the `scrim-uploads` bucket and its policies exist, and a signed in user could call Storage's API directly and upload into their own folder even though the interface is hidden and the server refuses to record it. Recommended: apply the bucket creation and storage policies in a separate migration at the time uploads are authorized, or add a database level switch. **Open until decided.**
2. Flags are read at runtime from the host environment; changing one is a configuration change and redeploy on the platform. Who may change them, and the record of that approval, is a process question.
3. `NEXT_PUBLIC_` values are inlined at build time. The local test build that points at a mock server must never be deployed (see `docs/seo.md`).
4. The local sign in stand in and mock Supabase are test tooling in `scripts/` and are absent from production builds (verified by scanning a production build for their strings).

## 6. Rollout checklist

Each production step needs its own explicit founder authorization, a fresh profile count immediately before, and a rollback plan (see `docs/proposals/privacy-rollout.md`). Nothing below has been done.

**A. Before any pilot data is collected**
- [ ] Counsel review of this document, privacy policy and terms (currently placeholders labeled pending legal review) and the contact form notice.
- [ ] Privacy migrations: expand, application switch, contract, in that order, each authorized; profile count zero or a founder approved plan if not.
- [ ] Sign in state in production verified (open or closed).
- [ ] Trust and Safety owner, deputy, coverage and report channel in place (decision 5); report and block tools built.
- [ ] Open design points resolved or accepted: R3, R6 (avatar delivery), edge rate limiting, scoped server credential instead of service role.
- [ ] Age / minors approach decided by counsel (no age mechanism or exception has been invented; see section 7).

**B. Before scrim uploads open (`SCRIM_UPLOADS_ENABLED`)**
- [ ] Dashboard migration applied (with the bucket separation decision in section 5).
- [ ] Section 3 questions answered; retention period, deletion routine (including account deletion and orphaned objects), third party removal process defined.
- [ ] Partner agreement drafted and reviewed (data use, no publication without mutual sign off, deletion at end of pilot).
- [ ] Malware/content handling decision; provider upload limits confirmed.
- [ ] Real demos supplied and examined to confirm what each accepted format actually contains; accepted extension list revised accordingly.
- [ ] Uploader text reviewed by counsel.

**C. Before public profiles or sharing open (`DIRECTORY_ENABLED`, `SHARING_ENABLED`)**
- [ ] Section A complete. Safety operations ready for exposure to strangers.
- [ ] Share link expiry defaults and notices approved.

**D. Before billing**
- [ ] Separate approval. Stripe webhook per `docs/stripe.md` (recorded, not built). Flag stays false until then.

**E. Before any case study**
- [ ] Section 4 open points resolved; written sign off process in place.

## 7. What we do not claim

- No claim of compliance with COPPA, GDPR, CCPA or any other law or standard, and no claim about the adequacy of Supabase, Vercel, Resend or Stripe for these purposes.
- No age gate, parental consent mechanism or minor specific handling exists. Collegiate and some competitive players may be minors; this is **Open** for counsel and affects section 3 (other participants in files), section 4 (case study consent) and sign in.
- No claim that any game integration or parser works. No first integration is approved.
- No claim that stats are "verified": every stat today is Self-reported. Verification will mean provenance and integrity of evidence, never a judgment of ability.
- No retention periods, security guarantees or response times are promised to users in this document or the product.
- No partnerships, funding, coaching, mentorship, scholarships, placements or recruitment are offered or implied.

## 8. Evidence index
- Migrations (not applied): `supabase/migrations/20261107000100_privacy_expand.sql`, `...000200_privacy_contract.sql`, `...000300_dashboard_foundation.sql`.
- Database tests (throwaway local Postgres): `supabase/tests/local/run-privacy.sh` (all privacy checks passed), `run-dashboard.sh` (20 of 20).
- App tests (mock Supabase): `scripts/privacy-test.mjs`, `scripts/signed-in-test.mjs`.
- Pull requests (all drafts, none merged): #4 marketing, #5 privacy, #6 dashboard hub, #7 dashboard foundation.
