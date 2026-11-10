# Victress project principles

## Authoritative strategy
**Read [docs/strategy/victress-business-purpose.md](docs/strategy/victress-business-purpose.md) first.** It is the authoritative strategic reference for why Victress exists, how it creates shared value and where it is going. **It is version 2, saved 2026-11-07**; version 1 is kept only for history in `docs/strategy/superseded/` and must not be followed where it conflicts. It supersedes any conflicting historical instruction, including earlier instructions that described Women in Esports as a secondary initiative, a separate social impact activity, or the whole of the company's purpose. Do not shorten, reinterpret or compete with it. If a request or older note conflicts with it, follow the strategy document and say so.

Victress is building connected infrastructure for esports player development, performance intelligence and talent discovery, for the broader esports ecosystem (not one demographic, game or level). Practice → Performance Evidence → Development → Recognition → Opportunity.

## 1. One company, one platform, Creating Shared Value
- Victress is a technology business. **Creating Shared Value is the business strategy**, not a marketing overlay, a charity program or a separate corporate responsibility activity. Social value and business value come from the same products, infrastructure and relationships.
- Three product pillars work together, and there are only three:
  1. **Scrim Intelligence:** turn private competitive practice into meaningful performance information.
  2. **Player Resume:** a credible way to represent competitive identity, experience, achievements and development.
  3. **Scout Desk:** structured discovery and evaluation connecting talent with teams, coaches, collegiate programs and recruiters.
- Creating Shared Value (Porter and Kramer) has three mechanisms, all applied: **reconceiving products and markets** (the three products), **redefining productivity in the value chain** (data integrity and transparency, contextual evaluation, privacy and consent, accessibility, responsible platform development), and **enabling local cluster development** (community engagement, grassroots and collegiate partnerships, industry collaboration). They are connected ways of building the business, not charitable programs. Sponsorships, donations, awareness campaigns and partnerships alone are not CSV.
- **Women in Esports is an intentional shared-value commitment**: an application of the CSV strategy, **not a limitation on Victress's customer base or commercial purpose**. The platform serves all esports players and organizations. The commitment is to use the same products and ecosystem relationships to help address barriers women competitors often face (access to development resources, demonstrating abilities, recognition, progression), and to **listen to women players, grassroots communities and collegiate programs first** rather than assume the barriers. It is not a fourth product, a separate commercial platform, a separate women's platform or a replacement for the core business. The initiative is called "Women in Esports", with nothing in front of the name. Do not invent any other initiative name (not Victress Elevate, not Vistrielle).
- Reflect the purpose in business messaging, especially the About page, without turning every page into promotional messaging.
- Victress will not promise programs, access or services it cannot reliably deliver. Access initiatives are developed from feasibility, community need and available resources.
- Never claim partnerships, programs, funding, mentorship, scholarships, coaching, placements, recruitment outcomes, player spotlights or functionality that do not exist. Anything unbuilt is labeled Coming soon or Planned.

## 2. Automated data is fundamental; provenance is mandatory
- Automated game data is the core offering. Manual stats are a fallback, never the main experience.
- Every stat records its source. Keep these three distinct everywhere:
  - `self_reported`: entered by the player. Shown with the label **"Self-reported"** (this label is a data provenance distinction and stays as written).
  - `api`: obtained through an actual game API.
  - `demo_parsed`: extracted from an uploaded demo or replay.
- Never present self reported data as verified. **Verification establishes the provenance and integrity of evidence. It never establishes a player's overall ability, potential or suitability for a team.** Present performance in context (role, team, circumstances) and never as a simple judgment of quality.
- Never claim a game integration works until it is implemented and tested. Account linking does not by itself provide private scrim data.
- Keep all six games in the architecture: VALORANT, CS2, Rocket League, League of Legends, Apex Legends, Overwatch 2. **No first integration is approved.** Real demo availability, parser reliability, technical feasibility and pilot demand decide it, and CS2 is only one candidate. Real CS2 demos will be supplied when validation begins. Do not claim parsing feasibility has been proven. Present research and architecture for approval before any major integration.

## 3. A focused product, not an oversized portal
Make private scrim collection and analysis genuinely work, use it to strengthen Player Resumes, build Scout Desk on credible performance evidence, then expand into advanced tactical analysis and wider recruitment. Do not build disconnected features that do not strengthen this progression. Progress follows operational readiness, technical reliability and measured results, not arbitrary deadlines.

## 4. Two sites, two jobs
| Site | Job |
|---|---|
| victressesports.com (`app/m`) | Company, marketing, product explanation, pricing, partnerships |
| victress.gg (`app/a`) | The application and player experience |

