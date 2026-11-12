// Rocket League replay link import: parsing, normalization, privacy and the whole pipeline, against stubs (no network, no database).
//   node scripts/rl-link-test.mjs            module checks
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<proxy ca> node --experimental-transform-types scripts/rl-link-test.mjs live   also one real read of a public replay through the Ballchasing API (read only, no names printed)
import { summarizeRl } from "../lib/ballchasing/summary.ts";
import { parseReplayRef, parseIdentity, normalizeReplay, runReplayImport, LIMITS, RL_DATA_LABEL } from "../lib/ballchasing/rl.ts";

let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const ID = "3b0a1e7c-1111-4222-8333-444455556666";

// ---- links
check(parseReplayRef(`https://ballchasing.com/replay/${ID}`).id === ID, "a full replay link is accepted");
check(parseReplayRef(`https://www.ballchasing.com/replay/${ID}/?x=1#top`).id === ID, "www, query, hash and trailing slash are accepted");
check(parseReplayRef(`ballchasing.com/replay/${ID.toUpperCase()}`).id === ID, "a link without a scheme, in capitals, is accepted");
check(parseReplayRef(ID).id === ID, "a bare replay id is accepted");
for (const [bad, why] of [
  [`http://ballchasing.com/replay/${ID}`, "plain http"], [`https://evil.com/replay/${ID}`, "another host"], [`https://ballchasing.com.evil.com/replay/${ID}`, "a look alike host"],
  [`https://user:pw@ballchasing.com/replay/${ID}`, "credentials in the link"], [`https://evil.com/?u=https://ballchasing.com/replay/${ID}`, "a link inside a query"],
  ["https://ballchasing.com/replay/not-a-uuid", "a malformed id"], ["https://ballchasing.com/group/" + ID, "a group link"], ["", "empty"], ["x".repeat(400), "huge input"], ["javascript:alert(1)", "a script scheme"],
]) check(!parseReplayRef(bad).ok, `rejected: ${why}`);

// ---- identity
check(JSON.stringify(parseIdentity("steam", "76561198000000001")) === JSON.stringify({ ok: true, platform: "steam", id: "76561198000000001" }), "a platform and id are accepted");
check(parseIdentity("", "https://ballchasing.com/player/epic/abc123def").platform === "epic", "a Ballchasing player link supplies the platform and id");
check(parseIdentity("ps5", "x1").platform === "ps4", "PlayStation 5 is stored as the PlayStation platform Ballchasing uses");
check(!parseIdentity("myspace", "x").ok && !parseIdentity("steam", "").ok && !parseIdentity("steam", "a b").ok && !parseIdentity("steam", "x".repeat(70)).ok, "unknown platforms, empty, spaced or oversized ids are rejected");

// ---- replay fixture (invented names and ids)
const P = (platform, id, name, goals, extra = {}) => ({ name, id: { platform, id }, car_name: "Octane", camera: { fov: 110 }, steering_sensitivity: 1.5,
  stats: { core: { score: 300, goals, assists: 1, saves: 2, shots: 4, shooting_percentage: 25, mvp: false, ...extra }, boost: { bpm: 400, bcpm: 380, avg_amount: 50 }, movement: { avg_speed: 1500, total_distance: 9999, percent_supersonic_speed: 12 }, positioning: { percent_defensive_third: 40 }, demo: { inflicted: 1, taken: 2 } } });
