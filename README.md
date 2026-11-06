# Victress

Esports player-performance platform. **Perform. Compete. Rise.**

One Next.js (App Router, TypeScript, Tailwind v4) project that serves two domains:

| Domain | Serves | Internal route |
|---|---|---|
| `victressesports.com` | Marketing site | `app/m/*` |
| `victress.gg` | Product (login, onboarding, dashboard, `/{handle}`) | `app/a/*` |

`middleware.ts` picks the folder from the hostname and rewrites to it. Requesting `/m/*` or `/a/*` directly on either domain returns 404.

> Status: **M2** (marketing site, waitlist, Supabase auth, claim-your-name, onboarding, public profiles). Dashboard tools, leaderboard, teams and Stripe arrive in M3 and M4.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

Local dev, both domains on one port:

- Marketing: http://marketing.localhost:3000
- Product: http://app.localhost:3000

Scripts: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run assets` (rebuilds the transparent wing images from `public/brand/wings.jpg`).

## Environment variables

Never commit `.env.local`. The service role key is server only and must never be `NEXT_PUBLIC_`.

| Name | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page. Server only. |
| `RESEND_API_KEY` | resend.com > API Keys. Verify `victressesports.com` as a sending domain. |
| `RESEND_FROM_EMAIL` | `hello@victressesports.com` |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe dashboard, test mode only (used from M4) |
| `NEXT_PUBLIC_BILLING_ENABLED` | Keep `false`. Paid CTAs go to the waitlist. |
| `NEXT_PUBLIC_LAUNCH_GAME` | `VALORANT` (or `CS2`) |
| `NEXT_PUBLIC_MARKETING_URL`, `NEXT_PUBLIC_APP_URL` | Production URLs. In local dev use the `*.localhost:3000` addresses. |

## Where things live

- `content/copy.ts`: all marketing copy. `content/pricing.ts`: plans and prices. `content/games.ts`: roles and ranks per game.
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

## Deploy

One Vercel project. Add both `victressesports.com` and `victress.gg` as domains on it, set the env vars above, and deploy. More detail (including Supabase OAuth redirect URLs for both domains) lands with M4.
