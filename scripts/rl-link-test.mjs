// Rocket League replay link import: parsing, normalization, privacy and the whole pipeline, against stubs (no network, no database).
//   node scripts/rl-link-test.mjs            module checks
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<proxy ca> node --experimental-transform-types scripts/rl-link-test.mjs live   also one real read of a public replay through the Ballchasing API (read only, no names printed)
import { summarizeRl } from "../lib/ballchasing/summary.ts";
import { parseReplayRef, parseIdentity, normalizeReplay, runReplayImport, sweepStaleJobs, messageFor, IDENTITY_MESSAGES, platformLabel, PLATFORM_OPTIONS, LIMITS, RL_DATA_LABEL } from "../lib/ballchasing/rl.ts";

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
check(JSON.stringify(parseIdentity("steam", "76561198000000001")) === JSON.stringify({ ok: true, platform: "steam", id: "76561198000000001", source: "manual" }), "a platform and id are accepted");
check(parseIdentity("", "https://ballchasing.com/player/epic/0123456789abcdef0123456789abcdef").platform === "epic", "a Ballchasing player link supplies the platform and id");
check(parseIdentity("ps5", "x1").reason === "unknown_platform" && parseIdentity("playstation", "x1").reason === "unknown_platform", "a PlayStation platform is never guessed from a vague name: ps4 and psynet are different identities");
check(!parseIdentity("myspace", "x").ok && !parseIdentity("steam", "").ok && !parseIdentity("xbox", "a b").ok && !parseIdentity("xbox", "x".repeat(70)).ok, "unknown platforms, empty, spaced or oversized ids are rejected");

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
check(r.code === "not_ballchasing" && db.t.import_jobs.length === 0, "an invalid link is refused before anything else");
db = fakeDb();
r = await run(db, okClient());
check(r.code === "no_identity" && db.t.game_matches.length === 0, "without a Rocket League identity nothing is stored, and the message says what to add");
db = fakeDb(); seed(db);
r = await run(db, okClient(replay({ visibility: "private" })));
check(!r.ok && r.code === "visibility" && /Unlisted or Public/.test(r.message) && db.t.game_matches.length === 0 && db.t.import_jobs[0].status === "failed", "a private replay is rejected with an explanation, and the failure is visible on the job");
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

