# First party funnel events: exactly what is recorded

Replaces the Google Tag Manager and GA4 plan in #11. No third party receives anything. No ad trackers, no analytics cookie, no script added to any page. Stored in our own Supabase table `public.funnel_events` (migration `20261108000200_funnel_events.sql`, **not applied to production**; the code works without the table and simply records nothing).

## The six events
| Event | When it fires | Who it is attached to | Extra data |
|---|---|---|---|
| `registration_started` | A visitor clicks Continue with Discord or Google, or submits their email, on the sign in page | **Nobody.** The row has no profile and no identifier | Method only: `email`, `discord` or `google` |
| `registration_completed` | The first successful sign in of a brand new account (account less than 10 minutes old) | The account | none |
| `profile_completed` | The first time the account has a name it chose (not the placeholder) and at least one game | The account | none |
| `first_import_started` | The first time the player starts a League of Legends import | The account | `game: LOL` |
| `first_analysis_viewed` | The first time the player opens their imported matches with at least one match, or a match page | The account | `game: LOL` |
| `return_visit` | A signed in dashboard visit on a UTC day after the day the account was created. At most one per account per day; never on the sign up day | The account | none |

Each row also has a numeric id, the UTC date and a timestamp. Once only events cannot repeat (a unique index enforces it).

## What is not recorded
IP address, device or browser, referrer, page URLs or paths, search text, emails, names, handles, team names, game stats, match contents, form text. Visitors cannot send any event except `registration_started`, and it accepts only the method (anything else is rejected). Nothing is sent to any other company.

## Controls
- Only the server can read or write the table (row level security with no policies; no grants to anonymous or signed in users). Tested: `supabase/tests/funnel_events.sql`.
- Events tied to an account are deleted when the account is deleted.
- The anonymous event is limited to 20 per IP address per hour in memory; the address itself is not stored.
- Failures never reach the player: recording errors are swallowed and logged by error code only.

## How to describe it accurately
"Victress counts a few product events in its own database, such as starting sign up, finishing sign up, completing a profile, starting a game import, viewing a first analysis and returning on a later day. Events carry no IP address, device details or page history, and nothing is shared with advertisers or analytics companies." The privacy page says this (Product activity).

## Open points
- **Retention:** no deletion schedule for events beyond account deletion. Anonymous `registration_started` rows have no owner to delete them with. Decide a period (for example 24 months) before production use.
- **Consent:** these events are first party and minimal, so no banner is used. If you want an opt out for signed in players, it needs a profile setting and a change to `recordFunnelEvent`.
- **Reading the funnel:** there is no dashboard. Counts are queried with the service role (for example `select name, count(*) from funnel_events group by 1`).
- Not covered by a test: the live sign in callback (`registration_completed`) and onboarding hooks, because the mock stack does not simulate the sign in code exchange. The recorder, the events route, the database table and the return visit rule are tested.
