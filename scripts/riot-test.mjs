// Tests the Riot client with a stub fetch and a fake clock (no network, no key). Also guards the key from client code.
//   npm run test:riot
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadRiot } from "./riot-load.mjs";
const { createRiotClient, RateLimiter, RiotError, parseRiotId, queueKind } = await loadRiot();
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const KEY = "RGAPI-test-secret-key-0000";
const PUUID = "p".repeat(78);

function fakeClock() { let t = 1_000_000; return { now: () => t, sleep: async (ms) => { t += ms; }, advance: (ms) => { t += ms; } }; }
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });

// parsing and queues
check(JSON.stringify(parseRiotId(" Faker#KR1 ")) === '{"gameName":"Faker","tagLine":"KR1"}', "parseRiotId accepts Name#TAG");
check(parseRiotId("nohash") === null && parseRiotId("#TAG") === null && parseRiotId("a/b#TAG1") === null && parseRiotId("Name#toolongtag") === null, "parseRiotId rejects malformed ids");
check(queueKind(420) === "ranked" && queueKind(0) === "custom" && queueKind(3140) === "practice" && queueKind(400) === "normal" && queueKind(9999) === "other", "queue kinds: ranked, custom, practice kept apart");

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
