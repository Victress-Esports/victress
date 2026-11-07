# Safety operations: report review requirements (proposal)

**Status: PROPOSAL. Nothing is implemented, and no person or role below has been assigned.**
Basis: [strategy document](../strategy/victress-business-purpose.md) sections 1, 3B, 4 and 6 (harassment is a named barrier for women competitors; safety reporting and resolution effectiveness is a named measure of trust).
Technical tables (`reports`, `blocks`, `moderation_actions`) are described in [privacy architecture](privacy-safety-architecture.md); this document is the **operating requirement** that must exist behind them. A report button with nobody reading it is worse than no button, because it makes a promise the company cannot keep.
Not legal advice. **LEGAL** items need counsel.

---

## 1. Principle: no exposure without a responder
Features that expose players to strangers stay **gated** until the requirements in section 8 are met and signed off:
- the public directory and `directory_listed`,
- the `scoutable` flag, recruiter discovery, contact requests and Scout Desk,
- named leaderboards,
- player spotlights or any editorial feature about individuals,
- any in-platform messaging (not planned).

Player controlled link sharing (revocable tokens) and a player's own private profile do not need to wait, because the player chooses and revokes the audience. Report and block controls ship together with the first gated feature, not after it.

## 2. Accountable owner
| Role | Responsibility | Status |
|---|---|---|
| **Trust and Safety Owner** (one named person) | Accountable for the review process, decisions at severity 1, policy interpretation, records, and reporting on measures to leadership | **Not assigned. Decision needed.** |
| **Deputy** (one named person) | Covers the owner's absence and any conflict of interest | Not assigned |
| **Reviewers** | Triage and decide severity 2 and 3 reports | Not assigned (may be the owner at small scale) |
| **Legal counsel** | Escalation for legal obligations, law enforcement requests, and policy text | **LEGAL**, not engaged |
| **Engineering contact** | Executes technical actions (hide, suspend, export evidence) with an audit trail | Not assigned |

Rule: no report is ever reviewed only by a person it concerns or a person with a personal relationship to the parties. Reports about staff go to the deputy or counsel.

## 3. Review hours (no 24/7 assumption)
Coverage is defined by what can actually be staffed. The starting design assumes **business hours coverage only** (the specific days, hours and time zone are a decision), plus automatic protection outside those hours:
- **Protective hold:** a report in a high severity category (section 4) immediately and automatically hides the reported profile or content from everyone except its owner, pending review. It is reversible and logged.
- **Abuse resistance:** protective holds are rate limited per reporter and per target, and each hold is reviewed by a human at the next staffed window. A burst of reports against one profile is itself flagged, because mass false reporting can be used to silence women competitors.
- **Honest published hours.** The reporting page states the actual review hours and that reports outside them are reviewed at the next window. It does not imply round the clock monitoring.
- Any plan to extend coverage (a second time zone, on call rota) is a staffing decision, not an assumption.

## 4. Severity and proposed response targets
Targets below are **proposed starting values to be adjusted to real staffing. They are internal goals, not public commitments** until the process has run long enough to be reliable.

| Severity | Examples | Automatic action | Proposed first human review | Proposed resolution target |
|---|---|---|---|---|
| **S1: urgent** | Sexual content involving minors, threats of violence or self harm, doxxing or exposure of private contact details, grooming or minor safety concerns | Protective hold immediately; owner alerted | Within the **next 4 staffed hours** (same business day) | Decision within 1 business day; legal escalation immediately where required |
| **S2: serious** | Harassment, hate or sexual harassment, impersonation, repeated unwanted contact | Protective hold when criteria are met (automated threshold) | Within **1 business day** | Within 3 business days |
| **S3: standard** | Spam, misleading profile content, other policy breaches | None | Within **3 business days** | Within 5 business days |

Appeals by an affected account: acknowledged within 2 business days, decided by someone other than the original reviewer within 5 business days.

## 5. Workflow
1. **Intake.** Report form (reporter id, target type and id, category, details). Confirmation to the reporter that it was received and the stated review hours. Reporters can follow the status of their own report.
2. **Triage.** Assign severity. Re-assign if a pattern (several reports, repeat offender, a recruiter account) raises it.
3. **Protective action.** Hide, restrict contact, or suspend, as needed, with the reason recorded.
4. **Investigation.** Review the minimum evidence needed, kept with the case. Reviewers see only what the case requires.
5. **Decision.** Warn, remove content, restrict, suspend or dismiss, recorded in `moderation_actions` with reviewer and rationale.
6. **Notify.** Tell the reporter the outcome category and tell the affected account the reason and the appeal path. Never reveal the reporter's identity to the reported party.
7. **Appeal and close.** Record the outcome. Review patterns weekly.

## 6. Escalation process
| Trigger | Escalate to | Time |
|---|---|---|
| Any S1 | Trust and Safety Owner, then counsel where illegal content, threats or minors are involved | Immediately on triage |
| Suspected child sexual abuse material | Counsel, and mandatory reporting to the relevant authority as the law requires (**LEGAL**); preserve evidence, do not distribute | Immediately |
| Credible threat of harm | Owner and counsel; contact emergency services where warranted | Immediately |
| Recruiter organization abuse | Owner; suspension under [organization verification](organization-verification.md) | Same day |
| A report concerns staff | Deputy or counsel | Immediately |
| Law enforcement or legal request | Counsel | Same day |
| Owner unavailable | Deputy | Automatic |

## 7. Records, privacy and measurement
- Case records: report, evidence, decisions, actors, timestamps. Retention period and who can read them (**LEGAL and decision**). Reviewer access is itself logged. Staff use least privilege and never the service role key in a browser.
- Reporter and reported party data are kept apart from public data. Reports are never visible to the reported party.
- Reviewer wellbeing: exposure to harmful content is limited, reviewers can step away from a case, and there is a clear path to support.
- Measures (strategy section 6): time to first review, time to resolution, share of S1 reports reviewed within target, appeal overturn rate, repeat offender rate, and recruiter contact decline and report rates. Reported internally; any public statistic is only published when accurate and sustained.

## 8. Readiness checklist (all required before any gated feature)
- [ ] Trust and Safety Owner and Deputy named
- [ ] Review hours, days and time zone defined and published on the reporting page
- [ ] Severity definitions and targets adopted (adjusted to real staffing)
- [ ] Reporting, blocking and protective hold implemented and tested
- [ ] Interim tooling available (dashboard and SQL, or an admin screen) with access controls
- [ ] A drill completed: a test report moved from intake to decision and appeal
- [ ] Community guidelines and acceptable use text approved (**LEGAL**)
- [ ] Escalation contacts and counsel engaged; mandatory reporting process documented (**LEGAL**)
- [ ] Retention policy for case records approved (**LEGAL**)
- [ ] Organization verification process operating, if recruiters are involved

## 9. Risks
- **Understaffing:** reports go unread. Mitigation: gating, honest hours, protective hold, low volume at launch.
- **Weaponized reporting** against women competitors. Mitigation: rate limits, pattern detection, human review, appeals.
- **Over-blocking by protective holds.** Mitigation: reversible, reviewed at the next window.
- **Single person dependency.** Mitigation: deputy and written procedure.
- **Harm to reviewers.** Mitigation: exposure limits and support.
- **Legal exposure from handling illegal content.** Mitigation: counsel before launch.

## 10. Decisions needed
1. Name the Trust and Safety Owner and Deputy.
2. Define review days, hours and time zone.
3. Accept or adjust the proposed targets.
4. Interim tooling choice, and who gets staff access.
5. Retention period for case records. **LEGAL**
6. Counsel and the mandatory reporting process. **LEGAL**
