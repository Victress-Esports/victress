// Tests the Riot client with a stub fetch and a fake clock (no network, no key). Also guards the key from client code.
//   npm run test:riot
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadRiot } from "./riot-load.mjs";
const { createRiotClient, RateLimiter, RiotError, parseRiotId, queueKind, normalizeMatch, normalizeTimeline } = await loadRiot();
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const KEY = "RGAPI-test-secret-key-0000";
const PUUID = "p".repeat(78);

function fakeClock() { let t = 1_000_000; return { now: () => t, sleep: async (ms) => { t += ms; }, advance: (ms) => { t += ms; } }; }
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });

// parsing and queues
check(JSON.stringify(parseRiotId(" Faker#KR1 ")) === '{"gameName":"Faker","tagLine":"KR1"}', "parseRiotId accepts Name#TAG");
check(parseRiotId("nohash") === null && parseRiotId("#TAG") === null && parseRiotId("a/b#TAG1") === null && parseRiotId("Name#toolongtag") === null, "parseRiotId rejects malformed ids");
check(queueKind(420) === "ranked" && queueKind(0) === "custom" && queueKind(450) === "other" && queueKind(480) === "normal" && queueKind(400) === "normal" && queueKind(9999) === "other", "queue kinds: ranked, normal, custom, other (Riot's published ids)");

// request shape and key handling
{
  const calls = [];
  const c = fakeClock();
  const riot = createRiotClient({ apiKey: KEY, clock: c, fetch: async (url, init) => { calls.push({ url, init }); return json({ puuid: PUUID, gameName: "Name", tagLine: "TAG" }); } });
  const a = await riot.accountByRiotId("Name", "TAG", "americas");
  check(a.puuid === PUUID && calls[0].url === "https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/Name/TAG", "account request goes to the regional host with the encoded Riot ID");
  check(calls[0].init.headers["X-Riot-Token"] === KEY && !calls[0].url.includes(KEY), "key is sent in the header, never in the URL");
  await riot.matchIds(PUUID, "americas", { count: 500, queue: 420 });
  check(calls[1].url.includes("/lol/match/v5/matches/by-puuid/") && calls[1].url.includes("count=100") && calls[1].url.includes("queue=420"), "match ids request caps count at 100 and passes the queue filter");
  await riot.match("NA1_1234567890", "americas"); await riot.timeline("NA1_1234567890", "americas");
  check(calls[2].url.endsWith("/lol/match/v5/matches/NA1_1234567890") && calls[3].url.endsWith("/NA1_1234567890/timeline"), "match and timeline endpoints");
  for (const bad of [() => riot.match("../x", "americas"), () => riot.accountByRiotId("a/b", "TAG", "americas"), () => riot.matchIds("short", "americas"), () => riot.match("NA1_1", "mars")]) {
    let e; try { await bad(); } catch (x) { e = x; }
    check(e instanceof RiotError && e.code === "invalid_input", "invalid input refused before any request");
  }
  check(calls.length === 4, "refused inputs made no requests");
}

// rate limiter: 18 per second, then waits
{
  const c = fakeClock();
  const l = new RateLimiter(c);
  const t0 = c.now();
  for (let i = 0; i < 18; i++) await l.acquire();
  check(c.now() === t0, "first 18 requests go immediately");
  await l.acquire();
  check(c.now() - t0 >= 1000, "the 19th request waits for the 1 second window");
}
{
  const c = fakeClock();
  const l = new RateLimiter(c);
  const t0 = c.now(); const stamps = [];
  for (let i = 0; i < 200; i++) { await l.acquire(); stamps.push(c.now()); }
  let ok = true;
  for (let i = 0; i < stamps.length; i++) {
    const inSec = stamps.filter((t) => t > stamps[i] - 1000 && t <= stamps[i]).length;
    const inTwo = stamps.filter((t) => t > stamps[i] - 120000 && t <= stamps[i]).length;
    if (inSec > 20 || inTwo > 100) ok = false;
  }
  check(ok, "200 requests never exceed 20 per second or 100 per 2 minutes");
  check(c.now() - t0 >= 120_000, "200 requests take at least two minutes under the 2 minute limit");
}

