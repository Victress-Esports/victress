# SEO notes

## What is served

| | victressesports.com | victress.gg |
|---|---|---|
| `/robots.txt` | Allow all, disallow `/api/` (except `/api/og`), points at its own sitemap | Same, plus private routes disallowed (below), points at its own sitemap |
| `/sitemap.xml` | The 6 public pages | Home, open leaderboards, and profiles **that opted in to search**, each with a real `lastmod`. Becomes a sitemap index once profiles exceed one file |

- `www.` redirects to the bare host with a 308 on both domains (`next.config.ts`), so each domain has exactly one canonical host.
- Preview and staging hosts (`*.vercel.app`) send `X-Robots-Tag: noindex` and a disallow-all `robots.txt`.

## Private routes

Never indexed: `/dashboard`, `/onboarding`, `/login`, `/join/*`, `/auth/*`, `/api/*` (except the social cards).
Each is covered three ways: a `robots.txt` Disallow, a `noindex` meta tag on the page, and an `X-Robots-Tag: noindex` header from `next.config.ts`.

The Disallow rules use `$` and `/` on purpose (`/dashboard$`, `/dashboard/`). A plain `Disallow: /dashboard` is a prefix match and would also hide real player profiles such as `/dashboard_fan`.

## Sitemap details

- Marketing pages: listed in `lib/sitemap.ts` (`MARKETING_PATHS`). Add new public pages there.
- Profiles: `public.sitemap_profiles()`. Only profiles with `search_indexable = true` are listed (see "Profile search visibility" below), never demo players or signup placeholders. `lastmod` is `profiles.updated_at`, which moves when the profile, its games or its stats change, or when the toggle changes.
- Leaderboards: only listed once a board is open (10+ real players). Closed boards are `noindex` too.
- Size: `SITEMAP_PAGE_SIZE` (default 5000 profiles per file). Above that, `/sitemap.xml` becomes an index pointing at `/sitemap/static.xml` and `/sitemap/profiles-1.xml`, `-2.xml`, and so on. The protocol limit is 50,000 URLs per file.
- Cached for an hour at the edge. If the database is unreachable the route returns 503 rather than a sitemap that silently lacks profiles.

## Homepage FAQ, product schema and llms.txt

- The homepage has its own FAQ (7 questions about the platform; the pricing page keeps its purchase-focused FAQ). Both are marked up as `FAQPage` from the same visible text, and the audit fails if a question is duplicated between the two pages.
- `WebApplication` JSON-LD describes the product at victress.gg: the free plan only, live features only. Do not add ratings, review counts or user numbers unless they exist.
- `/llms.txt` is served on the marketing domain only. It separates what works today from what is coming soon. Update it when features ship.
- Full audit, including AI-crawler options and the age/COPPA findings: `docs/compliance-audit.md`.

## Titles and descriptions

All copy lives in `content/seo.ts`. Titles are under 60 characters and descriptions under 160. `npm run seo:audit` checks lengths, uniqueness, canonical, Open Graph, Twitter, robots, JSON-LD, status codes, redirects, and that robots.txt and the sitemap agree.

To run the audit locally without touching a database:

```bash
node scripts/mock-supabase.mjs 4010 &
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4010 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock SUPABASE_SERVICE_ROLE_KEY=mock-service
export DIRECTORY_ENABLED=true SHARING_ENABLED=true   # public profiles are off by default; the audit checks them, so turn them on here
npm run build && npx next start -p 3200 &
npm run seo:audit -- 3200
```

The mock models the privacy rules: the anon key can read nothing, and public data comes only through service key functions.
Privacy checks (private profiles, handle check, sharing link headers) run with `node scripts/privacy-test.mjs <port with flags on> <port with flags off>`.

## Structured data (JSON-LD)

- Marketing home: `Organization` and `WebSite`.
- Pricing: `FAQPage` (the same text visible on the page) and `BreadcrumbList`. Other marketing pages and leaderboards: `BreadcrumbList`.
- Public profiles: `ProfilePage` with a `Person`, **only for profiles that opted in to search**. Only fields shown on the profile are included: name, handle, photo, bio, team and games. Stats, rank and role are not marked up.

The audit checks that the JSON parses and has the right types. It does not replace Google's Rich Results Test (below).

## Search Console and Bing

### Google Search Console (one Domain property per domain)

Repeat for `victressesports.com` and for `victress.gg`.

