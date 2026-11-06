# AI discoverability and privacy/age audit

Audited from the code on branch `claude/design-pass` (stacked on `claude/seo-pass`, PR #2) and the live Supabase project schema, Nov 2026.
Nothing here is legal advice. Items marked **DECISION** need your approval before anything changes.

---

## A. AI search discoverability

### What exists (verified in rendered HTML, not assumed)

| Area | State |
|---|---|
| Crawlable content | All page text, the six game names, the FAQ and the sample demos are in the server-rendered HTML. Interactive pieces hydrate afterwards but their content is already present. |
| robots.txt / sitemap.xml | Per domain, each pointing at its own sitemap. No bot-specific rules (all crawlers, including AI crawlers, are allowed on public paths). |
| Titles, descriptions, canonical, Open Graph, Twitter | Unique per page, correct domain per site, per-card social images with matching alt text. |
| JSON-LD | Marketing home: `Organization`, `WebSite`, `WebApplication` (the product at victress.gg, free plan only, live features only), `FAQPage` (home questions). Pricing: `FAQPage` + `BreadcrumbList`. Inner pages: `BreadcrumbList`. Profiles: `ProfilePage`/`Person`, only for opted-in profiles. |
| Hierarchy and links | One `<h1>` per page, nav to Pricing / For teams / About, footer to Privacy / Terms, breadcrumbs on inner pages. |

### Issues found

1. **Thin text on the homepage (by design).** "Show, don't tell" means few words for a machine to read. Mitigated with the homepage FAQ, the `WebApplication` schema and `llms.txt`. Recruiting was only explained by one plan blurb; the FAQ now covers it (marked as coming soon).
2. **No product-level schema.** Added `WebApplication` (one entity; no ratings, reviews or counts, none of which exist).
3. **`noindex` does not stop AI crawlers that ignore it.** A hidden player profile is still fetchable by any bot that does not honor `noindex`, and robots.txt cannot hide root-level handle URLs without blocking opted-in profiles too. **DECISION:** accept this, or choose a mitigation (below).
4. **FAQ rich results.** Google shows FAQ rich results mainly for authoritative government and health sites, so the markup is for machine understanding, not a visible search feature.
5. **Sample progress chart was implying an unbuilt feature.** The product keeps a stats history list but has no charts yet. The chart and hero sparkline are now labeled "Coming soon" as well as "Sample".

### Changed (noncontroversial)

- Homepage FAQ (7 questions, no overlap with the pricing FAQ), shared `FaqList` component, `FAQPage` markup from the same text.
- `WebApplication` JSON-LD.
- `/llms.txt` on the marketing domain only (see below).
- Audit script checks all of the above.

### `llms.txt`: is it useful?

`llms.txt` is an informal convention (llmstxt.org), not a ratified standard. I am not aware of confirmed support from the major AI providers, so treat the benefit as unproven. It is cheap, harmless, and gives a single place that separates what works today from what is coming soon, which also protects against AI systems repeating planned features as live. It is served at `victressesports.com/llms.txt` only. Remove `app/llms.txt/route.ts` if you would rather not publish it.

### Not verified (needs live access)

Search Console and Bing indexing status, whether any AI crawler has fetched the site, Google's Rich Results Test, Vercel production deployment.

### Options for item 3 (DECISION)

- (a) Accept. Rely on `noindex` and the default of not listing hidden profiles anywhere.
- (b) Add a non-standard `X-Robots-Tag: noai, noimageai` on hidden profiles. Only some crawlers honor it.
- (c) Disallow named AI crawlers (for example GPTBot, ClaudeBot, Google-Extended, CCBot) in robots.txt on victress.gg. This also keeps them from opted-in profiles.
- (d) Require sign-in to view profiles. This breaks "shareable by link" and is not recommended.

---

## B. Age restriction and COPPA

**Short answer: the 13+ line is a notice only. Nothing enforces it, and nothing here establishes COPPA compliance.**

### What is implemented

| Question | Answer | Where |
|---|---|---|
| Is the 13+ notice displayed? | Yes, on the sign-in screen (which is also signup), under the sign-in options, linking to Terms and Privacy Policy. | `app/a/login/page.tsx` (paragraph under `<LoginForm>`), text in `content/copy.ts` (`auth.ageNotice`) |
| Is it in the terms? | Yes, first line of the draft. | `content/copy.ts` (`legal.terms.body[0]`), page `app/m/terms/page.tsx` |
| Can a user enter a birth date? | No. No date-of-birth or age field exists in the UI, the code, or the database. | `profiles` columns: id, handle, display_name, avatar_url, game, role, rank, team_id, bio, created_at, is_demo, handle_changed_at, updated_at, search_indexable |
| Can an under-13 user create an account? | **Yes.** Nothing prevents it. | `components/app/LoginForm.tsx` (`signInWithOAuth`, `signInWithOtp`), `app/a/auth/callback/route.ts` (no age logic) |
| Is any age restriction enforced server-side? | **No.** No check in middleware, server actions, RLS, triggers or the auth callback. | `middleware.ts`, `app/a/auth/callback/route.ts`, `app/a/onboarding/actions.ts`, `supabase/migrations/*` |
| Is the notice shown on every path that collects data? | **No.** It is not shown on the waitlist form (any visitor can submit an email), the claim box, onboarding, or the team invite page. | `components/marketing/WaitlistButton.tsx`, `app/api/waitlist/route.ts` |

Google and Discord sign-in carry their own minimum ages through their account terms (I believe 13+, higher in some countries; verify). That is the provider's rule, not Victress enforcing anything.

### Personal information collected

- **Account:** email (magic link or provider email); provider user id.
- **Copied from Google or Discord at signup:** full name and avatar URL, via the `handle_new_user()` trigger (`supabase/migrations/20261106000200_core_schema.sql`). **These become the public display name and avatar by default**, before the player has chosen anything. See finding 1 below.
- **Profile:** handle, display name, bio, uploaded avatar (Supabase Storage), games, roles, ranks, primary game, search-visibility setting.
- **Stats:** self-reported metrics, season labels, timestamps.
- **Teams:** team name, membership, invite code.
- **Waitlist (no account needed):** email and interest, stored in `waitlist`, plus a confirmation email through Resend.
- **Cookies:** `sb-*` Supabase session cookies (essential); `v_claim` and `v_next` (30 minutes, sign-in helper); `v_site` (preview deployments only). No advertising cookies in code. Vercel Analytics renders only on Vercel and, per Vercel's documentation, is cookieless (verify).
- **Processors:** Supabase (database, auth, storage, auth logs that typically include IP and user agent), Resend (email), Vercel (hosting and logs). In-memory IP rate limiting is not stored.

### Do the policies match reality?

The privacy and terms pages are labeled drafts. Compared with what the product does:

- "We collect your email and the profile details you choose to share" is **incomplete**: it omits the name and avatar copied from the sign-in provider, waitlist emails, usage and server logs, and the processors above.
- "We use only privacy-friendly analytics" is **unverified**: analytics only run if enabled on Vercel.
- "Write to hello@victressesports.com to see or delete your data" matches reality only as a **manual** process. There is no self-serve account deletion or data export in the product, and no stated retention period.
- Terms state the 13+ requirement but do not say how it is checked (it is not).

### Is parental consent needed? (legal review)

COPPA generally applies to services directed to children under 13, or that have actual knowledge they are collecting personal information from them. Victress is not designed for under-13s (collegiate and amateur players), and it sets a 13+ rule. But:

- The pricing strategy mentions high school rosters, so users aged 13 to 17 are expected. Teen-privacy rules (varying by state and country), and school contracts (for example student-data obligations) may apply.
- "Actual knowledge" can arise, for example from a bio that says "I'm 12". That would create deletion and consent obligations.
- Several jurisdictions set a digital-consent age above 13 (for example parts of the EU).
- A notice, with no gate, offers little protection.

**Counsel should decide** whether 13+ with a notice is acceptable, what the age-gate and consent design should be, and the policy text.

### Missing

Age confirmation or gate; any process for handling a discovered under-13 account; privacy-notice completeness; self-serve deletion and export; retention policy; a notice on the waitlist; a safe default for public display of provider-supplied name and avatar.

### Recommended changes (all need your approval; none are made)

| # | Change | Why | Files that would change |
|---|---|---|---|
| 1 | Stop copying the provider's real name and avatar into the public profile at signup (start blank, or ask during onboarding). | Public by default is a privacy risk for every user, and worse for minors. | new migration replacing `handle_new_user()`; `app/a/onboarding/*`; `components/app/ProfileCard.tsx` fallback |
| 2 | Add a neutral age confirmation ("I am 13 or older") before the sign-in buttons work. Store at most a timestamp, **not** a birth date. | Moves from notice to an affirmative statement. Still self-attested; no verification. | `app/a/login/page.tsx`, `components/app/LoginForm.tsx`, `content/copy.ts`; optional migration for an `age_confirmed_at` column |
| 3 | Add the 13+ line to the waitlist form. | The waitlist collects email from anyone. | `components/marketing/WaitlistButton.tsx`, `content/copy.ts` |
| 4 | Self-serve "Delete my account" and a documented process for under-13 reports. | Matches the privacy text and reduces risk. | new server action under `app/a/dashboard/`, `app/a/dashboard/profile/page.tsx` |
| 5 | Have counsel write the privacy policy and terms from a data inventory (this document is a starting point). | Current text is incomplete. | `content/copy.ts` (`legal`), `app/m/privacy/page.tsx`, `app/m/terms/page.tsx` |
| 6 | Do **not** collect birth dates or ID verification unless counsel requires it. | Invasive and creates more sensitive data to protect. | n/a |

### Decisions needed

1. Approve change 1 (no real name or avatar copied to the public profile by default)?
2. Approve a neutral age confirmation (change 2), and is notice-only acceptable until counsel responds?
3. Who engages counsel, and is the high school segment in scope for launch?
4. Is the AI-crawler policy in section A, item 3 acceptable, or which option?

---

## C. Other findings from this pass

- **`rls_auto_enable()`** is a Supabase-provisioned helper. Findings are in the PR description and the final report.
- **Obsolete-candidate files** (kept, not deleted): `components/marketing/Mockups.tsx` (old static mockups, unused by the new homepage), `components/brand/WingArt.tsx` and the `public/brand/wings*.webp` files (the emblem art is no longer a hero visual). Safe to remove only after you confirm you do not want them elsewhere.
