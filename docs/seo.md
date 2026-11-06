# SEO notes

## What is served

| | victressesports.com | victress.gg |
|---|---|---|
| `/robots.txt` | Allow all, disallow `/api/` (except `/api/og`), points at its own sitemap | Same, plus private routes disallowed (below), points at its own sitemap |
| `/sitemap.xml` | The 6 public pages | Home, open leaderboards, every public profile with a real `lastmod`. Becomes a sitemap index once profiles exceed one file |

- `www.` redirects to the bare host with a 308 on both domains (`next.config.ts`), so each domain has exactly one canonical host.
- Preview and staging hosts (`*.vercel.app`) send `X-Robots-Tag: noindex` and a disallow-all `robots.txt`.

## Private routes

Never indexed: `/dashboard`, `/onboarding`, `/login`, `/join/*`, `/auth/*`, `/api/*` (except the social cards).
Each is covered three ways: a `robots.txt` Disallow, a `noindex` meta tag on the page, and an `X-Robots-Tag: noindex` header from `next.config.ts`.

The Disallow rules use `$` and `/` on purpose (`/dashboard$`, `/dashboard/`). A plain `Disallow: /dashboard` is a prefix match and would also hide real player profiles such as `/dashboard_fan`.

## Sitemap details

- Marketing pages: listed in `lib/sitemap.ts` (`MARKETING_PATHS`). Add new public pages there.
- Profiles: `public.sitemap_profiles()` (real handles only; demo players and signup placeholders are excluded). `lastmod` is `profiles.updated_at`, which moves when the profile, its games or its stats change.
- Leaderboards: only listed once a board is open (10+ real players). Closed boards are `noindex` too.
- Size: `SITEMAP_PAGE_SIZE` (default 5000 profiles per file). Above that, `/sitemap.xml` becomes an index pointing at `/sitemap/static.xml` and `/sitemap/profiles-1.xml`, `-2.xml`, and so on. The protocol limit is 50,000 URLs per file.
- Cached for an hour at the edge. If the database is unreachable the route returns 503 rather than a sitemap that silently lacks profiles.

## Titles and descriptions

All copy lives in `content/seo.ts`. Titles are under 60 characters and descriptions under 160. `npm run seo:audit` checks lengths, uniqueness, canonical, Open Graph, Twitter, robots, JSON-LD, status codes, redirects, and that robots.txt and the sitemap agree.

To run the audit locally without touching a database:

```bash
node scripts/mock-supabase.mjs 4010 &
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4010 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock
npm run build && npx next start -p 3200 &
npm run seo:audit -- 3200
```

## Structured data (JSON-LD)

- Marketing home: `Organization` and `WebSite`.
- Pricing: `FAQPage` (the same text visible on the page) and `BreadcrumbList`. Other marketing pages and leaderboards: `BreadcrumbList`.
- Public profiles: `ProfilePage` with a `Person`. Only fields shown on the profile are included: name, handle, photo, bio, team and games. Stats, rank and role are not marked up. Demo profiles have none.

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

## Privacy note

Public profiles are indexable by default and appear in the product sitemap. Players may not expect their profile to show up in search. A "hide my profile from search engines" setting (which would add `noindex` and drop the URL from the sitemap) is a sensible next step, and is not built yet.