// =====================================================================================================================
// Regression tests for the pilot fixes (2026-11-13). Platform values and id shapes are the ones seen in 600 real public replays:
// epic (32 hex), steam (17 digits), ps4 (9 to 11 digits), psynet (16 hex), xbox (16 hex), and slots with no platform or id.
// =====================================================================================================================
const EPIC = "0123456789abcdef0123456789abcdef", STEAM = "76561198012345678", PS4 = "1234567890", PSYNET = "89abcdef01234567", XBOX = "2535412345678901";
const mixed = (over = {}) => ({
  id: ID, status: "ok", visibility: "public", date: "2026-11-12T14:47:12Z", play_duration: 349, overtime: false, team_size: 3,
  playlist_id: "private", playlist_name: "Private Match", match_type: "Private", map_name: "Mannfield",
  blue: { stats: { core: { goals: 3 } }, players: [P("epic", EPIC, "Epic Person", 2), P("steam", STEAM, "Steam Person", 1), P("ps4", PS4, "Ps Person", 0)] },
  orange: { stats: { core: { goals: 1 } }, players: [P("psynet", PSYNET, "Psn Person", 1), P("xbox", XBOX, "Xbox Person", 0), P(undefined, undefined, "Bot Alpha", 0)] },
  ...over,
});
const NAMES = ["Epic Person", "Steam Person", "Ps Person", "Psn Person", "Xbox Person", "Bot Alpha"];
for (const [plat, id, slot] of [["epic", EPIC, 0], ["steam", STEAM, 1], ["ps4", PS4, 2], ["psynet", PSYNET, 3], ["xbox", XBOX, 4]]) {
  const m = normalizeReplay(mixed(), { platform: plat, id });
  check(m.ok && m.row.me.slot === slot && m.row.participants.length === 6, `${plat}: the player is matched to their own slot (${slot}) in a replay with every platform`);
  check(m.ok && !NAMES.some((n) => JSON.stringify(m.row).includes(n)), `${plat}: no other player's name appears in the stored row`);
}
check(!normalizeReplay(mixed(), { platform: "ps4", id: PSYNET }).ok && !normalizeReplay(mixed(), { platform: "psynet", id: PS4 }).ok, "ps4 and psynet never match each other's ids");
let nf = normalizeReplay(mixed(), { platform: "ps4", id: PSYNET });
check(nf.reason === "not_in_replay" && nf.info.foundOnPlatform === "psynet" && /under the platform "psynet"/.test(messageFor("not_in_replay", nf.info)), "an id found under a different platform is explained, using only the submitter's own id");
nf = normalizeReplay(mixed(), { platform: "steam", id: "76561198000000000" });
check(nf.reason === "not_in_replay" && nf.info.slotsWithoutId === 1 && nf.info.totalSlots === 6 && /1 of 6 players in this replay have no ID recorded/.test(messageFor("not_in_replay", nf.info)) && /will not guess/.test(messageFor("not_in_replay", nf.info)), "a missing player id is explained with counts only, and Victress says it will not guess");
check(!NAMES.some((n) => messageFor("not_in_replay", nf.info).includes(n)) && !messageFor("not_in_replay", nf.info).includes(EPIC), "the explanation names nobody and shows no other player's id");
check(!normalizeReplay(mixed(), { platform: "", id: "" }).ok && !normalizeReplay(mixed(), { platform: "epic", id: "" }).ok, "an empty identity never matches the slot with no id");
// identity parsing for every platform
for (const [plat, id] of [["epic", EPIC], ["steam", STEAM], ["ps4", PS4], ["psynet", PSYNET], ["xbox", XBOX]]) {
  const viaLink = parseIdentity("", `https://ballchasing.com/player/${plat}/${id}`);
  check(viaLink.ok && viaLink.platform === plat && viaLink.id === id && viaLink.source === "link", `${plat}: a Ballchasing player link is accepted and keeps the platform exactly`);
  const manual = parseIdentity(plat, id);
  check(manual.ok && manual.platform === plat && manual.source === "manual", `${plat}: platform and id entered by hand are accepted`);
}
check(parseIdentity("", "ballchasing.com/player/ps5/987654321").platform === "ps5", "a platform Victress has never seen is accepted from a player link (extensible), as Ballchasing reports it");
check(parseIdentity("", "https://ballchasing.com/player/Steam/" + STEAM).platform === "steam", "platform names from a link are case insensitive");
check(parseIdentity("steam", "").reason === "empty" && parseIdentity("", STEAM).reason === "missing_platform", "no default platform: an id without a platform is refused until one is chosen");
check(parseIdentity("steam", "SomeSteamName").reason === "steam_format" && /17 digits/.test(IDENTITY_MESSAGES.steam_format), "a Steam name instead of the id is explained");
check(parseIdentity("epic", "MyEpicName").reason === "epic_format" && /32 letters and numbers/.test(IDENTITY_MESSAGES.epic_format), "an Epic display name instead of the id is explained");
check(parseIdentity("", `https://ballchasing.com/replay/${ID}`).reason === "needs_player_link" && /player link/.test(IDENTITY_MESSAGES.needs_player_link), "a replay link pasted as the identity is explained");
check(parseIdentity("", "https://ballchasing.com/player/not valid/x").ok === false, "a malformed player link is refused");
check(PLATFORM_OPTIONS.map((o) => o.value).join() === "steam,epic,xbox,ps4,psynet,switch" && platformLabel("psynet") === "PlayStation Network (psynet)" && platformLabel("ps5") === "ps5", "the platform list includes psynet, and an unlisted platform still shows its own name");
check(!/steam/i.test(IDENTITY_MESSAGES.missing_platform + IDENTITY_MESSAGES.empty + IDENTITY_MESSAGES.unknown_platform), "nothing in the identity prompts assumes Steam");

