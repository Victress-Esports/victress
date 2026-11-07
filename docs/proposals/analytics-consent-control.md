# Proposal: the analytics consent control (design only, PR #11 stays unmerged)

**Status: DESIGN. Nothing is built. PR #11 (Google Tag Manager and GA4, consent gated, off by default) stays held and unmerged.** The pilot readiness list requires a consent control to be built and approved before any analytics is enabled. Analytics is **off** (`ANALYTICS_MODE=off`) and inert even when switched on, because no consent control exists. Legal text stays labeled pending legal review; counsel decides the requirements.

## 1. What the control must do
- **Default is no consent.** Before a visitor chooses, no analytics script, tag or cookie loads on either site. "Necessary" storage (the sign in session on victress.gg, the `v_site` cookie on previews) is separate and needs no consent.
- **One clear choice, equally easy both ways.** A short notice with "Accept analytics" and "No thanks" buttons of equal prominence, a link to the privacy text, and no dark patterns. Closing the notice is "No thanks". Nothing preselected.
- **Change or withdraw at any time** from a "Privacy choices" link in the footer of both sites. Withdrawing stops loading tags on the next page and clears the analytics cookies the app can clear.
- **Remember the choice** in a first party cookie on each site (cookies are not shared across victressesports.com and victress.gg, so the visitor is asked on each). Proposed lifetime 180 days (a proposal for counsel, not a decision), then ask again.
- **Never on sensitive pages**, as #11 already specifies: sign in, invite links, sharing links `/r/...`, player profiles. Page URL, title and referrer are cleaned; only allow listed events and parameters are sent; no email, name, handle, user id, team name or form content.
- **Consent Mode defaults to denied** for every storage type; "Accept" grants only analytics storage; no advertising signals (to be verified in GA4 and the GTM containers, which have not been reviewed).

## 2. Placement and behavior
- A small, non blocking banner at the bottom on first visit (both sites), reachable by keyboard, announced to screen readers, readable at 390 px; it does not cover the sign in form or the main call to action.
- State lives in a small client module (`lib/consent.ts`) with three values: `unset`, `granted`, `denied`. The analytics loader from #11 reads it and refuses to load unless `granted` **and** `ANALYTICS_MODE=production` **and** the host is a real production host.
- No tag manager container is requested before consent, so there is no pre consent network call to Google.
- The notice text avoids unsupported claims: it says what is measured (page views and a few allow listed events), that it is not linked to a name or email, and that the visitor can change their choice. It makes no claim about GA4's privacy beyond what has been verified.

## 3. Records
Server side proof of consent is not needed for anonymous analytics if nothing identifying is collected; counsel to confirm. If counsel wants a record, store only a hashed random id and the choice, with a retention period (**LEGAL**).

## 4. Tests required
- Browser tests (Playwright): first visit shows the notice and **no** request to `googletagmanager.com` or `google-analytics.com`; "No thanks" keeps it that way across pages and reloads; "Accept" loads only the allowed tags and only on non sensitive paths; withdrawing stops loading and removes cookies; keyboard and screen reader operation; the notice does not hide the sign in form at 390 px.
- Unit tests from #11 (path classification, referrer cleaning, event allow list, config) keep passing; add a test that `denied` and `unset` never load.
- `npm run seo:audit` keeps asserting that the built HTML contains no analytics script by default.

## 5. Order of work and gates
1. Counsel: consent requirements, notice wording, the cookie lifetime, Google's role and transfers, and the privacy text update. 2. Review of the GTM containers (what tags fire and how they honor consent). 3. Build the control (a separate PR from #11), tested as above. 4. Rebase #11 on it. 5. Turn on in Preview, verify with the browser tests, then production only with approval. `ANALYTICS_MODE` stays off until all of that.

## 6. Decisions needed
Whether analytics is wanted before the pilot at all (the Vercel Analytics component already loads when `VERCEL` is set; whether it is enabled for the project is unknown and should be checked); the cookie lifetime; notice wording; who reviews the containers.