const replay = (over = {}) => ({
  id: ID, status: "ok", visibility: "unlisted", date: "2026-11-12T14:47:12Z", duration: 373, play_duration: 349, overtime: false, team_size: 3,
  playlist_id: "private", playlist_name: "Private Match", match_type: "Private", map_name: "Mannfield", uploader: { name: "UploaderName", steam_id: "99999999999999999", profile_url: "x", avatar: "y" },
  blue: { stats: { core: { goals: 3 } }, players: [P("steam", "76561198000000001", "Me Player", 2), P("epic", "aaaabbbbccccdddd", "Mate One", 1), P("ps4", "psn-mate-2", "Mate Two", 0)] },
  orange: { stats: { core: { goals: 1 } }, players: [P("xbox", "5551212", "Opp One", 1), P("steam", "76561198000000009", "Opp Two", 0), P("switch", "sw-3", "Opp Three", 0)] },
  ...over,
});
const me = { platform: "steam", id: "76561198000000001" };
let n = normalizeReplay(replay(), me);
check(n.ok && n.row.result === "win" && n.row.queue_kind === "custom" && n.row.external_id === ID && n.row.duration_seconds === 349, "a private match won 3 to 1 is stored as a custom win");
check(n.row.objectives.blue_goals === 3 && n.row.objectives.orange_goals === 1 && n.row.objectives.visibility === "unlisted", "match level facts are kept (score, visibility)");
check(n.row.me.core.goals === 2 && n.row.me.boost.bpm === 400 && n.row.me.slot === 0 && n.row.me.team === "blue", "the submitter's own numbers are kept in their slot");
const dump = JSON.stringify(n.row);
const secrets = ["Me Player", "Mate One", "Mate Two", "Opp One", "Opp Two", "Opp Three", "UploaderName", "76561198000000001", "aaaabbbbccccdddd", "psn-mate-2", "5551212", "76561198000000009", "sw-3", "99999999999999999", "Octane", "fov"];
check(secrets.every((s) => !dump.includes(s)), "no player name, platform id, uploader or car setting appears anywhere in the stored row (others are never identified)");
check(n.row.participants.length === 6 && n.row.participants.every((p) => Object.keys(p).sort().join() === "core,slot,team"), "all six players are anonymous slots with numbers only");
check(normalizeReplay(replay({ orange: { ...replay().orange, stats: { core: { goals: 5 } } } }), me).row.result === "loss", "a loss is recorded as a loss");
check(normalizeReplay(replay({ orange: { ...replay().orange, stats: { core: { goals: 3 } } } }), me).row.result === "remake", "a tie (for example a forfeit) is recorded as remake, not a win or loss");
check(normalizeReplay(replay({ playlist_id: "ranked-standard", playlist_name: "Ranked Standard", match_type: "Online" }), me).row.queue_kind === "ranked", "ranked playlists are ranked");
check(normalizeReplay(replay(), { platform: "STEAM", id: "76561198000000001" }).ok, "identity matching ignores case");
check(normalizeReplay(replay({ visibility: "public" }), me).ok && !normalizeReplay(replay({ visibility: "private" }), me).ok && normalizeReplay(replay({ visibility: "private" }), me).reason === "visibility", "public and unlisted are accepted, private is refused");
check(normalizeReplay(replay(), { platform: "steam", id: "000" }).reason === "not_in_replay", "an identity that is not in the replay is refused");
check(normalizeReplay(replay(), { platform: undefined, id: undefined }).reason === "not_in_replay" && normalizeReplay(replay(), null).reason === "not_in_replay", "a missing or empty identity never matches anyone");
const dup = replay(); dup.orange.players[1] = P("steam", "76561198000000001", "Clone", 0);
check(normalizeReplay(dup, me).reason === "ambiguous_identity", "an identity that appears twice is refused");
check(normalizeReplay(replay({ status: "pending" }), me).reason === "not_ok" && normalizeReplay(null, me).reason === "bad_shape" && normalizeReplay(replay({ date: "nope" }), me).reason === "bad_date", "unfinished, malformed and undated replays are refused");
check(RL_DATA_LABEL === "Player-submitted Ballchasing replay", "the data label is the founder approved wording");

