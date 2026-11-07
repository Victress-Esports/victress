# Women in Esports: places that frame it as a "core expression" or as "why Victress exists" (for the founder's decision)

**Nothing below was changed.** Proposed replacement wording for the framing, for the founder to decide: **"an intentional shared value commitment within Victress, delivered through the same three products"** (the name stays "Women in Esports", never prefixed with Victress; it is not a separate product, program or company).

## A. Exact phrase "core expression" (or equivalent)
| File and line | Text | Proposal |
|---|---|---|
| `docs/proposals/decision-register.md:206` | "...Victress Women in Esports is **a core expression of why Victress exists, delivered through the same three pillars**..." | Rewrite as the proposed wording; also drops the "Victress Women in Esports" prefix |
| `docs/proposals/about-page-draft.md:9` | "Present **Women in Esports as a core expression of the company's purpose, realized through the same three pillars**..." | Proposed wording |
| `docs/proposals/about-page-draft.md:75` | "The strategy says it is a core expression of purpose." and "Victress Women in Esports" section name | Proposed wording; section name without the prefix |
| `docs/proposals/readiness-review.md:12` | Row C1 titled "Separate versus core expression" | Historical record of a past question; leave or annotate |
| `docs/strategy/superseded/victress-business-purpose-v1.md:177` | Heading "Women in Esports: A Core Expression of Victress's Purpose" | Superseded history; do not edit |
| `docs/strategy/victress-business-purpose.md` (v2) | No use of "core expression" found | None; the strategy document is not touched without separate approval |
| `CLAUDE.md:15` | Already reads "an intentional shared-value commitment" (no "core expression") | Possibly change the hyphen in "shared-value" to match the final wording if the founder wants; **not changed without approval** |

## B. Framing as "why Victress exists" (site, SEO and tests)
| File and line | Text | Note |
|---|---|---|
| `content/copy.ts:139` and `:425` | "Victress is called Victress for a purpose." (home section and About) | Implies the name itself comes from the commitment; the audit requires this exact sentence on `/` and `/women-in-esports` |
| `content/copy.ts:161` | Link text "Read why Victress exists" (home section) | Could read "Read about Women in Esports" |
| `content/copy.ts:409` | About page title "Why Victress exists." | The About page puts Women in Esports under this heading |
| `app/llms.txt/route.ts:10` | Section "## Why Victress exists" holding the Women in Esports bullet | The bullet already says "an intentional shared value commitment, delivered through the same three products" |
| `scripts/seo-audit.mjs` (around lines 401 to 406) | Requires "Why Victress exists" to be the first llms.txt section and to contain Women in Esports | Would change with the heading |
| `docs/seo.md:132` | Describes the same llms.txt structure | Follows the audit |
| `content/seo.ts` (Women in Esports description) | "How Victress uses its three products to address barriers women face..." | Already neutral; no change needed |

## C. If approved
One small PR: update A (docs) and B (copy, llms.txt, audit, seo doc) together so the audit and the pages agree, keep "Victress is called Victress for a purpose." only if the founder still wants it, run tsc, eslint, build and the SEO audit. CLAUDE.md and the strategy document change only on explicit approval.