// 429, 5xx, auth, not found, timeouts
{
  const c = fakeClock(); let n = 0;
  const riot = createRiotClient({ apiKey: KEY, clock: c, fetch: async () => (++n === 1 ? json({ status: { status_code: 429 } }, 429, { "retry-after": "7" }) : json({ puuid: PUUID, gameName: "N", tagLine: "T" })) });
  const t0 = c.now();
  const a = await riot.accountByRiotId("Name", "TAG", "europe");
  check(a.puuid === PUUID && n === 2 && c.now() - t0 >= 7000, "429 waits for Retry-After, then retries and succeeds");
}
{
  const c = fakeClock(); let n = 0;
  const riot = createRiotClient({ apiKey: KEY, clock: c, maxRetries: 2, fetch: async () => { n++; return json({}, 429, { "retry-after": "1" }); } });
  let e; try { await riot.match("NA1_1234567890", "americas"); } catch (x) { e = x; }
  check(e?.code === "rate_limited" && n === 3, "persistent 429 stops after the retry limit with a clear error");
}
{
  const c = fakeClock(); let n = 0;
  const riot = createRiotClient({ apiKey: KEY, clock: c, fetch: async () => (++n < 3 ? json({}, 503) : json(["NA1_1234567890"])) });
  const ids = await riot.matchIds(PUUID, "americas");
  check(ids.length === 1 && n === 3, "503 is retried with backoff");
}
for (const [status, code] of [[404, "not_found"], [401, "auth"], [403, "auth"], [418, "unexpected"]]) {
  let n = 0; const riot = createRiotClient({ apiKey: KEY, clock: fakeClock(), fetch: async () => { n++; return json({ message: `body mentions ${KEY}` }, status); } });
  let e; try { await riot.accountByRiotId("Name", "TAG", "americas"); } catch (x) { e = x; }
  check(e?.code === code && n === 1 && !String(e.message).includes(KEY), `${status} gives "${code}", is not retried and the message holds no key or response body`);
}
{
  let n = 0; const riot = createRiotClient({ apiKey: KEY, clock: fakeClock(), maxRetries: 1, fetch: async () => { n++; const e = new Error("socket " + KEY); e.name = "TimeoutError"; throw e; } });
  let e; try { await riot.accountByRiotId("Name", "TAG", "americas"); } catch (x) { e = x; }
  check(e?.code === "timeout" && n === 2 && !e.message.includes(KEY), "timeouts are retried then reported without leaking error text");
}
{ let e; try { createRiotClient({ apiKey: "" }); } catch (x) { e = x; } check(e?.code === "auth", "no key: client refuses to start"); }

