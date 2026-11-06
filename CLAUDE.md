# Victress project principles

These are permanent. Every feature, copy change and design decision should be checked against them.
Victress is building the infrastructure that helps competitive esports players develop, prove their abilities and get discovered.

## 1. A technology business first
Victress is an esports player development and recruitment platform. Three pillars work together:
1. Scrim Intelligence: measure competitive performance using actual match data.
2. Player Resume: turn performance and achievements into a credible player profile.
3. Scout Desk: help teams, coaches, collegiate programs and recruiters find and evaluate talent.

The website communicates this business. Women in Esports (written in full as "Victress Women in Esports", a community initiative powered by Victress) is a secondary shared value initiative. It is not the company's primary identity, a fourth pillar or a product. Do not use any other initiative name.

## 2. Automated data is fundamental
- Automated game data is the core offering. Manual stats are a fallback, never the main experience.
- Never claim a game integration works until it has been implemented and tested.
- Keep support for all six games in the architecture: VALORANT, CS2, Rocket League, League of Legends, Apex Legends, Overwatch 2.
- Build and validate one reliable integration before expanding. Present research and architecture for approval before any major integration.
- Every stat records its source: `api` (a real game API), `demo_parsed` (extracted from an uploaded demo or replay) or `self_reported` (entered by the player). Never present self reported data as verified.
- Account linking does not by itself provide private scrim data. Do not assume it does.

## 3. A focused product, not an oversized portal
Sequence: make private scrim collection and analysis work, then use it to strengthen Player Resumes, then build Scout Desk on credible evidence, then advanced tactical analysis. Do not build disconnected features that do not strengthen this progression.

## 4. Two sites, two jobs
| Site | Job |
|---|---|
| victressesports.com (`app/m`) | Company, marketing, product explanation, pricing, partnerships |
| victress.gg (`app/a`) | The application and player experience |

Keep routing, authentication, canonicals and responsibilities separate. Do not assume cookies are shared across domains. The marketing site shows real product experiences. Sample or simulated visuals are always labeled Sample, and unbuilt features are labeled Coming soon until they are implemented and tested.

## 5. Protect the business and its users
- Preserve Supabase Row Level Security. Use additive migrations, tested in a rolled back transaction first.
- Protect private player and team data. Data sharing must be intentional and opt in.
- Make no unsupported privacy, security, age (COPPA) or compliance claims. Legal text stays labeled as pending legal review.
- Never launch billing, change production data or change production database behavior without explicit approval. Keep `NEXT_PUBLIC_BILLING_ENABLED=false`.
- Never commit secrets. The service role key stays server side.

## 6. Brand
- Tagline: "Turn practice into progress." One tagline only. Do not stack other slogans.
- Preserve the original Victress wings emblem. Never redraw it or replace it with a generic V.
- Palette: Crimson #CF142B, Signal Red #F34144, Coral #FF635F, Warm Coral #FF847B, Blush #FFA498, Carbon #171717, White #FFFFFF, Cool Gray #5B6068.
- Premium, restrained, product led. Concise copy, real application previews. No generic gaming visuals, excessive animation, glow or gradients.
- **Avoid hyphens and em dashes in Victress marketing copy.** Game names (Counter-Strike) are the exception.
- Approved pricing and plan descriptions stay verbatim (see `content/pricing.ts` and `docs/stripe.md`).

## 7. Workflow
- Inspect the actual repository and deployment state before changing anything.
- Work in scoped branches and pull requests. Run typecheck, lint, build and the SEO audit (`npm run seo:audit`). Report exactly what changed.
- Never merge or deploy without approval. Keep PR #2 and #3 unmerged until told otherwise.
- Do not expand a task into unrelated improvements. Do not replace working functionality only to tidy the code.
- Do not delete parked design files (`Mockups.tsx`, `WingArt.tsx`, `StatChart.tsx`, `LeaderboardClimb.tsx`, `GamePicker.tsx`) until the project is finalized and dependencies are checked.