1. Open https://search.google.com/search-console and choose **Add property**.
2. Pick **Domain** (the left box), type the bare domain (`victressesports.com`, no `https://`, no `www`), and click **Continue**.
3. Google shows a `TXT` record that starts with `google-site-verification=`. Copy it.
4. At your DNS host for that domain, add a record: Type `TXT`, Host/Name `@` (some hosts want it blank), Value the copied string, TTL default. Keep your existing TXT records (for example the Resend SPF record).
5. Back in Search Console click **Verify**. DNS can take a few minutes to a few hours; if it fails, wait and click again.
6. Left menu → **Sitemaps** → enter `sitemap.xml` → **Submit**. Status should read **Success**. The victress.gg sitemap lists its child files once there are many profiles.
7. Left menu → **URL inspection** → paste `https://victressesports.com/` → **Request indexing**. Do the same for one profile page after the first players join.

A Domain property covers `http`, `https`, `www` and the bare host, so you do not need separate properties for each.

### Bing Webmaster Tools

1. Open https://www.bing.com/webmasters and sign in.
2. Fastest: **Import** your sites from Google Search Console. Bing verifies them through the Google connection, so no extra DNS step is needed.
3. Manual option: **Add a site** → enter `https://victressesports.com` → choose **DNS verification**. Note that, as far as I know, Bing's DNS method is a **CNAME** record, not a TXT: Bing shows a Host (a long random string) and points it at `verify.bing.com`. Add exactly what Bing displays, then click **Verify**. Check the on-screen instructions, since Bing can change this.
4. After verification: **Sitemaps** → **Submit sitemap** → `https://victressesports.com/sitemap.xml`. Repeat for `https://victress.gg/sitemap.xml`.

### Checks worth running once the domains are live

- Google Rich Results Test (https://search.google.com/test/rich-results): paste the home, pricing and a profile URL.
- Social previews: Facebook Sharing Debugger, LinkedIn Post Inspector, and paste a link into Discord to see the card.
- Search Console → Settings → **robots.txt** report on both properties.
- Lighthouse in Chrome DevTools on the live URLs (mobile).

## Profile search visibility (opt-in)

Public profiles are **not indexed by default**. Players turn on **Show my profile in search engines** in the profile editor (Dashboard → Profile → Search engines). The setting is `profiles.search_indexable`, default `false`.

| | Toggle off (default) | Toggle on |
|---|---|---|
| Viewable by direct link | Yes | Yes |
| Meta robots | `noindex, nofollow` | indexable |
| Canonical link | none | `https://victress.gg/{handle}` |
| JSON-LD (`ProfilePage`) | none | yes |
| Open Graph and Twitter card | yes (links still share well) | yes |
| In the sitemap | no | yes, with `lastmod` |

- Demo players are never indexable, whatever the setting.
- The save action refreshes the profile page right away, so a change takes effect immediately rather than after the one-minute page cache.
- Search engines drop an already-listed page the next time they re-crawl it. To speed that up, use Search Console's URL inspection → Request indexing, or the Removals tool.
- The sitemap is cached for up to an hour at the edge, so an opted-out profile can linger in the sitemap for that long. That is harmless: the page itself is `noindex`.
- Tested in `supabase/tests/seo.sql` (database) and by driving the real toggle in a browser (default off, on, off, and what a visitor and the sitemap see after each flip).

## Minimum age

The sign-in screen (which is also the signup screen) says "You must be 13 or older to use Victress" and links to the Terms and Privacy Policy. The terms draft starts with the same requirement. This is a notice only: there is no age gate or verification. Have counsel confirm the wording, and whether a checkbox is wanted, before launch.

## Signed in pages in a real browser (local stand-in)

`scripts/mock-auth.mjs` simulates sign in on the mock Supabase server. It is test tooling that lives outside the app: no mock auth code is in `app/`, `lib/` or `components/`, so it cannot be in a production bundle, and it only runs with `MOCK_AUTH=1` on 127.0.0.1. Personas: Rookie player, Team member, Recruiter or scout (still the Rookie plan, because no entitlement source exists), and a new user who is not onboarded.

```bash
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4010 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock SUPABASE_SERVICE_ROLE_KEY=mock-service
npm run build        # NEXT_PUBLIC values are baked in at build time: do not deploy this build
MOCK_AUTH=1 MOCK_APP_ORIGIN=http://app.localhost:3301 node scripts/mock-supabase.mjs 4010 &
npx next start -p 3301 &
SCRIM_UPLOADS_ENABLED=true npx next start -p 3302 &
node scripts/signed-in-test.mjs 3301 3302 4010
```

To click around by hand, open `http://app.localhost:4010/dev/auth` and pick a persona. Rebuild without these variables before any real deploy.