// normalization: anonymous slots, queue kinds, units
{
  const ME = "me-puuid-" + "m".repeat(60);
  const part = (i, puuid, extra = {}) => ({ participantId: i, puuid, riotIdGameName: "SecretName" + i, summonerName: "Old" + i, teamId: i <= 5 ? 100 : 200, championName: "Ahri", teamPosition: "MIDDLE", champLevel: 16, kills: 5, deaths: 2, assists: 7, totalMinionsKilled: 180, neutralMinionsKilled: 20, goldEarned: 12000, totalDamageDealtToChampions: 22000, totalDamageTaken: 15000, visionScore: 30, wardsPlaced: 10, wardsKilled: 3, visionWardsBoughtInGame: 2, win: i <= 5, gameEndedInEarlySurrender: false, item0: 3089, ...extra });
  const parts = Array.from({ length: 10 }, (_, k) => part(k + 1, k === 2 ? ME : "other-" + k));
  const m = { metadata: { matchId: "EUW1_7000000001" }, info: { gameStartTimestamp: 1_760_000_000_000, gameEndTimestamp: 1_760_001_800_000, gameDuration: 1800, gameVersion: "15.20.1", queueId: 420, participants: parts, teams: [{ teamId: 100, objectives: { baron: { first: true, kills: 1 }, dragon: { first: false, kills: 3 } } }, { teamId: 200, objectives: { baron: { first: false, kills: 0 } } }] } };
  const r = normalizeMatch(m, ME);
  check(r.ok && r.row.queue_kind === "ranked" && r.row.queue_label === "5v5 Ranked Solo" && r.row.result === "win" && r.row.duration_seconds === 1800 && r.row.me.cs === 200 && r.row.me.slot === 3, "match normalizes: ranked, win, 30 minutes, CS 200 (minions plus jungle), owner slot found");
  const text = JSON.stringify(r.row);
  check(!text.includes("me-puuid") && !text.includes("other-") && !text.includes("SecretName") && !text.includes("Old1"), "stored row has no PUUID, Riot ID or summoner name for anyone");
  check(r.row.participants.length === 10 && r.row.objectives.blue.baron.kills === 1, "ten anonymous slots and team objectives kept");
  check(normalizeMatch(m, "someone-else-" + "z".repeat(60)).reason === "not_participant", "a match the player was not in is refused");
  check(normalizeMatch({ metadata: { matchId: "bad" }, info: {} }, ME).reason === "malformed", "malformed match refused");
  const custom = { ...m, info: { ...m.info, queueId: 0 } };
  check(normalizeMatch(custom, ME).row.queue_kind === "custom", "queue 0 is tagged custom, apart from ranked");
  const remake = { ...m, info: { ...m.info, participants: parts.map((p, i) => (i === 2 ? { ...p, gameEndedInEarlySurrender: true } : p)) } };
  check(normalizeMatch(remake, ME).row.result === "remake", "early surrender is a remake, not a loss");
  const old = { ...m, info: { ...m.info, gameEndTimestamp: undefined, gameDuration: 1_500_000 } };
  check(normalizeMatch(old, ME).row.duration_seconds === 1500, "older matches report milliseconds and are converted");
  const hostile = { ...m, info: { ...m.info, participants: parts.map((p, i) => (i === 2 ? { ...p, championName: "<script>alert(1)</script>", kills: "9", goldEarned: 1e15 } : p)) } };
  const h = normalizeMatch(hostile, ME).row;
  check(!/[<>()]/.test(h.me.champion) && h.me.kills === 0 && h.me.gold <= 200000, "odd values are cleaned and clamped");
  const tl = { info: { frameInterval: 60000, frames: [
    { timestamp: 0, participantFrames: Object.fromEntries(parts.map((_, i) => [String(i + 1), { totalGold: 500, xp: 0, level: 1, minionsKilled: 0, jungleMinionsKilled: 0 }])), events: [] },
    { timestamp: 60000, participantFrames: Object.fromEntries(parts.map((_, i) => [String(i + 1), { totalGold: i + 1 <= 5 ? 700 : 600, xp: 300, level: 2, minionsKilled: 8, jungleMinionsKilled: 0 }])), events: [{ type: "CHAMPION_KILL", timestamp: 55000, killerId: 3, victimId: 8, assistingParticipantIds: [1], victimDamageDealt: [{ name: "x" }] }, { type: "ELITE_MONSTER_KILL", timestamp: 58000, killerTeamId: 100, monsterType: "DRAGON", monsterSubType: "FIRE_DRAGON" }, { type: "ITEM_PURCHASED", timestamp: 100 }] },
  ] } };
  const c = normalizeTimeline(tl, 3);
  check(c && c.frames.length === 2 && c.frames[1].blue === 3500 && c.frames[1].red === 3000 && c.frames[1].gold === 700 && c.frames[1].cs === 8 && c.events.length === 2 && c.events[0].killer === 3, "timeline: team gold per minute, owner gold and CS, kills and objectives only");
  check(normalizeTimeline({ info: { frames: [] } }, 3) === null, "empty timeline gives none");
}

// the key stays on the server: only lib/riot/index.ts and scripts may name RIOT_API_KEY; no NEXT_PUBLIC_ variant; never in built files
function walk(d, out = []) { for (const f of readdirSync(d)) { if (["node_modules", ".next", ".git"].includes(f)) continue; const p = join(d, f); statSync(p).isDirectory() ? walk(p, out) : /\.(tsx?|mjs|js)$/.test(f) && out.push(p); } return out; }
const files = [...walk("app"), ...walk("components"), ...walk("lib"), ...walk("content"), "middleware.ts", "next.config.ts"].filter(existsSync);
const users = files.filter((f) => /RIOT_API_KEY/.test(readFileSync(f, "utf8")));
check(users.every((f) => f === join("lib", "riot", "index.ts") || f === "next.config.ts" && false), `RIOT_API_KEY is read only in lib/riot/index.ts (found: ${users.join(", ") || "none"})`);
check(!files.some((f) => /NEXT_PUBLIC_RIOT/.test(readFileSync(f, "utf8"))), "no NEXT_PUBLIC_RIOT variable exists");
check(/^import "server-only"/.test(readFileSync("lib/riot/index.ts", "utf8")), "lib/riot/index.ts is server only");
const clientFiles = files.filter((f) => /^\s*["']use client["']/.test(readFileSync(f, "utf8")));
check(!clientFiles.some((f) => /lib\/riot|@\/lib\/riot/.test(readFileSync(f, "utf8"))), "no client component imports lib/riot");
if (existsSync(".next")) {
  const built = walk(".next").filter((f) => f.includes("/static/") );
  check(!built.some((f) => readFileSync(f, "utf8").includes("RIOT_API_KEY") || readFileSync(f, "utf8").includes("api.riotgames.com")), `no browser bundle names RIOT_API_KEY or the Riot host (${built.length} files checked)`);
}
console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
