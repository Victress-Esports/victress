# Victress

Esports player-performance platform. **Perform. Compete. Rise.**

One Next.js (App Router, TypeScript, Tailwind v4) project that serves two domains:

| Domain | Serves | Internal route |
|---|---|---|
| `victressesports.com` | Marketing site | `app/m/*` |
| `victress.gg` | Product (login, onboarding, dashboard, `/{handle}`) | `app/a/*` |

`middleware.ts` picks the folder from the hostname and rewrites to it. Requesting `/m/*` or `/a/*` directly on either domain returns 404.

> Status: **M1** (marketing site, waitlist, Resend). Auth, profiles, dashboard and Stripe arrive in M2 to M4.

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
- `supabase/migrations`: SQL migrations. Not applied to the remote project until M2.

## Deploy

One Vercel project. Add both `victressesports.com` and `victress.gg` as domains on it, set the env vars above, and deploy. More detail (including Supabase OAuth redirect URLs for both domains) lands with M4.
