# Proposal: reporting, blocking and moderation

**Status: PROPOSAL. Nothing is implemented. No person or role is assigned.** Women competitors, and other players, can face harassment, doxxing and unwanted contact; the strategy document names this as a barrier and "safety reporting and resolution effectiveness" as a measure of trust. Reporting, blocking and moderation are part of the product, not an afterthought, and they ship **before or together with** the first feature that exposes players to strangers.

This builds on, and does not replace, three existing documents: [safety-operations.md](safety-operations.md) (the operating requirement: owner, hours, severity, workflow, readiness checklist), [privacy-safety-architecture.md](privacy-safety-architecture.md) (the technical tables `reports`, `blocks`, `moderation_actions` and the gating of exposure features) and decisions 5 and 6 in [decision-register.md](decision-register.md). This document adds: an honest inventory of what exists, the minimum that must exist before each exposure feature opens, a staged build plan with a design for the tables, and the ownership decisions. Not legal advice; **LEGAL** items need counsel.

## 1. What exists today (verified in the repository and read only on production, 2026-11-07)
| Area | State |
|---|---|
| Report button, report form, report storage | **None.** No code, no tables (`reports`, `blocks`, `moderation_actions` do not exist, on production or staging) |
| Block, mute, hide a user | **None** |
| Moderation tooling, admin screen, audit log | **None.** Interim tooling is only proposed (Supabase dashboard and SQL) |
| Trust and Safety owner, deputy, hours, report channel | Owner: Matt Hill (recorded 2026-11-07). Deputy, hours and report channel **not yet established** (decision 5) |
| Response targets | Approved provisionally as internal goals only, never public (decision 6); cannot yet be measured |
| A way for a person to tell Victress about a problem | Only the general contact address `hello@victressesports.com`. The site does not promise a response time and should not (nobody is assigned to read it for safety) |
| What reduces exposure by design | Profiles are private by default; every consent is off for new profiles; sharing links are hashed, revocable and off (`SHARING_ENABLED`); the directory and leaderboards are off (`DIRECTORY_ENABLED`); no messaging, no contact feature, no recruiter access exists |
| Content a user can type that others could see (once exposure opens) | Handle (reserved and offensive fragment rules exist), display name and bio (free text, **no moderation**), profile photo (2 MB, image types only, **no moderation**), team name and the roster inside a team (visible to teammates), tournament and highlight link text (not on production yet) |
| Team abuse controls | A team owner can remove a member (`remove_team_member`); a member can leave. Owners and members can be reported to nobody today |
| Public wording | The Women in Esports page says reporting, blocking and review "will be in place before features that expose players to strangers launch". That is accurate today and must stay conditional |
| Legal text | Terms and Privacy are drafts pending legal review; no community guidelines or acceptable use text exists |

**Bottom line:** today a player is exposed to strangers only through what they choose to share (nothing is shared by default) and through team invites. That is why the safety work gates the exposure features rather than blocking everything.

## 2. What must exist before each feature opens
This is the operating gate from safety-operations section 1 and the architecture document, made specific. "Report and block" means a working form, storage, a reviewed workflow and tooling, tested in a drill.

| Feature | Report | Block | Protective hold | Staffed review | Org verification | Other |
|---|---|---|---|---|---|---|
| Sharing links (`/r/{token}`) | Yes, from the link page | n/a (the player chooses and revokes the audience) | Yes | Yes (decision 5 requires the appointments before link sharing launches) | No | Edge rate limit on `/r/*`; counsel on minors |
| Public directory, public profile pages, named leaderboards, search indexing | **Yes** | **Yes** | **Yes** | **Yes** | No | Moderation of display name, bio and photo (see 5); community guidelines (**LEGAL**) |
| Player spotlights or any editorial about individuals | Yes | Yes | Yes | Yes | No | Explicit consent per spotlight |
| Scout Desk, recruiter discovery, `scoutable`, contact requests | **Yes, including reporting a recruiter organization** | **Yes, per player and per organization** | Yes | Yes | **Yes** | Counsel; minors rules; consent for contact |
| Any in-platform messaging | Yes | Yes | Yes | Yes, with message evidence handling (**LEGAL**) | Where recruiters are involved | Not planned |
| Scrim file uploads (private) | Not needed: private to the uploader | n/a | n/a | n/a | No | Consent and retention points in [scrim-intelligence.md](scrim-intelligence.md); counsel on other people's data in files |
| Team invites and rosters (exist) | Recommended soon: report a team or a member | Block a user from joining or inviting you | No | Needed once teams are in real use | No | Owner removal exists |

## 3. Proposed minimum product (stage 1, ships with the first exposure feature)
**Reporting**
- A "Report" control on every surface a stranger can reach: a shared profile page, a directory profile, a leaderboard row, a team page, and (later) a contact request. A report form works for signed in users; whether anonymous visitors may report from a shared link is an open decision (readiness review G6): proposal is signed in users plus an email address check, because anonymous reports are the easiest route for weaponized reporting.
- Fields: target (profile, team or content item), category (harassment or hate, sexual content, impersonation, doxxing or private contact details, threats or self harm, something involving a minor, spam or misleading, other), free text, optional evidence the reporter chooses to add. The reporter gets a confirmation and the stated review hours, and can see the status of their own report.
- A report never reveals the reporter to the reported party.

