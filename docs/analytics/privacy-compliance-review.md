# Privacy, terms and analytics compliance review

**Status: REVIEW AND DRAFT PROPOSALS. No legal text has been changed or published.** `content/copy.ts`, `app/m/privacy/page.tsx` and `app/m/terms/page.tsx` are unchanged. This is not legal advice. Installing Google Analytics does not make Victress compliant, and nothing here is a statement that it is. Items marked **COUNSEL** need qualified privacy counsel; the draft wording in section 7 is for counsel to revise, and every bracketed value is a fact or choice nobody has made yet.
Technical implementation: [README.md](README.md). Analytics is off by default and inert until a consent control exists.

## 1. What I inspected
`content/copy.ts` (`legal.privacy`, `legal.terms`, `auth`), `app/m/privacy/page.tsx`, `app/m/terms/page.tsx`, `app/a/login/page.tsx` (age notice and links), every place the code sets a cookie (`middleware.ts`, `components/app/LoginForm.tsx`, `app/a/auth/callback/route.ts`, `app/a/onboarding/actions.ts`), `app/layout.tsx` (Vercel Web Analytics), and the earlier audit in `docs/compliance-audit.md` on branch `claude/strategy-foundation`.

## 2. Where the policies live
- **One Privacy Policy and one Terms page exist, both on victressesports.com** (`/privacy`, `/terms`). victress.gg has no policy pages of its own. The application links to the marketing ones from the sign in page only (`app/a/login/page.tsx`); the dashboard and profile pages have no privacy link.
- Both are labeled "Placeholder. Final text is pending legal review." and are three and four lines long.
- **No cookie notice, cookie settings, or consent mechanism exists on either site.**

## 3. Current statements versus actual practice
| Statement or gap | Finding |
|---|---|
| "We collect your email and the profile details you choose to share." | Incomplete (also found in the earlier audit): omits the name and picture currently copied from Google or Discord at signup, waitlist emails, server and auth logs, and every provider below. Also affected by the privacy migration under review, which is not built |
| "We do not use advertising cookies." | True of the code today. **It stops being safe to say if analytics is enabled without checking the GA4 and GTM settings** (Google signals, advertising features, data sharing). Keep only if those are verified off (README section 8), and have counsel decide the wording |
| "Write to hello@victressesports.com to see or delete your data." | Accurate only as a manual process. No self serve access, export or deletion exists, and no retention period is stated anywhere. Do not state one until one is decided |
| Terms | **Do not mention the Privacy Policy.** The sign in notice links both, but the Terms text itself should reference the Privacy Policy (draft in section 7) |
| Analytics | Not disclosed. Vercel Web Analytics already runs in the code when deployed on Vercel (`app/layout.tsx`) and is not disclosed either; whether it needs disclosure, and how it is described, is for counsel |
| Age | "You must be at least 13" is a notice, not enforcement (unchanged finding, **COUNSEL**) |
| Marketing waitlist | Collects an email with no privacy notice at the point of collection |

## 4. What Google analytics would involve
**Two separate properties with different purposes** (to be explained in the policy):
- **victressesports.com** (container GTM-N38XS3DR, property G-GSMR43YQMP): how visitors find the marketing site, which pages and calls to action they use, and whether they proceed toward registration.
- **victress.gg** (container GTM-PXQKSWP2, property G-ZBL5HGHG42): how signed in and prospective users use the product (sign in, profile and team actions; later scrims, recruiting and subscriptions if built).

