// Tests lib/riot/import.ts (the import job) with a stub Riot API and an in-memory stand in for the database.
//   node scripts/riot-import-test.mjs
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const ts = createRequire(import.meta.url)("typescript");
const dir = mkdtempSync(join(tmpdir(), "riot-import-"));
const tr = (f) => ts.transpileModule(readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
for (const n of ["core", "queues", "normalize"]) writeFileSync(join(dir, `${n}.mjs`), tr(`lib/riot/${n}.ts`).replace(/from "\.\/(\w+)"/g, 'from "./$1.mjs"'));
const core = await import(pathToFileURL(join(dir, "core.mjs")).href);
let currentClient = null;
writeFileSync(join(dir, "index.mjs"), "export const riotClient = () => globalThis.__riot;");
writeFileSync(join(dir, "import.mjs"), tr("lib/riot/import.ts").replace('import "server-only";', "").replace(/from "\.\/(\w+)"/g, 'from "./$1.mjs"'));
const { runLolImport } = await import(pathToFileURL(join(dir, "import.mjs")).href);

let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };

function fakeDb() {
  const t = { import_jobs: [], game_accounts: [], game_matches: [] };
  let seq = 0;
  const from = (name) => {
    let op = "select", payload, filters = [], single = false;
    const b = {
      select() { return b; },
      insert(p) { op = "insert"; payload = p; return b; },
      update(p) { op = "update"; payload = p; return b; },
      eq(k, v) { filters.push((r) => r[k] === v); return b; },
      in(k, v) { filters.push((r) => v.includes(r[k]) || (k === "status" && v.includes(r.status))); return b; },
      lt() { filters.push(() => false); return b; },
      maybeSingle() { single = "maybe"; return b; },
      single() { single = "one"; return b; },
      then(res, rej) {
        let out;
        const rows = t[name].filter((r) => filters.every((f) => f(r)));
        if (op === "insert") {
          if (name === "import_jobs" && t.import_jobs.some((j) => ["queued", "running"].includes(j.status))) out = { data: null, error: { code: "23505", message: "dup" } };
          else if (name === "game_matches" && t.game_matches.some((m) => m.external_id === payload.external_id)) out = { data: null, error: { code: "23505", message: "dup" } };
          else { const row = { id: `id${++seq}`, ...payload }; t[name].push(row); out = { data: single ? row : [row], error: null }; }
        } else if (op === "update") { rows.forEach((r) => Object.assign(r, payload)); out = { data: null, error: null }; }
        else out = { data: single ? rows[0] ?? null : rows, error: null };
        return Promise.resolve(out).then(res, rej);
      },
    };
    return b;
  };
  return { t, db: { from } };
}

const PUUID = "u".repeat(78);
const part = (i, puuid) => ({ participantId: i, puuid, teamId: i <= 5 ? 100 : 200, championName: "Ahri", teamPosition: "MIDDLE", champLevel: 15, kills: 4, deaths: 3, assists: 6, totalMinionsKilled: 150, neutralMinionsKilled: 10, goldEarned: 10000, totalDamageDealtToChampions: 20000, totalDamageTaken: 14000, visionScore: 25, win: i <= 5 });
const matchFor = (id, queueId) => ({ metadata: { matchId: id }, info: { gameStartTimestamp: 1_760_000_000_000, gameEndTimestamp: 1_760_001_500_000, gameDuration: 1500, queueId, gameVersion: "15.20.1", participants: Array.from({ length: 10 }, (_, k) => part(k + 1, k === 0 ? PUUID : "o" + k)), teams: [] } });
const timeline = { info: { frameInterval: 60000, frames: [{ timestamp: 0, participantFrames: {}, events: [] }, { timestamp: 60000, participantFrames: { 1: { totalGold: 600, minionsKilled: 5 } }, events: [] }] } };
const json = (b, s = 200, h = {}) => new Response(JSON.stringify(b), { status: s, headers: h });
const clock = { now: () => Date.now(), sleep: async () => {} };

function stubRiot(handler) {
  globalThis.__riot = core.createRiotClient({ apiKey: "RGAPI-test", clock, maxRetries: 1, fetch: async (url) => handler(new URL(url)) });
}
const ids = ["EUW1_7000000001", "EUW1_7000000002", "EUW1_7000000003"];
const normalHandler = (u) => {
  if (u.pathname.includes("/accounts/by-riot-id/")) return u.pathname.endsWith("/Ghost/EUW") ? json({}, 404) : json({ puuid: PUUID, gameName: "Mia", tagLine: "EUW" });
  if (u.pathname.endsWith("/ids")) return json(ids);
  if (u.pathname.endsWith("/timeline")) return json(timeline);
  const id = u.pathname.split("/").pop();
  return json(matchFor(id, id === ids[1] ? 0 : id === ids[2] ? 420 : 400));
};

