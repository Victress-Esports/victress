# Recruiter organization verification (proposal)

**Status: PROPOSAL. Nothing is implemented, and no organization has been verified.**
Basis: [strategy document](../strategy/victress-business-purpose.md) section 3B (trustworthy recruitment processes; contact and private identity details are not disclosed without consent) and section 3A (Scout Desk).
Related: [privacy architecture](privacy-safety-architecture.md), [safety operations](safety-operations.md), [minors and recruiter access](minors-and-recruiter-access.md).
Not legal advice. **LEGAL** items need counsel.

## 1. Rules
1. **Self-registration never confers verified status.** An organization that signs up, and even one that pays for a Scout subscription, is **unverified** and has no access to recruiter discovery, scoutable profiles or contact requests. Payment is not verification.
2. **Verification is evidence based and objective** (section 3), recorded, reviewed by a person other than the requester, and time limited.
3. **Verification covers identity and authority, not endorsement.** A verified badge means Victress confirmed who the organization is and that its representative is authorized to act for it. It does not mean Victress endorses it, has vetted its conduct, or guarantees any outcome. The badge text says so.
4. **Players decide.** Verified status never overrides a player's consent (contact stays a request the player accepts).
5. **Nothing is available to minors' recruiters until legal review** ([minors](minors-and-recruiter-access.md)).

## 2. Organization types
| Type | Examples |
|---|---|
| Team | Competitive amateur or semi professional teams and clubs |
| Collegiate program | Varsity or club esports programs at a college or university |
| League or tournament organizer | Leagues, circuits, event operators |
| Other recruiter organization | Talent or scouting organizations, coaching organizations, community programs that recruit players |

Individual unaffiliated scouts are **not** verified in the first release (an open decision, section 9).

## 3. Objective verification criteria
All types must satisfy the **common requirements**; each type adds its own **evidence requirements**. Each criterion is recorded as pass, fail or not applicable, with the evidence reference.

### 3.1 Common requirements (every organization)
| # | Criterion | Acceptable evidence |
|---|---|---|
| C1 | Identity of the organization | Legal name and, where applicable, registration or institutional identity that matches an official source |
| C2 | Official web presence | An official site or page on a domain the organization controls, naming the organization |
| C3 | Representative identity and authority | The representative appears on the organization's official site, staff directory or event page with a role that covers recruiting or program management, **or** provides written authorization from an officer who is listed that way |
| C4 | Representative control of an official address | A confirmation message sent to an email on the organization's verified domain, confirmed by the representative |
| C5 | Independent corroboration | At least one source not controlled by the applicant (for example a league or tournament listing, an institution page, a published roster or schedule) |
| C6 | Acceptance of recruiter terms | The representative accepts the recruiter code of conduct and data use terms (**LEGAL**), including no contact of players who have not consented and no sharing of player data |
| C7 | No disqualifying history | No prior suspension or revocation on Victress and no unresolved safety report |

### 3.2 Additional evidence by type
| Type | Required in addition to C1 to C7 |
|---|---|
| Team | Evidence of sustained activity: participation in at least one listed league, tournament or scheduled competition, and a publicly listed roster or leadership. Two independent corroborating sources, since small teams have little formal registration |
| Collegiate program | The institution's official program page and a staff directory listing for the representative; an official institutional email domain. Where a recognized collegiate esports association exists for the program, its membership is accepted as corroboration but is not required |
| League or tournament organizer | Public event history, published rules or a published event schedule, and an official contact listing |
| Other recruiter organization | A business or organizational registration appropriate to its jurisdiction, a public description of what it recruits for, and **two** references from verified organizations or a documented relationship (such as a listed partner event) |

If any criterion cannot be met, the organization stays unverified. Reviewers may not waive criteria; a waiver needs the Trust and Safety Owner and is recorded.

## 4. Representative verification
- Each **member** seat is verified individually: official domain email (C4), listing on the organization's site or an authorization from a verified administrator (C3).
- The **administrator** (the representative who applied) must satisfy C3 and C4 directly.
- Adding or replacing a representative re-runs C3 and C4 for that person. A seat whose email domain no longer matches is suspended.
- Sharing a login is prohibited and detectable by access logs.

## 5. Approval records
Every decision is recorded and immutable (new entries, never overwrites).

`organization_verifications` (proposed shape): organization, type, applicant, status, checklist results per criterion with evidence references (URLs, document ids, date collected, collector), **two** reviewers (the second must be a different person), decision and reason, decision date, expiry date, conditions, and the previous record it supersedes. Evidence is stored with access controls and retained under the retention policy (**LEGAL**).
Statuses: `unverified`, `pending`, `verified`, `suspended`, `revoked`, `expired`.

Two person rule: a second reviewer confirms the first reviewer's checklist. Collegiate programs and any application involving player contact at scale also require the Trust and Safety Owner's sign off.

## 6. Periodic review
- **Annual re-verification.** Status expires 12 months after approval unless reconfirmed against C1 to C7. An expired organization immediately loses discovery and contact access; existing player grants are not revoked by expiry alone but no new contact requests can be sent.
- **Event driven review** when: a representative changes, a safety report names the organization, contact request decline or report rates exceed a set threshold, the organization's site or listing disappears, or the organization's type or ownership changes.
- **Quarterly sampling** of activity (request volume, decline rate, reports) by the Trust and Safety Owner.
- Reviews are recorded the same way as approvals.

## 7. Suspension and revocation
| Action | When | Effect | Process |
|---|---|---|---|
| **Suspension** (temporary) | A credible report, abusive contact patterns, suspected impersonation, expired evidence, or a pending investigation | Immediately stops search, viewing of scoutable profiles and new contact requests. Pending requests are withdrawn. Existing grants stay unless the investigation finds a risk to players, in which case they are revoked | Owner decision, recorded with reason and review date. The organization is told the reason and how to respond |
| **Revocation** (permanent for this verification) | Confirmed misuse of player data, harassment, impersonation, false evidence, breach of recruiter terms | All access ends; **all contact grants are revoked**; players who were contacted are informed that the organization is no longer verified | Two person decision including the owner; recorded; reapplication only after a cooling off period and a new full review |
| **Reinstatement** | After a suspension resolves | Access restored; status reviewed at next period | Recorded; second reviewer |

An organization may appeal a suspension or revocation to someone other than the original reviewer.

## 8. Operations and risks
- Verification is **manual** at first and owned by the Trust and Safety Owner ([safety operations](safety-operations.md)). A stated turnaround target is a staffing decision (for example a number of business days); none is promised publicly until proven.
- **Risks and mitigations:** impersonation or social engineering (use C3 plus C4, independent corroboration, second reviewer); a verified organization later misbehaves (periodic review, suspension, revocation, player block and report); reviewer error (two person rule); evidence storage becoming a privacy risk (minimal, access controlled, retained as the policy requires); backlog (sales of Scout access are sequenced after verification capacity exists).
- Selling a Scout subscription to an organization before it can be verified would sell something it cannot use. Decision: sell only to organizations once verification capacity exists, or sell with a clear "pending verification" state and a refund path.

## 9. Decisions needed
1. Approve criteria C1 to C7 and the per type additions.
2. Individual unaffiliated scouts: exclude at first (recommended) or define a separate path later?
3. Verification turnaround target and who performs verification.
4. Order of Scout sales versus verification capacity (section 8).
5. The recruiter code of conduct and data use terms. **LEGAL**
6. Evidence retention. **LEGAL**