// ---- the pipeline against an in-memory database
function fakeDb() {
  const t = { game_accounts: [], game_matches: [], import_jobs: [] };
  let seq = 0;
  const q = (name) => {
    const f = []; let op = "select", payload = null, head = false, want = null;
    const rows = () => t[name].filter((r) => f.every((fn) => fn(r)));
    const b = {
      select(_c, o) { if (op === "select") { head = !!o?.head; } want = true; return b; },
      insert(p) { op = "insert"; payload = p; return b; },
      update(p) { op = "update"; payload = p; return b; },
      eq(k, v) { f.push((r) => r[k] === v); return b; },
      in(k, vs) { f.push((r) => vs.includes(r[k])); return b; },
      gte(k, v) { f.push((r) => r[k] >= v); return b; },
      lt(k, v) { f.push((r) => r[k] < v); return b; },
      async maybeSingle() { return { data: rows()[0] ?? null, error: null }; },
      async single() { return run(true); },
      then(res, rej) { return run(false).then(res, rej); },
    };
    async function run(single) {
      if (op === "insert") {
        const row = { id: `id-${++seq}`, created_at: new Date().toISOString(), status: "queued", ...payload };
        if (name === "import_jobs" && row.provider === "ballchasing" && !row.consent_at) return { data: null, error: { code: "23514" } };
        if (name === "import_jobs" && t.import_jobs.some((j) => j.profile_id === row.profile_id && ["queued", "running"].includes(j.status))) return { data: null, error: { code: "23505" } };
        if (name === "game_matches" && t.game_matches.some((m) => m.profile_id === row.profile_id && m.game === row.game && m.external_id === row.external_id)) return { data: null, error: { code: "23505" } };
        t[name].push(row); return { data: single ? { id: row.id } : [row], error: null };
      }
      if (op === "update") { rows().forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; }
      const r = rows(); return { data: head ? null : r, count: r.length, error: null };
    }
    return b;
  };
  return { t, from: q };
}
const U = "user-1";
const seed = (db) => db.t.game_accounts.push({ id: "acc-1", profile_id: U, game: "ROCKET_LEAGUE", provider: "rocket_league", platform: "steam", external_id: "76561198000000001" });
const okClient = (d = replay()) => ({ details: async () => d, ping: async () => true });
const run = (db, client, input = `https://ballchasing.com/replay/${ID}`, o = {}) => runReplayImport({ admin: db, client }, U, input, { authorized: true, consent: true, via: "web", ...o });

let db = fakeDb(); seed(db);
let r = await run(db, okClient());
check(r.ok && r.imported && db.t.game_matches.length === 1 && db.t.game_matches[0].source === "api" && db.t.game_matches[0].source_detail === "ballchasing_replay", "a valid submission stores one match labeled as a Ballchasing replay (source api)");
check(db.t.import_jobs[0].status === "succeeded" && db.t.import_jobs[0].submitted_via === "web" && !!db.t.import_jobs[0].consent_at && db.t.import_jobs[0].external_ref === ID, "the job records success, channel, confirmation time and the replay");
r = await run(db, okClient());
check(r.ok && r.code === "already" && db.t.game_matches.length === 1, "submitting the same replay again saves nothing new and says so");
db = fakeDb(); seed(db); let calls = 0;
r = await run(db, { details: async () => { calls++; return replay(); }, ping: async () => true }, ID, { via: "discord" });
check(r.ok && calls === 1 && db.t.import_jobs[0].submitted_via === "discord", "a bare id and the Discord channel work, with one Ballchasing read");
db = fakeDb(); seed(db); calls = 0;
const spy = { details: async () => { calls++; return replay(); }, ping: async () => true };
await run(db, spy); await run(db, spy); check(calls === 1, "a duplicate is detected before spending another Ballchasing read");

