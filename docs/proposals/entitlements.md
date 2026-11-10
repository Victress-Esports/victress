# Plan entitlement matrix (proposal)

**Status: PROPOSAL for review (revision 2.2: Rookie team recommendation; roster wording corrected to match the database; decision 8 direction recorded; see the decision register). Nothing is implemented.** Prices, plan names and approved plan descriptions are **not changed** by this document (`content/pricing.ts`, `docs/stripe.md`). Billing stays off (`NEXT_PUBLIC_BILLING_ENABLED=false`).
Strategic basis: [docs/strategy/victress-business-purpose.md](../strategy/victress-business-purpose.md), section 5 (the business model that sustains the purpose), section 3B (accessible development infrastructure) and section 6 (cost-effective expansion).

Approved plans, unchanged:

| Plan | Price | Approved audience and description |
|---|---|---|
| Rookie | Free | New and aspiring players. "Get your player profile started. Show who you are and what you've done in esports." (updated by the founder 2026-11-10) |
| Pro | $7.99/month or $75/year | Competitive players. "Take your player profile further. Show more of your experience and get noticed by teams." (updated by the founder 2026-11-10) |
| Team | $49/month | Competitive teams. "Everything your roster needs in one place. Manage players, follow team progress, and keep your program organized." |
| Scout | $249/month | Recruiters and collegiate programs. "Find the right players. Explore competitive profiles, compare performance, and organize recruitment prospects." |

## 1. Principles for deciding what is paid
1. **Never paywall trust.** Privacy controls, consent, reporting and blocking, data provenance labels, and the ability to be discovered **by choice** are available on every plan. No player should have to pay for safety or for a chance to be seen.
2. **Charge for what costs money to run and for organizational value.** Compute-heavy processing, storage and retention, team workflows and recruiter tooling are the paid dimensions.
3. **Rookie is a real entry into the ecosystem**: a full Player Resume, consent controls and meaningful scrim analysis, but with a **bounded processing allowance**. Free processing is never unlimited.
4. **Downgrades never delete a player's record.** A player who lapses keeps their Player Resume and existing results. Only new processing or advanced views are limited.
5. **Entitlements are enforced on the server** (processing queue, RPCs), never only in the interface.

## 2. Status today
Billing is off, so every account has everything that exists. Live now: profile, per-game roles and ranks, self-reported stats, search opt-in, team creation and invites (roster of up to 10), per-game leaderboards. Everything in the matrix below that is not in that list is **not built**.

## 3. Proposed matrix
Legend: **Yes** included. **Limited** included with a cap (the cap value is a parameter set after the cost measurements in section 5; no figures are promised here). **No** not included. **Not built** means the capability itself does not exist yet.

### Player capabilities
| Capability | Rookie | Pro | Team | Scout |
|---|---|---|---|---|
| Player Resume, shareable link, visibility and consent controls | Yes | Yes | Yes | n/a |
| Self-reported stats (labeled **Self-reported**) | Yes | Yes | Yes | n/a |
| Games, roles, ranks (all six games) | Yes | Yes | Yes | n/a |
| Report and block tools, privacy controls | Yes | Yes | Yes | Yes |
| Opt in to be scoutable (**gated**: no recruiter discovery until safety operations and legal review are in place) | Yes, once available | Yes | Yes | n/a |
| Scrim Intelligence (upload and automatic analysis), **Not built** | Limited allowance per month | Larger allowance | Pooled team allowance | n/a |
| Match history and development trends, **Not built** | Limited history window | Full history | Full history | n/a |
| Parsed result provenance (`demo_parsed`, `api`) shown on the Resume | Yes | Yes | Yes | n/a |
| Advanced analysis (utility, economy, positioning), **Not built** | No | Yes | Yes | n/a |
| Highlights and tournament placements on the Resume, **Not built** | Limited | Yes | Yes | n/a |

