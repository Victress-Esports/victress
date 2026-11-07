# Analytics: Google Tag Manager and GA4

**Status: implemented in code and tested locally. OFF by default, and inert until a consent control exists.** Nothing has been verified inside Google Tag Manager or Google Analytics, because this environment has no access to either. Do not describe analytics as live until the manual steps in section 8 are done.
Legal and consent questions are in [privacy-compliance-review.md](privacy-compliance-review.md). No legal text was changed.

## 1. Two sites, two containers, two properties
Both sites are one Next.js app on one deployment. The container is chosen from the request host, so each site can only ever receive its own.

| | victressesports.com (marketing) | victress.gg (application) |
|---|---|---|
| GTM container | `GTM-N38XS3DR` | `GTM-PXQKSWP2` |
| GA4 measurement id | `G-GSMR43YQMP` | `G-ZBL5HGHG42` |
| GA4 web stream id | `16289690393` | `16289720897` |
| Measures | Acquisition, marketing engagement, progress toward sign up | Product use, player development, platform engagement (later: subscriptions and revenue) |

The container ids are public values and live in `lib/analytics/config.ts`. The GA4 measurement id is **not** in the code: it is configured in each container's Google tag, so there is one install path only (no second `gtag.js`).

## 2. How it is switched on
1. **`ANALYTICS_MODE`** (server environment variable, see `.env.example`): unset or `off` = never loads (default); `production` = loads only on the four real production hostnames; `debug` = any host, for local verification only and never to be set on a deployment. Preview deployments and `localhost` never load a container in `production` mode.
2. **Consent.** Even when the mode is on, nothing loads for a visitor until analytics consent is granted (cookie `v_consent=granted`, `lib/analytics/consent.ts`). **No consent banner exists yet**, so in production nothing would load. Building one needs approval (see the compliance review). Setting `v_consent=denied` or calling `setConsent("denied")` stops events, sends a Consent Mode update with everything denied, and removes `_ga` cookies on a best effort basis.
3. **Disable instantly:** remove `ANALYTICS_MODE` (or set `off`) and redeploy.

### Deviation from Google's standard install, and why
The brief asked for the container snippet in `<head>` and a `<noscript>` iframe after `<body>`. Both are deliberately not used:
- The `<head>` snippet is injected by the browser **after consent**, not rendered unconditionally.
- The `<noscript>` iframe is omitted. It loads the container for visitors without JavaScript regardless of consent and regardless of which page they are on (including invite and sign in pages), so it cannot honor either control. If counsel and the founder decide a consent-free configuration is acceptable for some regions, adding it back is a decision to make then.

## 3. Page views and duplicates
- **First page view:** sent by the container's Google tag when the container loads (trigger: Initialization, All Pages).
- **Later navigation (Next.js client side routing):** the site pushes one `spa_page_view` event per route change; the container's GA4 event tag `page_view` fires on that custom event only. Query changes are not tracked. Tested: one event per navigation, none on first load, container loaded once.
- **No duplicates requires two settings in GA4/GTM** (section 8): turn off the stream's "Page changes based on browser history events" (enhanced measurement), and do not add a History Change trigger.