**Data involved (as designed):** a random analytics identifier in a first party cookie; the page path (with placeholders for invite, sign in and profile pages) and, only when present, campaign tags; a page title for static pages; referrer (origin only for other sites); device, browser, language, screen and approximate location derived by Google from the connection; event names with the fixed parameters in README section 5.
**Not sent by design (tested):** email, name, handle, user id, sign in codes, invite codes, share tokens, team names, form contents, free text, query strings other than `utm_*`.
**Cookies that would be set:** `_ga` and `_ga_<stream id>` (Google Analytics, set only after analytics consent). Existing cookies: `sb-*` Supabase session (essential to sign in); `v_claim` and `v_next` (30 minutes, sign in helper); `v_site` (preview deployments only); new `v_consent` (stores the consent choice, proposed 180 days, **COUNSEL**).
**Providers (to disclose; roles for counsel to characterize):**
| Provider | Use | Note |
|---|---|---|
| Google LLC | Tag Manager, Analytics (both sites) | Analytics and tag data; international transfer and the processing role are **COUNSEL** questions. Google's own terms require appropriate disclosure and consent where required by law and prohibit sending personal information |
| Supabase | Database, authentication, storage, auth logs | Existing |
| Resend | Email (waitlist confirmation, sign in links) | Existing |
| Vercel | Hosting, request logs, Web Analytics (when deployed there) | Existing |
| Stripe | Payments | **Planned only; billing is not live.** Do not list as a current provider |

## 5. Is a consent mechanism required, and do the tags respect it?
- **Required?** Analytics cookies are not strictly necessary. For visitors in the EEA, UK and some other places, prior opt in consent for them is generally required; several US states and other regions have notice, opt out or browser signal (such as Global Privacy Control) rules. **Which visitors Victress must treat which way, and whether opt in applies everywhere, is a COUNSEL decision.** Victress's audience (collegiate and amateur players, including people near the minimum age) makes this more, not less, important.
- **What the code does today:** it **fails closed**. Nothing loads without `v_consent=granted`; Consent Mode v2 defaults are denied for all four storage types; only analytics storage is ever granted; advertising storage is never granted; revocation sends a denied update, stops events and clears `_ga` cookies (best effort). Tested locally with Google's script stubbed.
- **What is missing:** the control itself. Because none exists, analytics would collect nothing in production. A control is a user facing privacy change and needs approval. Requirements to give counsel for design review: an accept and a reject choice of equal prominence; no pre ticked or implied consent; a single analytics category (nothing else uses cookies beyond the essential ones above); the choice remembered and changeable at any time from a persistent "Cookie settings" link on **both** sites; honoring a browser privacy signal as counsel directs; a decision on whether to keep a record of the consent; wording consistent with the policy; behavior for visitors under the age Victress states.
- **Not honored by the brief's standard install:** the `<noscript>` iframe and an unconditional head snippet cannot respect consent, so they were not used (README section 2). **COUNSEL/founder decision** if a consent free configuration is ever considered.

## 6. Verifying that no sensitive data goes to Google
Verified locally: (a) page location, title and referrer are rebuilt, with no query other than campaign tags; (b) the container never loads on sign in callback, invite and profile pages; (c) events are an allow list with fixed parameters and emails or token like values are removed; (d) a plain link from an invite page cannot carry the invite code in the referrer; (e) no user id is set.
**Remaining risks, which only verification inside Google can close:**
1. **Container misconfiguration.** The overrides for `page_location`, `page_title` and `page_referrer` in each container's Google tag are the control; if missing, Google reads raw values (README section 8). Verify in Tag Assistant before enabling.
2. **Anything else in the container** (Custom HTML tags or extra tags) can send data the site never reviewed. Limit publishing rights and review the container before launch.
3. **GA4 settings** (Google signals, advertising features, data sharing, enhanced measurement of outbound clicks and form interactions, retention) must be set by hand.
4. **Player profile pages are not measured on first load** (the title holds a display name). A decision whether to measure them later depends on the verified overrides.
5. **Data Google derives itself** (IP based location, device details, identifiers) cannot be removed by the site; it must be disclosed accurately.
6. **Real sign in events** (`login`, `sign_up`) were not exercised end to end.

## 7. Recommended policy changes (draft wording, not published)
These are for counsel to revise. Bracketed items are unknown facts or choices. Preserve existing text that remains accurate (the age requirement, the contact address, the self reported label statement).