### Team capabilities
| Capability | Rookie | Pro | Team | Scout |
|---|---|---|---|---|
| Join a team, appear on a roster | Yes | Yes | Yes | n/a |
| **One basic team**: create it, invite players by link, roster up to the existing limit of 10 (exists today) | **Yes, one team** | Yes, one team | Yes | n/a |
| More than one team owned by the same account | Not possible today | Not possible today | Not planned: direction is one team per Team subscription (decision 8). **A player can belong to only one team today** (`already_in_team`, `in_other_team`, single `profiles.team_id`) | n/a |
| Shared scrim review and team performance, **Not built** (advanced) | No | No | Yes, pooled allowance | n/a |
| Player comparisons within a roster, **Not built** | No | No | Yes | n/a |
| Coach and manager roles and seats, **Not built** | No | No | Yes (seat cap) | n/a |
| Team development history, **Not built** | No | No | Yes | n/a |

### Recruitment capabilities
| Capability | Rookie | Pro | Team | Scout |
|---|---|---|---|---|
| Discover scoutable players, filter by game, role, rank, region, **Not built** | No | No | No | Yes |
| Compare players on provenance-tagged evidence, **Not built** | No | No | No | Yes |
| Prospect lists and notes, **Not built** | No | No | No | Yes (list cap) |
| Contact requests (consent flow), **Not built** | No | No | No | Limited per month and rate limited |
| Organization seats, verified organization status, **Not built** | No | No | No | Yes (seat cap) |
| Access to private contact details | Never without a player's grant, on any plan | | | |

**Scope note (decision 7, awaiting counsel):** individual scouts are excluded from the initial scope, and Scout access is not sold or enabled until verification capacity and the necessary policy exist. Recruiter discovery and contact stay disabled for all players pending qualified legal review. The rows above are proposals only.

**Founder direction 2026-11-07:** Scout Desk (player discovery) is gated to the Scout plan only. It is not opened to the Team plan until the founder approves otherwise. The approved plan descriptions list player discovery under Scout only.

### Data access, retention and usage
| Item | Rookie | Pro | Team | Scout |
|---|---|---|---|---|
| Processed scrims per month | Small cap (TBD) | Larger cap (TBD) | Pooled cap (TBD) | n/a |
| Uploaded file size and type limit | Same technical limit on all plans, set by the parser and storage | | | |
| Raw demo file retention | Deleted shortly after parsing; derived results kept (TBD days) | Longer (TBD) | Longer (TBD) | n/a |
| Derived results retention | Kept while the account exists | Kept | Kept | n/a |
| Data export and self-serve deletion | Yes (to be built) | Yes | Yes | Yes |
| Recruiter searches and views | n/a | n/a | n/a | Rate limited and logged |

## 3A. Basic team versus advanced team workflows (Rookie recommendation)
**Recommendation (approved direction): Rookie includes one basic team with the existing roster limit. Advanced team workflows and compute-heavy capabilities stay in paid plans. Prices are not changed.**

| | Basic team (Rookie, Pro, Team) | Advanced team workflows (Team plan) |
|---|---|---|
| Roster | Up to the existing cap of **10 members in total** (the database does not enforce a player and coach split, and no function assigns the coach role today), invite link, join and leave, owner removes members, regenerate invite code | Same cap unless a later decision changes it |
| Team page | Team name and member list visible to members | Team portfolio and team page features (**Not built**) |
| Scrim analysis | Each member uses their own personal allowance | **Pooled** team allowance, shared scrim review, team trends (**Not built**, compute heavy) |
| Comparisons | None | Player comparisons within the roster (**Not built**) |
| Roles and seats | Membership with the existing role values (`owner`, `coach`, `player`); membership stays open to everyone | Coach and manager **seats** meaning paid permissions and workflows (**Not built**; a separate entitlement concept per decision 8) |
| Team development history | None | Yes (**Not built**) |
| Recruiter visibility of the team | None | Not part of the team plan; recruiter access is the Scout plan and requires verification |

Why: a team is how most players enter the ecosystem, including players who cannot pay, so one basic team keeps that door open and costs almost nothing to run (a roster is a few rows). The costly and organization-level value (pooled processing, comparisons, history, seats) is where the Team plan charges. Nothing is taken away from what exists today.