## 4. What the site sends to the data layer
`lib/analytics/sanitize.ts` and `lib/analytics/events.ts` are the privacy guard. Everything below is tested (14 unit checks, 47 browser checks).
- **Page location and title** are rebuilt, never copied: path placeholders replace secrets and names (`/join/:code`, `/r/:token`, `/:handle`), the query string is reduced to the six `utm_*` campaign parameters (values limited to plain characters), and titles of dynamic pages (player profiles contain display names) become "Victress".
- **Pages where the container does not load at all:** `/auth/*` (sign in codes), `/join/*` (invite codes), `/r/*` (future share tokens) and player profile pages (the title holds a name). The first page load on those pages is therefore not measured. Revisit after the container is verified to override `page_title` (section 8).
- **Referrer:** same site referrers keep a clean path only; other sites keep their origin only. (A plain link from `/join/{code}` would otherwise put the code in the next page's referrer.)
- **Events** are an allow list with fixed parameters per event and per site. Unknown events, wrong-site events and extra parameters are dropped; values that look like an email address or a long token are removed. No user id, email, handle, name, team name or free text is ever sent. `user_id` is never set.
- **Consent Mode v2 defaults:** `ad_storage`, `ad_user_data`, `ad_personalization` and `analytics_storage` denied; only `analytics_storage` is granted when analytics consent is given. Advertising signals are never granted.

## 5. Events
| Event | Site | Fires when | Parameters | Status |
|---|---|---|---|---|
| `page_view` (first load) | both | Container load (Google tag) | sanitized location, title, referrer | Implemented (needs container setup) |
| `spa_page_view` → GA4 `page_view` | both | Client side route change | sanitized location, path, title | Implemented |
| `pricing_page_view` | marketing | Pricing page viewed | none | Implemented |
| `cta_click` | marketing | A click on any link to victress.gg | `cta_text` (fixed link copy), `cta_location` (placement id), `destination: app` | Implemented |
| `sign_up_click` | marketing | A click on a link to the application's `/login` | `cta_location` | Implemented |
| `generate_lead` | marketing | Waitlist submission succeeded | `lead_type: waitlist`, `interest` (plan or scrims). **Never the email** | Implemented (an addition: the waitlist is the one real form) |
| `login`, `sign_up` | app | A fresh sign in is seen in the browser | `method`: google, discord, email or other | Implemented. **Not verified end to end** (sign in needs real providers): detects a sign in in the last 2 minutes, treats a user created within 15 seconds of sign in as new, once per sign in |
| `player_resume_created` | app | Onboarding submitted | `game`, `role_selected`, `rank_selected` | Implemented. Counted at submission (the action redirects, so nothing runs after it); a failed save would still count |
| `player_resume_updated` | app | Profile saved, or a stat entry added | `update_type`: profile or stats | Implemented |
| `player_resume_shared` | app | "Copy your link" on a Player Resume link (not team invite links) | `method: copy_link` | Implemented |
| `team_created`, `team_joined` | app | Team created, or an invite accepted | none | Implemented |
| `contact_form_submission`, `demo_request` | marketing | | | **Not implemented: no such form exists** (Contact and Partnerships use `mailto` links) |
| `view_item` | marketing | | | Not implemented: no item or checkout flow to describe |
| `scrim_upload`, `scrim_analysis_completed` | app | | | **Not implemented: Scrim Intelligence does not exist** |
| `scout_search`, `player_profile_viewed`, `recruiter_contact_initiated` | app | | | **Not implemented: Scout Desk does not exist.** Profile views are not tracked on first load for privacy (section 4) |
| `begin_checkout`, `purchase`, subscription upgrade and cancel | app | | | **Not implemented: billing does not exist** (`NEXT_PUBLIC_BILLING_ENABLED=false`) |

Events marked "Not implemented" must not be faked. When billing exists, push `begin_checkout` and `purchase` from a confirmed server result, never from a page a visitor can open at will, with: `transaction_id`, `currency`, `value`, and `items[]` (`item_id`, `item_name`, `price`, `quantity`). No email, name or card data. Add the events to `lib/analytics/events.ts` (the allow list) when they exist.

## 6. Campaign attribution
Links from the marketing site to the application are tagged (`appUrl(path, placement)` in `lib/urls.ts`): `utm_source=victressesports`, `utm_medium=website`, `utm_campaign=site_cta`, `utm_content=<placement>` (for example `hero_get_started`, `nav_log_in`, `pricing_rookie_start_free`). The two properties are separate and do not share sessions, so these tags are how the application property attributes a visit to the marketing site. Use the same convention for external campaigns and registration links (change only `utm_source`, `utm_medium` and `utm_campaign`). Cross domain linking is **not** enabled (it would join the two properties' sessions; a decision for later).

## 7. Files
**New:** `lib/analytics/config.ts`, `sanitize.ts`, `events.ts`, `consent.ts`, `client.ts`; `components/analytics/Analytics.tsx`; `scripts/analytics-test.mjs`, `scripts/ts-resolve-hooks.mjs`; `docs/analytics/README.md`, `privacy-compliance-review.md`.
**Modified:** `app/layout.tsx` (reads the host, mounts the component only when enabled); `lib/urls.ts` (campaign tags); marketing links in `components/marketing/Chrome.tsx`, `HeroClaim.tsx`, `PricingCards.tsx`, `app/m/page.tsx`, `app/m/about/page.tsx`, `app/m/teams/page.tsx`; event calls in `components/marketing/WaitlistButton.tsx`, `components/app/CopyLink.tsx`, `TeamPanel.tsx`, `JoinTeamButton.tsx`, `OnboardingWizard.tsx`, `ProfileForm.tsx`, `StatForm.tsx`; `app/a/[handle]/page.tsx` and `app/a/dashboard/page.tsx` (`resumeShare` flag); `.env.example`.
Not changed: middleware, routing, authentication, database, billing, Vercel Web Analytics (still present on Vercel, separate from this), legal text.

## 8. Manual steps (not done; need access to Google)
**In each container** (marketing `GTM-N38XS3DR`, application `GTM-PXQKSWP2`):
1. Data Layer Variables (version 2): `analytics_page_location`, `analytics_page_title`, `analytics_page_referrer`, `page_path` (as `analytics_page_path`), and for events `cta_text`, `cta_location`, `destination`, `lead_type`, `interest`, `method`, `update_type`, `game`, `role_selected`, `rank_selected`.
2. **Google tag** with that site's measurement id only (`G-GSMR43YQMP` or `G-ZBL5HGHG42`), trigger Initialization, All Pages, with configuration parameters `page_location` = `{{analytics_page_location}}`, `page_title` = `{{analytics_page_title}}`, `page_referrer` = `{{analytics_page_referrer}}`. **These overrides are the control that keeps URLs and titles clean; without them Google reads the raw values.**
3. GA4 event tag `page_view` on Custom Event `spa_page_view`, with the same three parameters.
4. One GA4 event tag per custom event in section 5 that applies to that site, each on a Custom Event trigger of the same name, parameters from the variables above.
5. **Consent settings:** enable consent overview; require `analytics_storage` for the Google and GA4 tags.
6. Safety: add a blocking condition so that the container's tags only fire when `victress_site` equals `marketing` (marketing container) or `app` (application container); keep the container free of Custom HTML tags and limit who can publish (a container can run arbitrary code on the site).
7. Use **Preview** (Tag Assistant) to confirm: the one container loads, one `page_view` per page, one per navigation, overridden location and title, no query strings other than `utm_*`.

**In each GA4 property:** turn off Google signals and advertising personalization features; review data sharing settings; set event data retention to the value counsel approves (do not leave the default by accident); turn off "Page changes based on browser history events", "Outbound clicks" and "Form interactions" under enhanced measurement (duplicates, or captures values the site did not review); do not enable cross domain measurement; confirm no user-id feature is enabled. Then check **Realtime** and **DebugView**.

**Before enabling in production:** counsel's review and the approved privacy text published (compliance review section 9), a consent control built and approved, then set `ANALYTICS_MODE=production` and redeploy.

## 9. Verification performed (local, Google stubbed)
- 14 unit checks (`node scripts/analytics-test.mjs`): container per host, off by default, previews and localhost excluded, path and URL sanitizing, referrers, event allow list.
- 47 browser checks with real hostnames mapped locally: no container without consent or in default mode; exactly one request for the right container per site and never the other; Consent Mode defaults; one `spa_page_view` per navigation and none on load; clean locations; CTA events and campaign tags; sensitive pages never load; revocation; no email, claim, handle, invite code or token anywhere in the data layer or requests.
- Existing SEO audit and homepage interaction test still pass.
- **Not verified:** that Google receives and processes anything, GA4 Realtime or DebugView, the container configuration (it does not exist in this repository), real sign in events, and behavior on the live domains.
