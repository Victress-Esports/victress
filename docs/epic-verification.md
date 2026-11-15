# Epic Games verification for Rocket League (behind a flag)

Branch `claude/wizardly-ride-bafh0x`, stacked on `claude/eager-carson-2b79tb`. **Off by default. Not deployed. Migration `20261115000100` tested locally only (not applied to staging or production).**

## What it does
A pilot player on victress.gg, Rocket League page, can choose **Verify with Epic Games**. They sign in at Epic, and Victress stores the **Epic Account ID** that Epic returns as their Rocket League identity (platform `epic`), marked verified. Replays are matched exactly as before: platform and id, exact, never by name.
- This is **not** a way to sign in to Victress. It proves control of an Epic account and nothing about ability.
- Only the account id is kept. Access and refresh tokens are never stored or logged. Nothing from the Epic profile is read.
- One Epic account can be verified on one Victress account (database unique index). Typed IDs are unchanged.
- An identity that already has saved games is never swapped for another account.
- **Steam works without Epic.** With the flag off, nothing Epic is shown, both routes return 404, and no code reads the new columns. Typed Steam, PlayStation, Xbox, Switch and Epic IDs work exactly as before.

## Flow (from Epic's docs, read 2026-11-15)
Sources: dev.epicgames.com "Web API reference: Authentication" and "Epic Account Services: Getting Started, Authenticate on a Web Site"; discovery document `https://api.epicgames.dev/epic/oauth/v2/.well-known/openid-configuration`.
1. `GET /dashboard/link/epic/start` (signed in, consent gate, pilot allowlist, both flags). Sets a 10 minute `v_epic_state` cookie (HttpOnly, Secure, SameSite Lax, path `/dashboard/link/epic`) holding a random state bound to the player's Victress id. Redirects to `https://www.epicgames.com/id/authorize?client_id&redirect_uri&response_type=code&scope=basic_profile&state`.
2. `GET /dashboard/link/epic/callback?code&state`. The state must match the cookie for this same player.
3. Server to server `POST https://api.epicgames.dev/epic/oauth/v2/token`, client id and secret in a Basic Authorization header, body `grant_type=authorization_code`, `code`, `redirect_uri` (and `deployment_id` if set). Epic documents `account_id` in the response as "The Epic Games account ID for the user that the token was generated for."
4. `POST https://api.epicgames.dev/epic/oauth/v2/tokenInfo` with the access token: must be `active`, for this client, and name the same `account_id`.
5. Save, then count how many public Ballchasing replays carry exactly `epic:<account id>` (Ballchasing `player-id` filter, up to 10). The page shows that count so the player can see the match.

Scope: `basic_profile` only. Epic says Basic Profile is always required and cannot be turned off.

## Does Ballchasing's Epic ID equal Epic's sign in account ID?
- **Format: yes.** Epic's documented `account_id` example is 32 lower case hex characters. In 600 real replays and a fresh sample of 5 public ranked replays (12 Epic slots), every Ballchasing `epic` id is 32 lower case hex.
- **Equality for a real account: not yet shown.** It needs one real sign in. The connected Ballchasing token belongs to an account (`victressesports`) with no uploaded replays, so there is no known replay to compare against. The callback does the comparison automatically: after a real sign in, the page says how many public Ballchasing replays have exactly that Epic account ID. **If it says 0 for an account that you know appears in a public replay, the IDs do not match: stop and report it.** Victress then holds a verified id that matches nothing, which is harmless (no games are attached).
- The discovery document lists `pairwise` as a supported subject type. That concerns the OpenID `sub` claim. This flow does not use `sub` or an ID token. It uses `account_id` from the token and token info endpoints.

## Environment variables (server only; Vercel Preview first)
| Name | Value | Secret |
|---|---|---|
| `VICTRESS_EPIC_SIGNIN_ENABLED` | `true` to show it; anything else is off | no |
| `VICTRESS_EPIC_CLIENT_ID` | the Client ID from the Developer Portal | no |
| `VICTRESS_EPIC_CLIENT_SECRET` | the Client Secret from the Developer Portal | **yes**. Set it only in Vercel. Never commit it or paste it in chat. |
| `VICTRESS_EPIC_REDIRECT_URI` | the exact callback URL for that deployment (below) | no |
| `VICTRESS_EPIC_DEPLOYMENT_ID` | optional; only if you want sign in limited to a deployment | no |
Also needed (already exist): `SCRIM_UPLOADS_ENABLED=true`, `BALLCHASING_API_TOKEN`, the `STAGING_` Supabase trio on Preview. The redirect URI must be https (http only for `localhost` or `*.localhost`) and end in `/dashboard/link/epic/callback`, or the feature stays off.

## Redirect URLs to register on the Epic client
- Production (later, separately approved): `https://victress.gg/dashboard/link/epic/callback`
- Staging: `https://<the Preview host of this branch>/dashboard/link/epic/callback`. Copy the host from the Vercel deployment page; do not guess it. A Preview host changes per branch, so register the one you test on.
- Local (optional): `http://app.localhost:3000/dashboard/link/epic/callback` (the product site is served on `app.localhost` locally)

## Epic Developer Portal steps (you)
1. Sign in at dev.epicgames.com/portal. Create or choose the Organization, then the Product for Victress.
2. Product Settings, Clients tab: add a client. Pick a Client Policy that requires an authenticated user (GameClient is the predefined one for untrusted client software). Copy the Client ID and Client Secret straight into Vercel.
3. Same client, Edit: add the redirect URL(s) above.
4. Epic Online Services, Accounts and Social, **Epic Account Services**: accept the agreement, then create the application.
5. **Brand Settings**: company name, logo, privacy policy URL, support URL. **Permissions**: Basic Profile only (Online Presence, Friends and Country off). **Linked Clients**: link the client from step 2. Save each tab.
6. Brand review: until Epic approves the brand settings, only accounts inside your Epic organization can sign in. That is enough for your own staging test with your own Epic account. Submit for review only when you decide to open it to pilot players.

## Tests (local)
- `node scripts/epic-test.mjs`: 39 checks (flag, config, authorize URL, token and token info requests, every refusal path, saving rules).
- `node scripts/epic-page-test.mjs <port-epic-on> <port-epic-off>`: 17 browser checks at 390px (flag off unchanged and 404s; button and wording; start redirect, state cookie attributes, no secret in URL, no caching; forged state refused; non pilot and signed out refused).
- SQL `supabase/tests/rl_verified_identity.sql`: 18 checks.

## Still needs your approval
- Privacy Policy: Epic wording added on 2026-11-15 (`content/legal.ts`, privacy version `2026-11-15`, which asks signed in players to accept again). Legal text stays pending legal review.
- Applying `20261115000100` to staging, then setting the Preview variables.