Keep routing, authentication, canonicals and responsibilities separate. Do not assume cookies are shared across domains. The marketing site shows real product experiences. Sample or simulated visuals are always labeled Sample.

## 5. Protect the business and its users
- Privacy, consent and player control are foundational. Separate account identity, public player identity, competitive records and private contact details. Contact details and private identity are never disclosed without consent. Search indexing being opt-in does not make publicly readable data private.
- Preserve Supabase Row Level Security. Use additive migrations, tested in a rolled back transaction first.
- Safety matters: players, including women competitors, may face additional safety, privacy or representation concerns. Reporting, blocking and moderation are part of the product, not an afterthought.
- Make no unsupported privacy, security, age (COPPA) or compliance claims. Legal text stays labeled as pending legal review.
- Never launch billing, change production data or change production database behavior without explicit approval. Keep `NEXT_PUBLIC_BILLING_ENABLED=false`. Do not change pricing or plan definitions without approval.
- Never commit secrets. The service role key stays server side.

## 6. Brand
- No tagline. "Turn practice into progress." is retired (founder decision, 2026-11-08): do not use it anywhere. Do not add slogans.
- Preserve the original Victress wings emblem. Never redraw it or replace it with a generic V.
- Palette: Crimson #CF142B, Signal Red #F34144, Coral #FF635F, Warm Coral #FF847B, Blush #FFA498, Carbon #171717, White #FFFFFF, Cool Gray #5B6068.
- Premium, restrained, product led. Concise copy, real application previews. No generic gaming visuals, excessive animation, glow or gradients.
- Do not use the phrase "source of truth" in Victress materials. Say "authoritative reference" or "primary strategy document".
- Avoid hyphens and em dashes in Victress marketing copy. Exceptions: game names (Counter-Strike) and the data provenance label "Self-reported".
- Approved pricing and plan descriptions stay verbatim (`content/pricing.ts`, `docs/stripe.md`).

## 7. Workflow
- Inspect the actual repository and deployment state before changing anything.
- Work in scoped branches and pull requests. Run typecheck, lint, build and the SEO audit (`npm run seo:audit`). Report exactly what changed.
- Never merge or deploy without approval. PR #2 and #3 stay unmerged until told otherwise. One milestone per pull request, on its own branch.
- **Privacy first:** no pilot data (uploads, resumes, contact details) is collected until the privacy foundation (consent controls, closed anonymous reads, share tokens) is built, tested and approved for production. Migrations are tested on a throwaway local Postgres (`supabase/tests/local/run.sh`) before any production step, and each production step needs its own explicit authorization (`docs/proposals/decision-register.md`).
- Design proposals live in `docs/proposals/`. Do not implement a proposed database, authentication, permission, billing or privacy change until it is approved.
- Do not expand a task into unrelated improvements. Do not replace working functionality only to tidy the code.
- Do not delete parked design files (`Mockups.tsx`, `WingArt.tsx`, `StatChart.tsx`, `LeaderboardClimb.tsx`, `GamePicker.tsx`) until the project is finalized and dependencies are checked.

## 8. Business and product decision authority

Full text also in [docs/partner/decision-authority.md](docs/partner/decision-authority.md). Partner documents (approved brief and the Partner Experience specification) are in [docs/partner/](docs/partner/).

The founder's approved business strategy, pricing, partner benefits, product direction and documented requirements are authoritative. Claude Code implements the approved direction. It does not redefine it.

1. Do not remove, change, reinterpret or omit approved business offerings, pricing, features or partner benefits because they are not yet implemented.
2. Do not substitute your own business recommendations for decisions already made by the founder.
3. Do not treat current technical limitations as reasons to reduce the intended product scope.
4. If a requirement is technically difficult, explain the challenge and propose an implementation that preserves the intended business outcome.
5. If a requirement is ambiguous or two documents conflict, name the conflict and ask the founder before making a business decision.
6. Do not silently change approved specifications, pricing, entitlements or commercial terms.
7. Distinguish between features that are implemented, in development, and planned. Keep a status for each; never delete the feature from product or pricing documentation because it is not in the current code.
8. Keep approved strategy, product specifications, pricing, Stripe configuration and the implementation consistent with each other.
9. When updating a document or implementation, preserve all previously approved requirements unless the founder explicitly changes them.

Claude Code must follow the approved specifications, implement the agreed features and benefits, report missing functionality and technical dependencies, flag conflicts between code and specifications, and ask for approval before changing a business requirement.
