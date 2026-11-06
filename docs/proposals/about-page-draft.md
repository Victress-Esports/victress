# About page: draft rewrite (copy for review, not applied)

**Status: DRAFT COPY ONLY.** `content/copy.ts` and `app/m/about/page.tsx` are not changed by this document.
Basis: [strategy document](../strategy/victress-business-purpose.md) sections 1, 4, 7 and 8. The draft follows the marketing rules in `CLAUDE.md`: one tagline, concise plain language, **no hyphens or em dashes** (exceptions: the data label "Self-reported", game names), no promotional repetition, no unsupported claims.

## What the page must do
1. Explain why Victress exists, around the pathway **Practice → Performance Evidence → Development → Recognition → Opportunity**.
2. Present the three pillars as one connected platform.
3. Present **Women in Esports as a core expression of the company's purpose, realized through the same three pillars**, not as a separate product, program or fourth pillar.
4. Say exactly what exists today and what is planned. Every sentence is grounded in a capability that exists now, or is clearly labeled planned.

## Draft copy

**Heading (h1):** Why Victress exists.

**Opening paragraph:**
Competitive esports has enormous talent and ambition, but the road from practice to opportunity is fragmented. Players practice without always getting useful feedback. Their achievements are scattered across platforms and screenshots. Teams and recruiters often rely on informal networks to find talent.

**Purpose paragraph:**
Victress is building the infrastructure to change that: competitive development that is more measurable, talent that is easier to see, evaluation that is more transparent, and opportunities that are more accessible.

**Section heading:** From practice to opportunity.
A short ordered list, one line each:
1. Practice. Private scrims and team training.
2. Performance evidence. What actually happened, clearly sourced.
3. Development. Understanding strengths and trends.
4. Recognition. A credible record of what a player can do.
5. Opportunity. Connections with teams, coaches, collegiate programs and recruiters.

**Section heading:** Three connected capabilities.
- **Scrim Intelligence.** Coming soon. Upload private scrim demo or replay files for automatic performance statistics. Not available yet.
- **Player Resume.** Available now. A shareable player profile with self-reported stats. Verified scrim stats are planned, not available yet.
- **Scout Desk.** Coming soon. Player discovery and evaluation for teams, coaches and collegiate programs. Not available yet.

**Section heading:** Women in Esports.
Victress is called Victress for a purpose. Women who compete in esports face barriers that include harassment, limited access to competitive networks, informal gatekeeping and difficulty getting their achievements recognized.

We are not building a separate product for this. We are building the same infrastructure for everyone, and designing it to address those barriers: a Player Resume for visibility, Scrim Intelligence for development, and Scout Desk for opportunity.

Today the Player Resume is available. Scrim Intelligence and Scout Desk are being built. Victress is not currently offering funding, coaching, mentorship, scholarships or recruitment.

**Section heading:** How we handle evidence.
Every stat shows where it came from. Self-reported means the player entered it. As automatic game data arrives, it will be labeled by source. Verification will mean we can show where the evidence came from and that it is intact. It will not be presented as a judgment of how good a player is.

**Section heading:** Available now and planned.
- Available now: a shareable player profile with your games, roles and ranks; self-reported stats for six games; team rosters with invite links.
- Planned: automatic statistics from uploaded scrim files, verified scrim stats on the Player Resume, and Scout Desk.

**Call to action:** Get started (existing link to the app login).

## Claim by claim grounding
| Draft statement | Grounding today |
|---|---|
| Fragmentation, no feedback, informal networks | Strategy section 1 (a stated belief about the market, not a Victress feature) |
| "building the infrastructure" | Intent, in the present progressive; no capability claimed |
| Player Resume available now, self-reported stats | Exists (`app/a/[handle]/page.tsx`, `components/app/StatForm.tsx`) |
| Scrim Intelligence, Scout Desk coming soon | Not built; labeled as such, same wording as the homepage pillars |
| Women in Esports through the three pillars | Strategy section 4; statuses stated; no program claim |
| Barriers women face | Strategy sections 1 and 4 (a stated belief about the industry) |
| Not offering funding, coaching, mentorship, scholarships or recruitment | True; matches the standing disclaimer |
| Every stat shows its source | True for self-reported today (`ProfileCard`, `StatForm`, leaderboard note). Future tense for other sources |
| Verification is not a judgment of ability | Strategy section 3B |

## Statements held back until they are true
Do **not** publish these until the capability exists and is tested:
- Anything about player control of privacy, consent, or who can see a profile. Today profiles are publicly readable (see the privacy proposal). Publish only after the privacy foundation is live.
- Anything about reporting, blocking or safety review. Publish only after safety operations are staffed.
- Anything about verified data, organizations or recruiter verification.
- Any outcome, partnership, program, participant count or testimonial.

**Draft sentence to add once the privacy foundation ships:** "Your profile is private until you choose to share it, and you can revoke any link you create."
**Draft sentence to add once safety operations are live:** "You can report and block accounts, and our team reviews reports during published hours."

## Related homepage note (not drafted as copy)
The homepage "Victress Women in Esports" section currently labels itself a "community initiative in development" and sits after Teams. The strategy says it is a core expression of purpose. Proposed adjustment for review, kept small: keep the section and its disclaimer, keep it after the pillars, and align its introduction with the About wording above (the same infrastructure, the same three pillars). The About page would carry the fuller explanation, so the homepage does not need more promotion. Nothing is changed until approved.

## Review notes
- Length: about 330 words; the page stays short.
- The arrow notation Practice → Performance Evidence → … appears in the strategy; the page uses a numbered list instead, which avoids arrows and dashes in rendered copy.