Implementation outline (after authorization, not before): today `create_team` already refuses a player who is in any team (`already_in_team`), so one basic team per player needs no new rule, and one team per Team subscription is consistent with it. Advanced features would check the plan on the server. If a Team subscription lapses, the team and roster **remain**; only advanced workflows stop. Downgrade never removes members or history.

## 4. Why these lines
- **Visibility is free.** The Player Resume, consent controls and opt-in scouting sit on Rookie because the strategy ties visibility directly to the purpose (strategy section 4).
- **Development has a real free tier but a bounded one.** A capped monthly allowance of scrim analysis gives every player meaningful performance feedback while protecting unit costs.
- **Organizational workflows pay.** Team and recruiter features create value for organizations, which is where the business model charges (strategy section 5).
- **Contact is never a product feature that overrides consent.** Even Scout cannot see private details without a player's grant.

## 5. Cost implications (to be measured, not assumed)
No cost figures are claimed because no parser exists yet. The drivers and what is needed to price the limits:

| Driver | Why it matters | What to measure in the validation spike |
|---|---|---|
| Raw demo and replay size | Files can be large (hundreds of megabytes is plausible) and dominate storage and bandwidth | Real file sizes per game, compression ratio |
| Parse compute | Runs on a separate worker, not on Vercel serverless | Wall-clock and memory per match, failure rate |
| Storage and retention | Raw files kept for N days, derived data kept long term | Bytes per match for raw and derived data |
| Egress and downloads | Users re-downloading or re-processing | Usage patterns in a pilot |
| Support and moderation | Safety review is staffed work | Report volume in a pilot |

Method: compute a **cost per processed scrim** (compute + storage over the retention window + egress) from pilot measurements, then set each plan's allowance so that the plan's gross margin stays positive at expected usage, with Rookie's allowance treated as an explicit, budgeted shared-value cost. If the free allowance proves too expensive, reduce it, shorten raw file retention, or limit the free tier to one game, in that order. Do not quietly cut safety or visibility.

## 6. Open questions
1. **Team creation on Rookie and teams per Team subscription: direction approved (decision 8, not authorized for implementation).** One basic team with the existing roster limit is on Rookie and Pro; one team per Team subscription; the roster is described as "up to 10 members". Coach permissions remain a separate entitlement concept and are **not implemented** (the `coach` role value exists in the schema, but no function assigns it and no coach permissions exist).
2. **Free allowance size and retention.** Set after the cost measurements in section 5.
3. **Regional or institutional access.** Whether any reduced-cost access for collegiate or community programs should exist is a business decision. Nothing is proposed or promised here, and no discount may be advertised.
4. **Scout contact limits.** The monthly request cap should balance recruiter usefulness against harassment risk; set it with the moderation design.
5. **Team plan extras.** Team portfolio and team page features appear in section 3A as Team plan proposals. Decision 8 did not address them, so they remain unconfirmed proposals.
6. **Self-reported versus verified in Pro and Scout views.** Whether recruiter filters default to verified provenance only. Verification speaks to evidence integrity, not ability, and the interface must say so.

## 7. Implementation outline (after approval, not before)
- Tables: `entitlements` (account or organization, plan, status, period), `usage_events` or counters (processed scrims, contact requests), each written only by server code.
- Enforcement points: the processing queue (before accepting a job), the recruiter RPCs, contact request creation.
- Stripe: reuse the existing test-mode product and price ids in `docs/stripe.md`; entitlements derive from verified webhook events. Checkout is built only after entitlements exist (M4, separate approval).
- Entitlements default to "all current features available" while billing is off, so nothing live is taken away before billing launches.

**Scout Desk shell (2026-11-07):** `/dashboard/scout` exists as a gated, read nothing page: it explains the plan gate (Scout plan only), why discovery is closed, what players control and what is planned. There is no discovery, roster pipeline, player list or contact feature, no database policy or function granting any recruiter access to other players' data, and `scoutable` remains unwritable by users. Building the functional desk needs: decision 7 items answered, qualified legal review of recruiter discovery and contact, organization verification capacity, and safety operations (decisions 5 and 10). Until then even a Scout plan account sees only the closed page.