db = fakeDb(); seed(db);
r = await run(db, okClient(), `https://ballchasing.com/replay/${ID}`, { authorized: false });
check(!r.ok && r.code === "consent_required" && db.t.import_jobs.length === 0 && db.t.game_matches.length === 0, "without the authorization confirmation nothing is read, stored or recorded");
r = await run(db, okClient(), `https://ballchasing.com/replay/${ID}`, { consent: false });
check(r.code === "consent_required" && db.t.import_jobs.length === 0, "without the processing consent nothing is read, stored or recorded");
r = await run(db, okClient(), "https://evil.example/replay/x");
check(r.code === "invalid_link" && db.t.import_jobs.length === 0, "an invalid link is refused before anything else");
db = fakeDb();
r = await run(db, okClient());
check(r.code === "no_identity" && db.t.game_matches.length === 0, "without a Rocket League identity nothing is stored, and the message says what to add");
db = fakeDb(); seed(db);
r = await run(db, okClient(replay({ visibility: "private" })));
check(!r.ok && r.code === "visibility" && /unlisted or public/.test(r.message) && db.t.game_matches.length === 0 && db.t.import_jobs[0].status === "failed", "a private replay is rejected with an explanation, and the failure is visible on the job");
db = fakeDb(); seed(db);
r = await run(db, { details: async () => { throw Object.assign(new Error("x"), { code: "auth" }); }, ping: async () => true });
check(r.code === "private" && db.t.game_matches.length === 0, "a replay Ballchasing will not release is explained as a visibility problem when the token itself works");
db = fakeDb(); seed(db);
r = await run(db, { details: async () => { throw Object.assign(new Error("x"), { code: "auth" }); }, ping: async () => { throw new Error("bad token"); } });
check(r.code === "not_configured", "a failing token is reported as a server configuration problem, not blamed on the player");
db = fakeDb(); seed(db);
r = await run(db, { details: async () => { throw Object.assign(new Error("x"), { code: "not_found" }); }, ping: async () => true });
check(r.code === "not_found", "a missing replay is reported as not found");
db = fakeDb(); seed(db);
r = await run(db, okClient(), `https://ballchasing.com/replay/${ID}`);
db.t.game_accounts[0].external_id = "76561198000000099";
r = await run(db, okClient(replay({ id: "3b0a1e7c-1111-4222-8333-000000000002" })), "3b0a1e7c-1111-4222-8333-000000000002");
check(r.code === "not_in_replay" && /nothing was saved/.test(r.message) && db.t.game_matches.length === 1, "a replay the player was not in is refused and saves nothing");

// ---- no team needed: the fake database has no team tables at all, and the whole flow still works
db = fakeDb(); seed(db);
check(!("teams" in db.t) && !("team_members" in db.t), "the stand-in database has no team tables");
r = await run(db, okClient());
check(r.ok && db.t.game_matches.length === 1, "a player with no team (no team table exists) submits and stores a replay");

// ---- identity: two accounts claiming one Rocket League identity each see only their own private rows
db = fakeDb(); seed(db);
db.t.game_accounts.push({ id: "acc-2", profile_id: "user-2", game: "ROCKET_LEAGUE", provider: "rocket_league", platform: "steam", external_id: "76561198000000001" });
await run(db, okClient());
r = await runReplayImport({ admin: db, client: okClient() }, "user-2", `https://ballchasing.com/replay/${ID}`, { authorized: true, consent: true, via: "web" });
check(db.t.game_matches.length === 2 && db.t.game_matches.every((m) => m.profile_id !== undefined) && new Set(db.t.game_matches.map((m) => m.profile_id)).size === 2, "if two accounts claim the same identity, each stores a separate private row (nothing is shared or merged)");

// ---- longitudinal and side context (individual history, with other players kept anonymous)
const mk = (day, res, kind, goals, shots, mine = { team: "blue" }) => ({ queue_kind: kind, played_at: `2026-11-${day}T10:00:00Z`, duration_seconds: 330, result: res,
  me: { ...mine, core: { score: 300, goals, assists: 1, saves: 1, shots } },
  participants: [{ slot: 0, team: "blue", core: { goals, shots } }, { slot: 1, team: "blue", core: { goals: 1, shots: 2 } }, { slot: 2, team: "orange", core: { goals: 1, shots: 4 } }] });
