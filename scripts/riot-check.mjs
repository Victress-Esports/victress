// Live check against Riot with YOUR Riot ID. Reads RIOT_API_KEY from the environment; never prints it.
//   RIOT_API_KEY=... node scripts/riot-check.mjs "Name#TAG" [americas|europe|asia|sea] [matches]
// Calls: 1 Account API request, 1 match id list, then match details for each match (and 1 timeline for the newest).
import { loadRiot } from "./riot-load.mjs";
const { createRiotClient, parseRiotId, queueKind, RiotError } = await loadRiot();
const key = process.env.RIOT_API_KEY;
if (!key) { console.error("RIOT_API_KEY is not set in this shell."); process.exit(2); }
const id = parseRiotId(process.argv[2] ?? "");
const route = process.argv[3] ?? "americas";
const n = Math.min(20, Number(process.argv[4] ?? 5));
if (!id) { console.error('Usage: node scripts/riot-check.mjs "Name#TAG" [region] [matches]'); process.exit(2); }
const riot = createRiotClient({ apiKey: key });
try {
  const acct = await riot.accountByRiotId(id.gameName, id.tagLine, route);
  console.log(`Account OK: ${acct.gameName}#${acct.tagLine}, puuid ${acct.puuid.slice(0, 8)}... (${acct.puuid.length} chars)`);
  const ids = await riot.matchIds(acct.puuid, route, { count: n });
  console.log(`Match ids: ${ids.length}`);
  for (const [i, mid] of ids.entries()) {
    const m = await riot.match(mid, route);
    const info = m.info, me = info.participants.find((p) => p.puuid === acct.puuid);
    console.log(`${mid} queue ${info.queueId} (${queueKind(info.queueId)}) ${Math.round(info.gameDuration / 60)}m ${me ? `${me.championName} ${me.kills}/${me.deaths}/${me.assists} CS ${me.totalMinionsKilled + me.neutralMinionsKilled} ${me.win ? "win" : "loss"}` : "player not found in match"}`);
    if (i === 0) { const t = await riot.timeline(mid, route); console.log(`Timeline OK: ${t.info.frames.length} frames`); }
  }
  console.log("Done.");
} catch (e) {
  if (e instanceof RiotError) { console.error(`FAILED (${e.code}${e.status ? ` ${e.status}` : ""}): ${e.message}`); process.exit(1); }
  console.error("FAILED: unexpected error"); process.exit(1);
}
