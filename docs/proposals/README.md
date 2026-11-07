# Proposals, decisions, dependencies and risks

Nothing in `docs/proposals/` is implemented. Each document needs approval before any database, authentication, permission, billing or privacy change is made, and each production step needs its own approval.
Governing document: [docs/strategy/victress-business-purpose.md](../strategy/victress-business-purpose.md) (supersedes conflicting earlier instructions).
**Precedence:** where an older proposal conflicts with a founder direction recorded in the [decision register](decision-register.md), the register governs. Known older sections that predate the recorded directions and have **not** been rewritten (listed as outstanding): `privacy-safety-architecture.md` sections 5.2 and 5.3 (they describe the database receiving the token, which decision 1 rules out) and section 8 (it says link sharing can ship with the privacy foundation, which decision 5 conditions on appointments), and `safety-operations.md` section 1 (it says link sharing does not need to wait).

## Documents
| Document | Status |
|---|---|
| [Privacy, identity and access architecture](privacy-safety-architecture.md) | Revision 2: consents and token architecture approved as design direction; the R3, R6, R9, R10 refinements and the legal policy values are not yet confirmed; sections 5.2, 5.3 and 8 predate decisions 1 and 5 (see Precedence); not authorized for implementation |
| [Decision register](decision-register.md) | Updated with founder direction (2026-11-06); no approval authorizes implementation |
| [Stripe sandbox billing](stripe-billing.md) | Proposal: checkout, billing portal and `/api/stripe/webhook` (six events including `invoice.paid`), tables, entitlements, safety rules and the PR plan; awaiting approval, nothing implemented |
| [Pilot readiness checklist](pilot-readiness-checklist.md) | Operational gates before the first design partner signs up (Supabase Pro, a separate Preview project, invite code protection, `rls_auto_enable()`) |
| [rls_auto_enable revoke](rls-auto-enable-revoke.md) | Proposal with a rolled back production dry run and the exact rollback; not applied |
| [Team invite rate limiting](team-invite-rate-limiting.md) | Proposal: entropy of today's codes (48 bits), throttling options; not implemented |
| [Readiness review](readiness-review.md) | New: contradictions, token and authorization gaps, migration safety, evidence and legal needs |
| [Safety operations](safety-operations.md) | Operating requirements; owner, deputy, coverage and report channel not established; targets approved provisionally as internal goals; section 1 on link sharing predates decision 5 (see Precedence) |
| [Organization verification](organization-verification.md) | Proposal; awaiting counsel; individual scouts excluded; no Scout access to be sold or enabled |
| [Minors and recruiter access](minors-and-recruiter-access.md) | Restriction maintained, questions for counsel |
| [Plan entitlement matrix](entitlements.md) | Revision 2.2: one team per Team subscription and "up to 10 members" approved as direction; coach permissions a separate, unbuilt concept; prices unchanged |
| [About page draft](about-page-draft.md) | Draft only; deferred for the founder's separate language review; nothing published |
<<<<<<< HEAD
| [Join team throttling and invite rate limit plan](join-team-throttling.md) | Proposal: every invite path and its limit, a database attempt counter, edge limit, tests; nothing implemented |
| [Analytics consent control](analytics-consent-control.md) | Design only; #11 stays unmerged and analytics off |
| [Women in Esports wording](core-expression-wording.md) | Every place that says "core expression" or "why Victress exists", with the proposed wording; nothing changed |
| [Feature flag readiness](feature-flag-readiness.md) | Test evidence per flag (sharing, directory, uploads) and what blocks Preview and production |
=======
| [Scrim Intelligence](scrim-intelligence.md) | Proposal: pipeline, candidate games ranked (provisional, mostly unverified), the real files the founder must supply, consent for uploaded demos, failure handling, validation plan. **No game approved, parsing not proven** |
| [Reporting, blocking and moderation](reporting-blocking-moderation.md) | Proposal: what exists (nothing), the minimum before each exposure feature, tables, ownership, decisions. Nothing implemented; owner not assigned |
| [Dashboard migrations production plan](dashboard-migrations-production-plan.md) | Proposal (PR #27): order, dry runs, tested rollback, Pro recommendation, pausing sign ups |
| [Status of every feature](../status.md) | Built, merged, on production, gated by, blocked by |
>>>>>>> origin/main
| Age enforcement design | Waits on counsel (see minors); not written |
| AI crawler policy | Not written in the repo; options are in `docs/compliance-audit.md` |
| `rls_auto_enable()` change | Not written; the function must not be modified until separately approved |
| First game integration | **No game is approved.** Needs real demos and a validation spike |

## What has been decided, and what has not
**No approval below authorizes implementation.** Each approved item is a direction or a condition; implementing it needs its own explicit authorization.

**Approved design direction:** private by default with separate consents (earlier founder direction, not a numbered register decision); server side token creation, hashing and resolution with the database never receiving the plaintext token (decision 1); anonymous, edge rate limited, uniform handle availability checks (decision 2); player controlled profile pictures copied into private storage only after the player chooses (decision 3); one team per Team subscription with "up to 10 members" and coach permissions as a separate entitlement concept (decision 8).
**Approved with conditions:** the privacy migration before public sign in opens, with a profile count check immediately before execution and a stop and plan rule if profiles exist (decision 4); the engagement of qualified counsel, as research and engagement work only (decision 10).
**Approved provisionally:** response targets as internal goals only (decision 6).
**Awaiting counsel:** organization verification policy, evidence retention, immutable records and recruiter terms (decision 7); the 90 day link expiry and link sharing policy for players of unknown age (part of decision 1).
**Awaiting appointment or operational readiness:** Trust and Safety Owner, deputy, coverage schedule, time zone and report channel (decision 5). Nobody has been assigned or has accepted a role.
**Implemented in copy:** About page and homepage Women in Esports wording (decision 9, follows the strategy document). **Deferred:** demo files and the Scrim Intelligence evaluation track (decision 11).

**Standing restrictions (unchanged):** recruiter discovery and contact stay disabled for all players pending qualified legal review; individual scouts are excluded and no Scout access is sold or enabled; no age mechanism, exception or legal conclusion is invented; no first game integration is approved; the only hyphenated provenance label in brand copy is "Self-reported".

## Decision register summary
Full entries (founder direction, original proposal, conditions, current repository facts) are in [decision-register.md](decision-register.md).

| # | Decision | Status |
|---|---|---|
| 1 | Sharing token design | Approved design direction (with amendments); 90 day expiry and link sharing policy awaiting counsel |
| 2 | Anonymous handle availability check | Approved design direction |
| 3 | Player controlled profile pictures | Approved design direction (lifecycle documented, not implemented) |
| 4 | Privacy migration before public sign in | Approved with conditions |
| 5 | Trust and Safety Owner, deputy, coverage, report channel | Awaiting appointment or operational readiness |
| 6 | Response targets | Approved provisionally (internal goals only) |
| 7 | Organization verification | Awaiting counsel |
| 8 | One team per Team subscription; "up to 10 members" | Approved design direction (with clarification) |
| 9 | About page and homepage wording | Approved, implemented in copy |
| 10 | Qualified counsel | Approved with conditions (engagement work only) |
| 11 | Demo files and Scrim Intelligence evaluation | Deferred |

## Technical dependencies (in order)
1. **Privacy and access foundation:** consent columns, sharing tokens, closing anonymous reads, signup defaults, private avatars.
2. **Safety minimum:** reports, blocks, protective hold, interim tooling, named owner (gates every exposure increasing feature).
3. **Provenance schema:** `stat_entries.source` is limited to `'manual'`. Needs `self_reported`, `api`, `demo_parsed`, verification status, source identifiers, interface labels and the wording that verification is provenance, not ability.
4. **Legal review outputs:** minors, retention, recruiter terms, mandatory reporting.
5. **Scrim Intelligence validation** (deferred, decision 11; resumes only at the founder's direction) on real files for the candidate games, then upload, a separate processing worker, match tables, attribution and analysis views.
6. **Player Resume on evidence:** provenance badges, match history, role context.
7. **Entitlements and usage metering** (server side), including the one team rule.
8. **Organization verification operating,** then recruiter accounts, consent gated contact and Scout Desk.
9. **Ecosystem constructs** (leagues, tournaments, collegiate programs) and results import; partnerships only when real.
10. **Impact measurement** from database counts and privacy respecting events.
11. **Billing (M4):** checkout, webhooks, entitlement lifecycle, cancellation. Separate approval.

## Recommended implementation order
- **Track A, trust (first in sequence once the founder authorizes implementation):** 1, 2, and the legal work in 4. Counsel engagement (decision 10) is approved work and can proceed now.
- **Track B, evidence:** 3. The validation spike in 5 is deferred (decision 11) and resumes only at the founder's direction.
- **Then:** 5 build, 6, 7, 8, 9, 10, 11, each gated on the one before.
- **Copy:** About page and homepage wording follow the strategy document (decision 9). Statements about privacy and safety still wait until those capabilities are live.

## Risks
| Risk | Why it matters | Mitigation |
|---|---|---|
| **Profile data is publicly scrapable today** | Real names and photos copied from Google or Discord, readable without signing in | Privacy foundation is the first build; confirm production profile count; no marketing claim about privacy until live |
| **Safety capacity** | A report mechanism without responders harms trust, especially for women competitors | Gating, named owner, honest hours, protective hold, drill before launch |
| **Weaponized reporting** | Mass false reports could silence women | Rate limits, pattern detection, human review, appeals |
| **Recruiter impersonation** | A fake recruiter contacting players is a safety risk | Objective verification, second reviewer, periodic review, revocation, player consent for contact |
| **Minors** | Recruiter contact with minors carries legal and safety risk | Restriction maintained; no recruiter features until counsel; no age mechanism invented |
| **Token links leak** | A forwarded or logged link works for any holder | Expiry, scoped fields, instant revocation, log scrubbing, honest wording to players |
| **Scrim Intelligence unproven** | It is the differentiator and the most uncertain piece; parser reliability, attribution of non-account players, large files, cost | Real file validation first; no feasibility claims; cost measured before limits set |
| **Other players in demo files** | A demo contains up to ten people, most without accounts | Derived stats for non-members stay private unless claimed; raw files deleted after parsing |
| **Free tier cost** | Free processing is not unlimited | Capped allowance, short raw file retention, adjust the cap from measured cost |
| **Verification misread as ability** | Verified evidence is not a verdict on a player | Required interface wording; context shown with metrics; leaderboards de-emphasized |
| **Overpromising in marketing** | Strategy forbids claims about programs, funding, mentorship, placements | Copy review gate: only existing capability, labeled planned otherwise |
| **Single person dependencies** | Owner and reviewers are not yet assigned | Deputy, written procedures |