**Privacy Policy: replace or extend the placeholder body with sections covering:**
1. *Who we are and the two sites.* "Victress operates two websites: victressesports.com, which explains Victress, and victress.gg, the Victress application. This policy applies to both."
2. *What we collect.* Account email and the profile details you choose to share (existing); [name and picture from your Google or Discord account, as the product actually behaves when this is published]; waitlist email and interest; technical logs kept by our providers; analytics information described below.
3. *Analytics.* "With your permission, we use Google Tag Manager and Google Analytics 4 to understand how people use our sites. On victressesports.com we look at how visitors find us, which pages and links they use, and whether they continue to the application. On victress.gg we look at how the application is used, such as signing in and using profile and team features. Each site reports to its own Google Analytics property. We configure analytics not to receive your email address, name, username, sign in codes, invite links or what you type into forms. Google may receive your IP address, device and browser information and an identifier stored in a cookie, and uses this to provide the service to us. [Whether Google also uses it for its own purposes depends on our account settings, to be confirmed.]"
4. *Cookies.* A table of the cookies in section 4 with name, purpose, who sets it, duration [to be confirmed]. State which are essential and which need consent.
5. *Your choices.* "You can accept or reject analytics cookies [in the cookie settings, link text]. You can change your choice at any time. [Browser privacy signals: to be decided.]" Do not publish this until the control exists.
6. *Service providers.* Google (analytics), Supabase (database and sign in), Resend (email), Vercel (hosting and analytics). [Payments provider only when billing is live.]
7. *Retention.* "[Retention periods to be set by counsel and the founder.]" **Do not state any period until decided.**
8. *Your rights.* Access, correction and deletion by writing to hello@victressesports.com (existing) [plus rights required by law, to be added by counsel; the current process is manual].
9. *Transfers, children, security, changes.* [COUNSEL] International transfers; the 13 plus rule (existing, with whatever counsel decides about enforcement); a general statement of reasonable security with **no guarantees**; how changes are announced.
10. *Do not use* "We do not use advertising cookies" unless the GA4 and GTM settings are verified and counsel agrees; and do not call any analytics "privacy friendly" or "anonymous".

**Terms of Service:** add a sentence such as "Our Privacy Policy explains how we collect and use information, including through analytics and cookies." linking `/privacy`, near the start. Keep the existing age, fair use, self reported and changes lines.

**Product placements (need approval, small changes):** a privacy link on the application's own pages (footer or account area); a "Cookie settings" link on both sites; a one line privacy notice beside the waitlist form.

## 8. Questions for qualified privacy counsel
1. Which regions' rules apply to Victress's visitors, and does analytics need prior opt in everywhere, or only in some places?
2. Is Victress a controller or a joint controller with Google for these properties, and what Google terms and data processing terms must be accepted in the Google account?
3. Is the consent mechanism described in section 5 sufficient, including browser privacy signals, consent records, and the retention of the consent cookie (180 days is a placeholder)?
4. Are the analytics identifiers and the data Google derives (IP based location, device details) adequately disclosed by section 7, and what international transfer language is required?
5. What event data retention should be set in GA4, and for how long should other records be kept?
6. How should analytics treat visitors who may be under the minimum age or under 18, given recruiter and minor questions already open elsewhere?
7. Does the Vercel Web Analytics component already in the code require disclosure and consent, and how should it be described?
8. What can the policy truthfully say about security and about "we do not use advertising cookies" once GA4 is configured?
9. Whether the application needs its own policy pages or the marketing ones may be linked.
10. Whether and how the strategy's player privacy features (consent, sharing, recruiter access), once built, change what must be disclosed.

## 9. Gates before analytics is enabled in production
1. Counsel has reviewed this document and the approved Privacy Policy and Terms text are published (this document publishes nothing).
2. The consent control is designed, approved and built, and linked from both sites.
3. Both containers and GA4 properties are configured and verified (README section 8), including Tag Assistant and DebugView checks and the GA4 settings listed there.
4. `ANALYTICS_MODE=production` is set on the deployment (until then nothing loads).
5. A named owner is responsible for the containers' publishing access and for reviewing changes.

## 10. Consistency with the rest of the strategy
- The privacy migration (private by default profiles, share tokens, closing public reads) is a separate, approved-in-direction, unbuilt effort. Policy text must describe the product as it behaves on the day it is published, not as designed.
- Strategy documents commit to no unsupported privacy or compliance claims. This review makes none.
