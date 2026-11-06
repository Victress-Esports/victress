# Proposals, dependencies and implementation order

Nothing in `docs/proposals/` is implemented. Each document needs approval before any database, authentication, permission, billing or privacy change is made.
Governing document: [docs/strategy/victress-business-purpose.md](../strategy/victress-business-purpose.md) (supersedes conflicting earlier instructions).

| Proposal | Status |
|---|---|
| [Privacy, identity and safety architecture](privacy-safety-architecture.md) | Awaiting approval |
| [Plan entitlement matrix](entitlements.md) | Awaiting approval |
| Age enforcement (design to be written; needs legal review) | Not yet written in the repo; summarized in `docs/compliance-audit.md` |
| AI crawler policy | Not yet written in the repo; `docs/compliance-audit.md` lists the options |
| `rls_auto_enable()` change | Not yet written; **do not modify** that function until separately approved |
| Automated game data (first integration, provenance model, parser architecture) | Research done in conversation only; **no first game is approved**; needs real demos and a validation spike |

## Remaining technical dependencies
1. **Privacy and access foundation:** visibility model, closing anonymous table reads, exact-handle functions, signup defaults. Everything that exposes players more widely depends on it.
2. **Safety minimum:** reporting, blocking, a moderation path and an owner for reviewing reports. Required before Scout Desk, spotlights or any wider discovery.
3. **Age and legal decisions:** enforcement approach, recruiter contact with minors, retention, legal requests. These gate scouting of minors and the consent design.
4. **Provenance schema:** `stat_entries.source` is limited to `'manual'` today. It must support `self_reported`, `api` and `demo_parsed`, plus a verification status and source identifiers, with interface labels and the wording "verification establishes provenance and integrity, not ability".
5. **Scrim Intelligence validation:** real demo and replay files for the candidate games, parser reliability, player attribution, and pilot demand decide the first integration. Then upload, a separate processing worker, match tables and analysis views.
6. **Player Resume on evidence:** provenance badges, match history, role context, de-emphasizing single-stat leaderboards.
7. **Entitlements and usage metering:** server-side limits before any checkout.
8. **Organizations and recruiter access:** organization verification, consent-gated contact requests and grants, access logging, then Scout Desk.
9. **Ecosystem constructs:** leagues, tournaments, collegiate programs, results import, and partnerships only when real.
10. **Measurement:** privacy-respecting metrics for the strategy's impact indicators, mostly derivable from database counts without tracking individuals.
11. **Billing (M4):** checkout, webhooks, entitlements lifecycle, cancellation. Separate approval.

## Recommended implementation order
**Parallel track A, trust (start first):** 1, 2 and the legal questions in 3.
**Parallel track B, evidence:** 4, then the validation spike in 5 as soon as real demos are supplied.
**Then:** 5 build, 6, 7, 8, 9, 10, 11 in that order, each gated on the one before it.

Reasoning: Player Resume and Scout Desk both rely on trustworthy evidence, and both increase exposure, so privacy, safety and provenance come before them. Scrim Intelligence is the differentiator but is the largest and least validated piece, so it is proven on real files before anything is promised.

## Messaging follow-up (not yet changed)
The strategy asks for the purpose to be reflected in business messaging, particularly the About page, without promoting it on every page. The current homepage section is still the earlier "Victress Women in Esports" initiative block, and the About page describes what Victress is but not why it exists. Proposed (for approval, no copy changed yet): rewrite About around the strategy's purpose and the Practice to Opportunity chain, keep the Women in Esports section but reframe it as an expression of the three pillars, and keep every claim limited to what exists.
