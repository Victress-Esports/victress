# Victress

Esports player development and recruitment platform.

One Next.js (App Router, TypeScript, Tailwind v4) project that serves two domains:

| Domain | Serves | Internal route |
|---|---|---|
| `victressesports.com` | Marketing site | `app/m/*` |
| `victress.gg` | Product (login, onboarding, dashboard, `/{handle}`) | `app/a/*` |

`middleware.ts` picks the folder from the hostname and rewrites to it. Requesting `/m/*` or `/a/*` directly on either domain returns 404.

> Status: **M3** (six games, profile editor, manual stats, per-game leaderboards, teams, preview-host support). Stripe checkout and final SEO polish arrive in M4.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

Local dev, both domains on one port:

- Marketing: http://marketing.localhost:3000
- Product: http://app.localhost:3000

Scripts: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run seo:audit`, `npm run assets` (rebuilds the wing images and the icons).

## Environment variables

Never commit `.env.local`. The service role key is server only and must never be `NEXT_PUBLIC_`.

Vercel does not accept `NEXT_PUBLIC_` names, nor the same name in two environments, so the Supabase variables are split by environment. **Production** (`VERCEL_ENV=production`) reads `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (the production project). **Preview** (`VERCEL_ENV=preview`) reads `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY` and `STAGING_SUPABASE_SERVICE_ROLE_KEY` (the staging project) and **never falls back to the production values**; the build fails with a clear message if they are missing, or if a Preview points at the production project. `next.config.ts` maps only the URL and the anon key (public by design) to the names the code reads; the service role key is read at runtime on the server only and is never mapped. Locally, set the `STAGING_` trio to run against staging, or `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the mock scripts. `npm run test:env` checks all of this, including that no service role value appears in any built file. The rules live in `lib/supabase/resolve-env.ts`.

| Name | Where to get it |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` (Production) and `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY` (Preview) | Supabase > Project Settings > API of the matching project. Public by design |
| `SUPABASE_SERVICE_ROLE_KEY` (Production) and `STAGING_SUPABASE_SERVICE_ROLE_KEY` (Preview) | Same page. Server only. |
| `RESEND_API_KEY` | resend.com > API Keys. Verify `victressesports.com` as a sending domain. |
| `RESEND_FROM_EMAIL` | `hello@victressesports.com` |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe dashboard, test mode only (used from M4) |
| `NEXT_PUBLIC_BILLING_ENABLED` | Keep `false`. Paid CTAs go to the waitlist. |
| `NEXT_PUBLIC_LAUNCH_GAME` | `VALORANT` (or any game id). Default game and homepage focus only. |
| `LEADERBOARD_INCLUDE_DEMO` | `false`. Set `true` only on dev/preview so labeled demo players appear on boards. |
| `STRIPE_PRICE_*` | Recorded in `docs/stripe.md`. Used at M4. |
| `NEXT_PUBLIC_MARKETING_URL`, `NEXT_PUBLIC_APP_URL` | Production URLs. In local dev use the `*.localhost:3000` addresses. |

## Where things live

- `content/copy.ts`: all marketing copy. `content/pricing.ts`: plans and prices. `content/games.ts`: roles and ranks per game.
- `content/games.ts`: one config per game (roles, ranks, stat categories). Sources and open questions: `docs/games.md`.
- `supabase/seed/demo.sql` and `delete-demo.sql`: demo players for dev/preview databases only (see below).
- `lib/handles.ts`: handle rules, reserved and blocked names. Same rules run in the claim input, the API and (from M2) the database.
- `supabase/migrations`: SQL migrations (waitlist and core schema are applied to the project). `supabase/tests/rls.sql`: RLS test that rolls itself back. `types/database.ts`: generated types, regenerate after every migration.

## Auth setup (Supabase)

Sign-in happens only on `victress.gg`, so the marketing domain needs no auth settings. Google and Discord never redirect to our domains directly: Supabase brokers the login, so **both providers use the same single redirect URL**:

```
https://pmamceqshyfptvjgimsf.supabase.co/auth/v1/callback
```

1. **Supabase > Authentication > URL Configuration**
   - Site URL: `https://victress.gg`
   - Redirect URLs (add both): `https://victress.gg/auth/callback` and `http://app.localhost:3000/auth/callback`
2. **Google**: Google Cloud Console > APIs & Services > OAuth consent screen (External; scopes `openid`, `email`, `profile`), then Credentials > Create credentials > OAuth client ID > Web application. Under *Authorized redirect URIs* add the Supabase URL above. Copy the Client ID and Client Secret into Supabase > Authentication > Providers > Google, and enable it.
3. **Discord**: Discord Developer Portal > New Application > OAuth2. Under *Redirects* add the Supabase URL above. Copy the Client ID and Client Secret (Reset Secret) into Supabase > Authentication > Providers > Discord, and enable it.
4. **Email magic link**: Providers > Email is on by default. Supabase's built-in mailer is heavily rate-limited, so set custom SMTP (Project Settings > Authentication > SMTP): host `smtp.resend.com`, port `465`, username `resend`, password = your Resend API key, sender `hello@victressesports.com` (the domain must be verified in Resend).

## SEO

Titles and descriptions live in `content/seo.ts`; sitemaps and robots are served per domain; structured data is on the home, pricing, leaderboard and (opted-in) profile pages. Player profiles are **not indexed by default**: players opt in with a toggle in the profile editor. Details, the audit script and the Search Console and Bing steps are in `docs/seo.md`. Run `npm run seo:audit` (see that file) after changing any page.

## Leaderboards and demo data

- Each game has its own board at `/leaderboard/{game}`. A board opens only when **10 real (non-demo) players** have entered stats for that game. Until then it shows an encouraging empty state with the count so far.
- `supabase/seed/demo.sql` creates 25 clearly fake players (`is_demo = true`, labeled "Demo"). It refuses to run unless you first run `set app.allow_demo_seed = 'yes';`.
- **Never run it against production.** Use a separate staging Supabase project. Remove demo data with `supabase/seed/delete-demo.sql` (one query).
- Demo players only appear on boards where `LEADERBOARD_INCLUDE_DEMO=true`, which should be set for Preview and Development only.

## Testing on a Vercel preview

A preview deployment has one hostname, so both sites live on it. Links between them go through `/__site/app` and `/__site/marketing`, which set a `v_site` cookie that tells the middleware which site to serve (marketing is the default). Production hosts ignore this and cannot use it. Previews send `X-Robots-Tag: noindex` and a disallow-all `robots.txt`.

1. In Vercel, keep **Automatically expose System Environment Variables** on (it is on by default). The app reads `NEXT_PUBLIC_VERCEL_ENV` and `NEXT_PUBLIC_VERCEL_URL` to build links on a preview.
2. In Vercel > Settings > Environment Variables, scope these to **Preview** (not Production): the Supabase URL and keys of a **staging** project, `LEADERBOARD_INCLUDE_DEMO=true`, and your Resend key.
3. In the staging Supabase project > Authentication > URL Configuration > Redirect URLs, add `https://*-<your-vercel-team-slug>.vercel.app/auth/callback`. Google and Discord need no change: they use the Supabase callback URL.
4. Open the preview URL. The marketing site shows first. Tap any CTA (Claim it, Start your team) and you land on the product site. To jump back, use the logo on a product page, or open `<preview-url>/__site/marketing?to=/`.
5. Seed the staging database with `supabase/seed/demo.sql` to see boards open.

## Deploy

One Vercel project. Add both `victressesports.com` and `victress.gg` as domains on it, set the env vars above, and deploy. More detail (including Supabase OAuth redirect URLs for both domains) lands with M4.