**Blocking**
- A player can block another player or a team: the blocked account cannot see the blocker's shared or public profile, cannot send a contact request or team invite to them, and cannot appear to them in leaderboards or searches. Blocking is silent (the blocked person is not told). The blocker can list and undo blocks.
- Blocks must be enforced in the same server functions that already return public data (`directory_profile`, `shared_profile`, `board_entries`), not only in the interface.

**Protective hold**
- A report in a high severity category (S1) or a burst of reports against one target hides that profile or content from everyone except its owner until a human reviews it. It is reversible, logged and rate limited per reporter and per target (weaponized reporting against women competitors is a named risk).

**Moderation actions**
- Warn, remove content (display name, bio, photo, link text), restrict contact, suspend, dismiss; each stored with the reviewer, the reason, a timestamp and an appeal path. The affected person is told the reason and how to appeal. Appeals are decided by a different reviewer.

**Tooling and records**
- Interim admin access through the Supabase dashboard and SQL with named staff and least privilege (the service role key never in a browser), moving to a small admin screen. Every reviewer access to a case is logged. Retention of case records is a **LEGAL** decision.

## 4. Proposed data design (for review; no migration written)
- `reports` (id, reporter_id, target_type, target_id, category, severity, details, status, assigned_to, created_at, resolved_at). RLS: the reporter reads their own; nobody else; staff through the service role only.
- `blocks` (blocker_id, blocked_id or blocked_team_id, created_at). RLS: the blocker reads and writes their own; never readable by the blocked party.
- `moderation_actions` (id, report_id, target, action, reason, actor, created_at, appeal_status). Staff only; the affected person reads only their own notices through a function.
- `protective_holds` (target, reason, created_by, created_at, released_at) or a flag on the target, read inside the existing public read functions.
- Reads follow the pattern already used for the privacy foundation: service role only functions, closed anonymous reads, tested negative cases, additive migrations tested on a throwaway Postgres, a rolled back dry run on production, a tested rollback. The one real account on production means these changes need Pro (backups) first.

## 5. Content moderation scope
Text and images a user chooses to make visible are the risk: display name, bio, photo, handle, team name, highlight titles and links. Proposed order: (1) reactive moderation through reports; (2) a conservative automated filter for handles and display names (the offensive fragment list exists for handles only); (3) photo handling decided with counsel (the private avatar bucket design in the architecture document); (4) no user generated content is shown to strangers until the report path above works. Links to outside clips can lead anywhere; show them only after the owner opts in and consider showing the destination before navigation.

## 6. Ownership
| Role | State | Needed by |
|---|---|---|
| Trust and Safety Owner | **Matt Hill (founder), recorded 2026-11-07.** Hours, report channel and tooling still to be defined | Before any exposure feature or link sharing |
| Deputy | **To be named later (founder, 2026-11-07).** Still a requirement before launch | Same |
| Reviewers | Not assigned (the owner at small scale) | Same |
| Counsel | **Not engaged** (decision 10) | Before launch: mandatory reporting duties, minors, retention, community guidelines |
| Engineering contact for holds, suspensions, evidence export | Not assigned | Before launch |
Options already on record (decision 5): the founder as interim owner with a named external deputy; contracted moderation; delaying exposure features until a dedicated hire. Whoever owns it, the published review hours must describe real coverage, and outside those hours the protective hold is the safeguard, not a promise of round the clock monitoring.

## 7. Build plan and gates
1. **Now (no code):** founder decisions in section 8; name owner and deputy; choose a report channel (a dedicated safety address is the minimum before anything opens); counsel engaged for guidelines and mandatory reporting.
2. **Stage 1 (code, after approvals):** tables, report form on shared pages, blocks enforced in the read functions, protective hold, interim tooling, a drill (a test report taken from intake to decision and appeal), published hours. Each production step needs its own authorization and a tested rollback.
3. **Stage 2:** admin screen, reporter status view, pattern detection for report bursts, measures dashboard.
4. **Only then** flip `SHARING_ENABLED`, then `DIRECTORY_ENABLED`; later organization verification and recruiter contact, each behind its own gate.

## 8. Decisions needed
1. Name the Deputy (the owner is recorded as Matt Hill, 2026-11-07), or choose the interim options in decision 5.
2. Report channel: a dedicated address and an in app form; and whether anonymous visitors may report.
3. Review days, hours and time zone; accept the provisional targets as internal only.
4. Interim tooling and who gets staff access.
5. Retention period and access rules for case records (**LEGAL**); mandatory reporting process (**LEGAL**); community guidelines and acceptable use text (**LEGAL**).
6. Whether the first exposure feature is sharing links or the directory (sharing links are player controlled and revocable, so they are the smaller step).
7. Photo and display name moderation approach.

## 9. What the site may say meanwhile
Nothing beyond the conditional line that already exists ("will be in place before features that expose players to strangers launch"). No page may claim reporting, blocking, moderation, response times or a safe environment until each is built, staffed and tested.
