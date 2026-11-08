# Proposed CLAUDE.md edits (nothing in CLAUDE.md was changed)

The founder's decisions of 2026-11-07 conflict with several lines of CLAUDE.md. CLAUDE.md is not edited until the founder approves. Exact current text and the proposed replacement:

## A. Status language and "Planned" (section 1 and section 3)
- Current (section 1, last bullet): "Anything unbuilt is labeled Coming soon or Planned."
- Proposed: "Anything unbuilt carries one plain 'Coming soon' label next to it, and nothing else about status. Pages never use 'in development', 'under development', 'being built', 'beta', 'early', 'pilot stage', 'planned' or similar, and titles, descriptions, headings and the hero never mention status."
- Current (section 3): "Make private scrim collection and analysis genuinely work, use it to strengthen Player Resumes, build Scout Desk..." is an internal roadmap and stays internal; it must not appear as company progress on the site.

## B. Stats players enter themselves (section 2)
- Current: "Automated game data is fundamental; provenance is mandatory. Automated game data is the core offering. Manual stats are a fallback, never the main experience. Every stat records its source. Keep these three distinct everywhere: `self_reported`: entered by the player. Shown with the label "Self-reported"..."
- Proposed: "Automated game data is fundamental; provenance is mandatory. **Victress does not publish stats that players enter themselves.** Self-entered stats are not shown on any public or shared surface (public profiles, sharing links, the directory, leaderboards, social cards, structured data, emails). Existing stored entries are kept untouched and are not displayed. Provenance rules still apply to anything shown later: `api` (a real game API) and `demo_parsed` (an uploaded demo or replay) stay distinct and are labeled by source, and verification establishes the provenance and integrity of evidence, never a player's ability."
- Also current section 6 exceptions: "...the data provenance label 'Self-reported'". Proposed: keep the exception only if a Self-reported label is ever shown again; today it is not shown anywhere.

## C. Women in Esports wording (line 15 of the file, section 1)
Already reads "an intentional shared-value commitment". Proposed final wording, per the founder: "an intentional shared value commitment within Victress, delivered through the same three products" (see core-expression-wording.md).

## D. Home page and copy rules (section 6, Brand)
- Add: "The home page has one job: get design partner teams and sign ups. Above the fold: the tagline as the headline (once), one plain sentence, one Become a Design Partner button with one small line, one labeled product sample, and one Sign up button in the header. Nothing else competes. Page titles and meta descriptions are plain industry phrases and are never the tagline; they describe only what is live. The tagline is used once on a page."
- Current section 6 says "Tagline: ... One tagline only." Compatible.

## E. Legal and billing (sections 5 and 7), after Parts 1 and 2 of the 2026-11-07 message
- Current (section 5): "Make no unsupported privacy, security, age (COPPA) or compliance claims. Legal text stays labeled pending legal review." and "Never launch billing, change production data or change production database behavior without explicit approval. Keep NEXT_PUBLIC_BILLING_ENABLED=false."
- Proposed: "Legal pages (Terms, Privacy, Refunds) are final plain English text approved by the founder, with no 'pending legal review' or 'counsel' labels. They describe only what exists and make no unsupported privacy, security, age or compliance claims. Billing code exists but is off: NEXT_PUBLIC_BILLING_ENABLED stays false and flipping it is the founder's one switch. Stripe live keys are used only by the Production environment; Preview builds read STRIPE_TEST_ variables and never fall back to live keys. Prices and plan definitions do not change without approval."
- Current (section 7): "Never merge or deploy without approval." stays.

## F. docs/status.md
Updated in the same PR (stats and leaderboards retired).
