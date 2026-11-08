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
- Keep all six games in the architecture: VALORANT, CS2, Rocket League, League of Legends, Apex Legends, Overwatch 2. **First integration order (approved by the owner, 2026-11-08): Rocket League first, CS2 second, League of Legends via the Riot API.** Approval covers building and validating the integration only. **Rocket League pass bar (owner decision, 2026-11-08):** Scoreboard stats from the replay header must match ballchasing exactly wherever the header provides them; a player the header omits is listed from the frame data with scoreboard stats marked unavailable, never guessed. Frame-derived positioning stats must match ballchasing within 2% median on 100+ real ranked files across 2v2 and 3v3, and on private 2v2 and 3v3 files (private scrims are the core use case). Only stats that pass may be shown to users. Boost is not shown to users, with no placeholder or Coming soon label, until it has a validated reference. Do not claim Rocket League parsing works until the tests in `scrim-tests/` meet this bar, and do not claim any integration works before it is implemented and tested. Real CS2 demos will be supplied when validation begins. Present research and architecture for approval before any further major integration.

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
- Tagline: "Turn practice into progress." One tagline only. Do not stack other slogans.
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