// 1. successful import, custom game skipped by default
{
  stubRiot(normalHandler);
  const { t, db } = fakeDb();
  const r = await runLolImport(db, "user1", { gameName: "Mia", tagLine: "EUW" }, "europe", 20);
  check(r.ok && r.imported === 2 && r.skippedCustom === 1, `imports 2 matches and skips the custom game (${r.message})`);
  check(t.game_matches.every((m) => m.source === "api" && m.profile_id === "user1" && m.game === "LOL"), 'every stored match has source "api", the owner and game LOL');
  check(t.game_matches.some((m) => m.queue_kind === "ranked") && t.game_matches.some((m) => m.queue_kind === "normal") && !t.game_matches.some((m) => m.queue_kind === "custom"), "ranked and normal kept apart; no custom stored");
  check(t.game_matches.every((m) => m.timeline && m.timeline.frames.length === 2), "timelines stored");
  const s = JSON.stringify(t.game_matches);
  check(!s.includes(PUUID) && !s.includes("RGAPI"), "stored matches hold no PUUID and no key");
  check(t.game_accounts.length === 1 && t.game_accounts[0].external_id === PUUID && t.game_accounts[0].ownership_verified === undefined, "Riot account linked once; ownership is not claimed verified");
  check(t.import_jobs[0].status === "succeeded" && t.import_jobs[0].imported === 2 && t.import_jobs[0].skipped_custom === 1, "job recorded as succeeded with counts");
  // 2. importing again stores nothing twice
  const r2 = await runLolImport(db, "user1", { gameName: "Mia", tagLine: "EUW" }, "europe", 20);
  check(r2.ok && r2.imported === 0 && r2.skippedExisting === 2 && t.game_matches.length === 2 && t.game_accounts.length === 1, "importing again adds no duplicates");
  // 3. a different Riot ID cannot be linked on top
  stubRiot((u) => (u.pathname.includes("/accounts/") ? json({ puuid: "z".repeat(78), gameName: "Other", tagLine: "EUW" }) : normalHandler(u)));
  const r3 = await runLolImport(db, "user1", { gameName: "Other", tagLine: "EUW" }, "europe", 20);
  check(!r3.ok && /different Riot ID/.test(r3.message) && t.game_matches.length === 2, "a second Riot ID is refused until the first is removed");
}
// 4. custom games stored when the server allows it
{
  process.env.RIOT_CUSTOM_GAMES_ENABLED = "true";
  stubRiot(normalHandler);
  const { t, db } = fakeDb();
  const r = await runLolImport(db, "user1", { gameName: "Mia", tagLine: "EUW" }, "europe", 20);
  check(r.imported === 3 && t.game_matches.filter((m) => m.queue_kind === "custom").length === 1, "with RIOT_CUSTOM_GAMES_ENABLED the custom game is stored and tagged custom");
  delete process.env.RIOT_CUSTOM_GAMES_ENABLED;
}
// 5. clear errors
for (const [name, handler, re] of [
  ["unknown Riot ID", () => json({}, 404), /no player with that Riot ID/],
  ["rejected key", () => json({}, 403), /not working/],
  ["rate limited", () => json({}, 429, { "retry-after": "1" }), /limiting requests/],
  ["Riot down", () => json({}, 503), /not responding/],
]) {
  stubRiot(handler);
  const { t, db } = fakeDb();
  const r = await runLolImport(db, "user1", { gameName: "Ghost", tagLine: "EUW" }, "europe", 20);
  check(!r.ok && re.test(r.message) && t.import_jobs[0].status === "failed" && t.game_matches.length === 0, `${name}: clear message, job failed, nothing stored`);
}
// 6. a bad single match does not stop the import
{
  stubRiot((u) => (u.pathname.endsWith(ids[0]) ? json({ junk: true }) : normalHandler(u)));
  const { t, db } = fakeDb();
  const r = await runLolImport(db, "user1", { gameName: "Mia", tagLine: "EUW" }, "europe", 20);
  check(r.ok && r.failedMatches === 1 && r.imported === 1, "one unreadable match is counted and the rest import");
}
// 7. only one active job at a time; missing key
{
  stubRiot(normalHandler);
  const { t, db } = fakeDb();
  t.import_jobs.push({ id: "x", status: "running", profile_id: "user1", created_at: new Date().toISOString() });
  const r = await runLolImport(db, "user1", { gameName: "Mia", tagLine: "EUW" }, "europe", 20);
  check(!r.ok && /already running/.test(r.message), "a second import while one is running is refused");
  globalThis.__riot = null;
  const r2 = await runLolImport(fakeDb().db, "user1", { gameName: "Mia", tagLine: "EUW" }, "europe", 20);
  check(!r2.ok && /not configured/.test(r2.message), "no key configured: clear message");
}
console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
