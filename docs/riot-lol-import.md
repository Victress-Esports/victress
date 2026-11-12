# League of Legends import (M1): Riot policy findings and how the build follows them

Read 2026-11-08 from developer.riotgames.com (General Policies last updated May 29, 2025; API Terms; LoL docs). Nothing here is legal advice.

## Limits that apply
| Topic | What Riot says | How the build follows it |
|---|---|---|
| Legal notice | Post the exact boilerplate where players can readily see it | `content/riot.ts`, shown in the marketing footer and the app footer, only the product name filled in |
| Custom games | Not publicly displayed unless the player opts in; otherwise custom match data may only be made available to the player through Riot Sign On (production keys only) | Queue 0 matches are counted but **not stored** unless `RIOT_CUSTOM_GAMES_ENABLED=true`. Practice Tool games are not a listed queue, so they fall under custom |
| Ownership | No proof from a typed Riot ID | Account link records `ownership_verified=false`; screens say the Riot ID is taken at the player's word. Riot Sign On needs a production key |
| Retention | Riot publishes no retention period. On termination all Game Information must be deleted. Riot forwards GDPR deletion requests as lists of identifiers to active developers | Players can delete matches, the link and history at any time; deleting the link cascades. For a forwarded request, delete the `game_accounts` row with that PUUID |
| Other players | No de-anonymizing players who cannot reasonably be identified | Other players are stored as anonymous slots: no Riot ID, PUUID or name. Only the owner's own link holds a PUUID |
| Keys | One product per key, never in code | Server only (`lib/riot/index.ts`), `npm run test:riot` checks bundles |
| Key type | Personal keys are for personal projects and proofs of concept; "Showing (self) player stats" and training tools are approved production use cases | The current key is a personal key. Public use needs a production key (and monetization needs Approved status, a free tier, and Riot approval to charge for access to Game Information) |
| Rate limits | 20 per second, 100 per 2 minutes | Paced at 18 and 95, 429 handled with Retry-After |
| Integrity | No information that is not available to the player in game; no win rates for Arena or augments | Only the player's own finished games are shown; no Arena item win rates |

## Queues
Verified against Riot's published queues.json (99 entries, fetched 2026-11-08): ranked 420 and 440, normal 400, 430, 480, 490, custom 0. Everything else is "other" with Riot's own label (`lib/riot/queues.ts`).

## Not verified
Whether the personal key's own request limits or expiry differ from the portal text; the key's lifetime; whether Riot wants a rendering of the user flow before a production key.