const hist = [mk("14", "loss", "custom", 0, 2), mk("12", "win", "custom", 2, 4), mk("13", "remake", "custom", 1, 3), mk("15", "win", "ranked", 3, 5)];
const sm = summarizeRl(hist, "all");
check(sm.series.map((x) => x.playedAt.slice(8, 10)).join() === "12,13,14,15", "history is ordered by when each replay was played, not when it was submitted");
check(sm.games === 4 && sm.wins === 2 && sm.losses === 1 && Math.round(sm.winRate * 100) === 67, "a no result game is counted as a game but not in the win rate");
check(summarizeRl(hist, "ranked").games === 1 && summarizeRl(hist, "custom").games === 3, "match types are not mixed unless all is chosen");
check(sm.smallSample === true, "fewer than five games is flagged as a small sample");
check(sm.team.games === 4 && sm.team.teamGoalsAgainst === 1 && Math.round(sm.team.yourShareOfTeamGoals) === Math.round((6 / (6 + 4)) * 100), "side totals and your share come from slot totals");
check(summarizeRl([{ ...mk("12", "win", "custom", 1, 1), participants: undefined }], "all").team === null, "without stored slots there is simply no side context");
check(summarizeRl([], "all") === null, "no games gives no summary");

// ---- limits
db = fakeDb(); seed(db);
for (let i = 0; i < LIMITS.perUserHour; i++) db.t.import_jobs.push({ id: `old-${i}`, profile_id: U, provider: "ballchasing", status: "succeeded", created_at: new Date().toISOString() });
r = await run(db, okClient());
check(r.code === "rate_user", `more than ${LIMITS.perUserHour} submissions an hour from one player is refused`);
db = fakeDb(); seed(db);
for (let i = 0; i < LIMITS.allUsersHour; i++) db.t.import_jobs.push({ id: `g-${i}`, profile_id: `other-${i}`, provider: "ballchasing", status: "succeeded", created_at: new Date().toISOString() });
r = await run(db, okClient());
check(r.code === "rate_global" && db.t.game_matches.length === 0, "when all players together approach Ballchasing's hourly read limit, new submissions wait");
db = fakeDb(); seed(db);
db.t.import_jobs.push({ id: "busy", profile_id: U, provider: "ballchasing", status: "running", created_at: new Date().toISOString() });
r = await run(db, okClient());
check(r.code === "busy", "only one submission per player runs at a time");
db = fakeDb(); seed(db);
db.t.import_jobs.push({ id: "stale", profile_id: U, provider: "ballchasing", status: "running", created_at: new Date(Date.now() - 3_600_000).toISOString() });
r = await run(db, okClient());
check(r.ok && db.t.import_jobs.find((j) => j.id === "stale").status === "failed", "a job left running by a crash is closed out so it cannot block the player");

// ---- live (optional): one real read, structure only
if (process.argv[2] === "live") {
  const { createBallchasingClient } = await import("../lib/ballchasing/core.ts");
  // In the sandbox the network proxy adds the real Ballchasing credential when a request has no Authorization header, so that
  // header is dropped here. On a machine with BALLCHASING_API_TOKEN set, the client sends it as in production.
  const token = process.env.BALLCHASING_API_TOKEN;
  const client = createBallchasingClient({ token: token || "sandbox", fetch: token ? undefined : (url, init) => fetch(url, { ...init, headers: {} }) });
  const list = await client.list({ playlist: ["ranked-doubles"], count: 1 });
  const d = await client.details(list.list[0].id);
  const pl = d.blue.players[0].id;
  const live = normalizeReplay(d, { platform: pl.platform, id: pl.id });
  check(live.ok && live.row.participants.length === d.blue.players.length + d.orange.players.length && Object.keys(live.row.me.core).length > 5, "LIVE: a real public replay normalizes (one read, uses the read limit, not the upload quota)");
  const ld = JSON.stringify(live.row);
  const names = [...d.blue.players, ...d.orange.players].flatMap((p) => [p.name, p.id.id]).filter((s) => s && s.length > 3);
  check(names.every((s) => !ld.includes(s)), "LIVE: no real player name or id appears in the stored row");
  check(Buffer.byteLength(JSON.stringify(live.row.me)) < 8000 && Buffer.byteLength(JSON.stringify(live.row.participants)) < 40000 && Buffer.byteLength(JSON.stringify(live.row.objectives)) < 4000, "LIVE: the row fits the database size limits");
}
console.log(failed ? `\n${failed} FAILED` : "\nAll Rocket League import checks passed.");
process.exit(failed ? 1 : 0);
