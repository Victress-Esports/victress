# Game configs: sources and open questions

Each game lives in `content/games.ts` as its own config object (roles, ranks, stat categories, default leaderboard stat).
Everything is entered by the player and shown as **Self-reported**. Victress has no automated game integrations.

Checked November 2026. Several sources below are third-party guides; verify against the official pages before launch.

| Game | Role model | Ranks (stored as the tier family) |
|---|---|---|
| VALORANT | Agent roles: Duelist, Initiator, Controller, Sentinel | Iron, Bronze, Silver, Gold, Platinum, Diamond, Ascendant, Immortal, Radiant |
| Counter-Strike 2 | Community roles: Entry, AWPer, Support, Lurker, In-game leader | Competitive families: Silver, Gold Nova, Master Guardian, Legendary Eagle, Supreme, Global Elite. Premier is a numeric rating, tracked as a stat |
| Rocket League | None (no fixed roles, so the role step is skipped) | Bronze, Silver, Gold, Platinum, Diamond, Champion, Grand Champion, Supersonic Legend |
| League of Legends | Five positions: Top, Jungle, Mid, Bot, Support | Iron, Bronze, Silver, Gold, Platinum, Emerald, Diamond, Master, Grandmaster, Challenger |
| Apex Legends | Legend classes: Assault, Skirmisher, Recon, Controller, Support | Rookie, Bronze, Silver, Gold, Platinum, Diamond, Master, Apex Predator |
| Overwatch 2 | Tank, Damage, Support | Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster, Champion |

## Sources

- VALORANT: [Hotspawn: all VALORANT roles](https://www.hotspawn.com/valorant/guide/all-valorant-roles), [Plarium: VALORANT ranks](https://plarium.com/blog/valorant-ranks)
- CS2: [CSDB: ranks guide (Premier and 18 skill groups)](https://csdb.gg/guides/ranks-guide/), [Counter-Strike Wiki: Premier](https://counterstrikewiki.com/Premier_(Game_Mode)), [ONE Esports: CS Rating colors](https://www.oneesports.gg/counter-strike-2/new-cs2-ranking-system-cs-rating-colors/)
- Rocket League: [Epic Games help: Competitive Ranks](https://www.epicgames.com/help/en-US/rocket-league-c182/basics-c190/a5720134088603)
- League of Legends: [Official wiki: Rank](https://wiki.leagueoflegends.com/en-us/Rank_(League_of_Legends)), [EarlyGame: lanes](https://earlygame.com/lol/what-lanes-exist)
- Apex Legends: [EA Help: how Ranked works](https://help.ea.com/en/articles/apex-legends/ranked/), [EA Help: characters and abilities](https://help.ea.com/help/apex-legends/apex-legends/apex-legends-characters-abilities-guide), [Shacknews: Season 16 class perks](https://shacknews.com/article/134135/apex-legends-season-16-revelry-patch-notes)
- Overwatch 2: [GGRecon: ranking system](https://www.ggrecon.com/guides/overwatch-2-ranks-ranking-system-explained/), [PC Gamer: ranks](https://pcgamer.com/games/fps/overwatch-2-ranks-competitive-rewards-explained), [ExitLag: ranks](https://www.exitlag.com/blog/overwatch-2-ranks/)

## Flags: things I am not sure about

1. **VALORANT "Flex"** was in my first draft but is a community term, not an official role, so I removed it. Add it back if you want it.
2. **CS2 roles are not game-defined.** They are the community's standard set. Say so if you want a different list.
3. **CS2 ranks are simplified on purpose.** The game has 18 Competitive skill groups and a separate Premier rating (CS Rating, shown in colour bands). Sources disagree on the top band (Gold at 30,000+ vs. none). I store six rank families and track Premier as a number. The 40,000 upper bound on `premier_rating` is my own sanity limit, not an official cap.
4. **Rocket League** ranks are per playlist in game, and each family has tiers I to III (Grand Champion has tiers per Epic, though some guides say otherwise). I store one family name, meaning "your current rank".
5. **League of Legends** has divisions (IV to I) inside Iron through Diamond, which are not captured. "Bot" means the ADC lane.
6. **Apex** classes come from EA's help and the Season 16 rework. Legend assignments change as legends are added (one source disagrees about Revenant), but Victress stores only the class, not the legend. Apex Predator is leaderboard-based (top 750 per platform), so it is self-claimed here.
7. **Overwatch 2** official role names are Tank, Damage, Support. You wrote "DPS", which is the colloquial name. The ladder has a separate rank per role in Role Queue, so the stored rank applies to the role the player picks. Sources disagree on when Champion was added (February 2024 vs. Season 10).
8. **Stat categories and ranges** were chosen by me as common, self-trackable numbers per game. They are not checked against any API, and the min/max values are sanity limits. The default leaderboard stat per game is also my choice (VALORANT: Avg combat score, CS2: Premier rating, Rocket League and Overwatch 2: Win rate, League: KDA, Apex: Avg damage).