// replay link messages
for (const [input, reason, rx, label] of [
  ["", "empty", /Paste a Ballchasing replay link/, "an empty box"],
  [`https://ballchasing.com/group/abcd1234`, "group", /group link, not a single replay/, "a group link"],
  [`https://ballchasing.com/player/steam/${STEAM}`, "player", /player link, not a replay/, "a player link"],
  [`https://ballchasing.com/replay/not-a-valid-id`, "replay_id", /not valid/, "a broken replay id"],
  [`https://example.com/replay/${ID}`, "not_ballchasing", /not a Ballchasing replay link/, "another website"],
  [`http://ballchasing.com/replay/${ID}`, "not_ballchasing", /https:\/\/ballchasing\.com\/replay/, "plain http"],
]) {
  const pr = parseReplayRef(input);
  check(!pr.ok && pr.reason === reason && rx.test(messageFor(reason)), `link message: ${label} gets its own explanation`);
}
check(/Unlisted or Public/.test(messageFor("private")) && /Edit/.test(messageFor("private")) && /Unlisted or Public/.test(messageFor("not_found")) && /private/.test(messageFor("not_found")), "private and missing replays both tell the player to set the replay to Unlisted or Public");
check(/finished processing|could not process/.test(messageFor("not_ok")) && /unsupported or unfinished/.test(messageFor("bad_shape")), "unfinished and unsupported replays are explained");
{
  const d = fakeDb(); seed(d);
  const rr = await run(d, okClient(mixed({ visibility: "private" })));
  check(rr.code === "visibility" && /Unlisted or Public/.test(rr.message) && d.t.game_matches.length === 0, "a private replay: refused with the instruction, nothing stored");
  const g = await run(d, okClient(), `https://ballchasing.com/group/xyz`);
  check(g.code === "group" && d.t.import_jobs.length === 1, "a group link is refused before anything is read or recorded");
  const unsup = await run(d, okClient(mixed({ status: "failed" })));
  check(unsup.code === "not_ok" && d.t.game_matches.length === 0, "a replay Ballchasing failed to process is refused");
  const dup = fakeDb(); dup.t.game_accounts.push({ id: "a", profile_id: U, game: "ROCKET_LEAGUE", provider: "rocket_league", platform: "psynet", external_id: PSYNET });
  const okp = await run(dup, okClient(mixed({ visibility: "unlisted" })));
  check(okp.ok && dup.t.game_matches[0].me.slot === 3, "an unlisted replay is accepted for a psynet player");
  const again = await run(dup, okClient(mixed()));
  check(again.code === "already" && dup.t.game_matches.length === 1, "the same replay again (now public) is still detected as a duplicate");
}

// deadline: a hung Ballchasing read must end in a clear failure, never a job stuck running
{
  const d = fakeDb(); seed(d);
  const hung = { details: () => new Promise(() => {}), ping: async () => true };
  const t0 = Date.now();
  const hr = await runReplayImport({ admin: d, client: hung, deadlineMs: 120 }, U, `https://ballchasing.com/replay/${ID}`, { authorized: true, consent: true, via: "discord" });
  check(!hr.ok && hr.code === "timeout" && /took too long/.test(hr.message) && Date.now() - t0 < 2000, "a hung Ballchasing read ends at the deadline with a clear message");
  check(d.t.import_jobs.length === 1 && d.t.import_jobs[0].status === "failed" && d.t.import_jobs[0].error_code === "timeout" && d.t.game_matches.length === 0, "the job is closed as failed (timeout) and nothing is saved");
  const late = fakeDb(); seed(late);
  const slow = { details: () => new Promise((res) => setTimeout(() => res(replay()), 250)), ping: async () => true };
  const lr = await runReplayImport({ admin: late, client: slow, deadlineMs: 100 }, U, `https://ballchasing.com/replay/${ID}`, { authorized: true, consent: true, via: "web" });
  await new Promise((r) => setTimeout(r, 400));
  check(lr.code === "timeout" && late.t.game_matches.length === 0 && late.t.import_jobs[0].status === "failed", "work that finishes after the deadline is discarded, so the player is never told two different things");
}
// abandoned jobs
{
  const d = fakeDb(); seed(d);
  d.t.import_jobs.push({ id: "old", profile_id: U, provider: "ballchasing", status: "running", created_at: new Date(Date.now() - 4 * 60_000).toISOString() },
    { id: "fresh", profile_id: U, provider: "ballchasing", status: "running", created_at: new Date(Date.now() - 30_000).toISOString() });
  await sweepStaleJobs(d, U);
  const by = Object.fromEntries(d.t.import_jobs.map((j) => [j.id, j.status]));
  check(by.old === "failed" && by.fresh === "running" && d.t.import_jobs.find((j) => j.id === "old").error_code === "timeout", "a job abandoned for over 3 minutes is closed as failed; a fresh one is left alone");
  const r3 = await run(d, okClient(), ID);
  check(r3.code === "busy", "a genuinely running job still blocks a second submission");
}

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
