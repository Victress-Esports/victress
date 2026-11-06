# Proposals, decisions, dependencies and risks

Nothing in `docs/proposals/` is implemented. Each document needs approval before any database, authentication, permission, billing or privacy change is made, and each production step needs its own approval.
Governing document: [docs/strategy/victress-business-purpose.md](../strategy/victress-business-purpose.md) (supersedes conflicting earlier instructions).

## Documents
| Document | Status |
|---|---|
| [Privacy, identity and access architecture](privacy-safety-architecture.md) | Revision 2: consents approved in direction; sharing token design awaiting approval |
| [Safety operations](safety-operations.md) | New: operating requirements, awaiting owner and staffing decisions |
| [Organization verification](organization-verification.md) | New: objective criteria, awaiting approval |
| [Minors and recruiter access](minors-and-recruiter-access.md) | New: restriction maintained, questions for counsel |
| [Plan entitlement matrix](entitlements.md) | Revision 2: one basic Rookie team; prices unchanged |
| [About page draft](about-page-draft.md) | Draft copy for review; no page changed |
| Age enforcement design | Waits on counsel (see minors); not written |
| AI crawler policy | Not written in the repo; options are in `docs/compliance-audit.md` |
| `rls_auto_enable()` change | Not written; the function must not be modified until separately approved |
| First game integration | **No game is approved.** Needs real demos and a validation spike |

## Approved direction (decisions made)
1. Private by default; separate consent for public discovery and for leaderboards; deliberate Player Resume sharing.
2. Handles are never access control. Sharing uses high entropy, revocable tokens. Public directory access only for players who opt in. Private data stays private through every direct request and anonymous endpoint.
3. Exposure increasing features stay gated until moderation responsibilities exist. No 24/7 coverage is assumed.
4. Recruiter organizations must be verified on objective criteria. Self-registration does not verify.
5. Recruiter discovery and contact for minors stay restricted until qualified legal review. No age mechanism or exception is invented.
6. Rookie includes one basic team with the existing roster limit; advanced team workflows and compute heavy capabilities are paid. Prices unchanged.
7. About page to be rewritten around purpose (draft ready).

## Decisions still needed
| # | Decision | Document |
|---|---|---|
| 1 | Approve the sharing token design (hash only, shown once, per link scope, expiry, `no-referrer`) | privacy |
| 2 | `/api/handle-check`: anonymous with edge rate limiting, or require sign in | privacy |
| 3 | Copy provider pictures into a private bucket (recommended) or upload only | privacy |
| 4 | Production profile count at approval, and handling of any existing profiles | privacy |
| 5 | Name the Trust and Safety Owner and Deputy; define review days, hours, time zone | safety |
| 6 | Accept or adjust the proposed response targets and interim tooling | safety |
| 7 | Approve verification criteria C1 to C7; individual scouts excluded at first | organizations |
| 8 | Verification turnaround target; Scout sales order versus verification capacity | organizations |
| 9 | Teams per Team subscription (one, or a small number); free allowance size and retention | entitlements |
| 10 | Approve the About draft; approve small homepage Women in Esports alignment | about |
| 11 | Engage counsel and obtain answers to the minors questions; recruiter terms; retention periods; legal requests; mandatory reporting | minors, safety, organizations |
| 12 | Supply real demo files and choose pilot players for the validation spike | game data |

## Technical dependencies (in order)
1. **Privacy and access foundation:** consent columns, sharing tokens, closing anonymous reads, signup defaults, private avatars.
2. **Safety minimum:** reports, blocks, protective hold, interim tooling, named owner (gates every exposure increasing feature).
3. **Provenance schema:** `stat_entries.source` is limited to `'manual'`. Needs `self_reported`, `api`, `demo_parsed`, verification status, source identifiers, interface labels and the wording that verification is provenance, not ability.
4. **Legal review outputs:** minors, retention, recruiter terms, mandatory reporting.
5. **Scrim Intelligence validation** on real files for the candidate games, then upload, a separate processing worker, match tables, attribution and analysis views.
6. **Player Resume on evidence:** provenance badges, match history, role context.
7. **Entitlements and usage metering** (server side), including the one team rule.
8. **Organization verification operating,** then recruiter accounts, consent gated contact and Scout Desk.
9. **Ecosystem constructs** (leagues, tournaments, collegiate programs) and results import; partnerships only when real.
10. **Impact measurement** from database counts and privacy respecting events.
11. **Billing (M4):** checkout, webhooks, entitlement lifecycle, cancellation. Separate approval.

## Recommended implementation order
- **Track A, trust (start first):** 1, 2, and the legal work in 4.
- **Track B, evidence:** 3, then the validation spike in 5 as soon as real files are supplied.
- **Then:** 5 build, 6, 7, 8, 9, 10, 11, each gated on the one before.
- **Copy:** the About rewrite can ship early because it claims only what exists. Statements about privacy and safety wait until those capabilities are live.

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
