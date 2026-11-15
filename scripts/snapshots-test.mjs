// Claimable snapshots and Steam verification: the snapshot builder (own side only, exact ids), the keyed hash, the result card, the
// pipeline step that stores snapshots (keys only, never ids), and the Steam OpenID checks. Stubs only: no network, no database.
//   node scripts/snapshots-test.mjs
import { runReplayImport, cardText } from "../lib/ballchasing/rl.ts";
import { snapshotSlots, teamScrimFromReplay, sharingMembers } from "../lib/ballchasing/team.ts";
import { claimKeyFn } from "../lib/claim-core.ts";
import { steamConfig, steamLoginUrl, steamStateCookie, verifySteamCallback, STEAM_OPENID } from "../lib/steam/core.ts";

let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const ID = "3b0a1e7c-1111-4222-8333-444455556666";
const P = (platform, id, name, goals) => ({ name, id: { platform, id }, stats: { core: { score: 300 + goals * 100, goals, assists: 1, saves: 2, shots: goals + 2 } } });
const replay = () => ({
  id: ID, status: "ok", visibility: "unlisted", date: "2026-11-12T14:47:12Z", duration: 373, play_duration: 349, overtime: false, team_size: 3, playlist_id: "private",
  blue: { name: "Blue Squad", stats: { core: { goals: 3 } }, players: [P("steam", "76561198000000001", "Me Player", 2), P("epic", "aaaabbbbccccddddeeeeffff00001111", "Mate One", 1), P("ps4", "", "No Id Mate", 0)] },
  orange: { name: "Rival Club", stats: { core: { goals: 1 } }, players: [P("xbox", "5551212", "Opp One", 1), P("steam", "76561198000000009", "Opp Two", 0)] },
});
const me = { platform: "steam", id: "76561198000000001" };

// ---- snapshot candidates
const slots = snapshotSlots(replay(), me);
check(slots.length === 2 && slots[0].platform === "steam" && slots[0].id === "76561198000000001" && slots[1].platform === "epic" && slots[1].id === "aaaabbbbccccddddeeeeffff00001111", "a snapshot for every player on the submitting side who has a platform id, the submitter included");
check(!slots.some((s) => s.id === "5551212" || s.id === "76561198000000009"), "opponents never get a snapshot");
check(Object.keys(slots[1].stats).sort().join() === "assists,goals,saves,score,shots" && slots[1].stats.goals === 1 && slots.every((x) => typeof x.mvp === "boolean"), "a snapshot holds the five numbers and the MVP flag only");
check(!JSON.stringify(slots).includes("Mate One"), "no name is carried");
check(snapshotSlots(replay(), { platform: "steam", id: "1" }).length === 0 && snapshotSlots(null, me).length === 0, "a submitter not in the replay, or a malformed replay, gives no snapshots");

// ---- keyed hash: exact, secret dependent, absent without a secret
const key = claimKeyFn({ VICTRESS_CLAIM_KEY: "k".repeat(40) });
check(claimKeyFn({}) === null && claimKeyFn({ VICTRESS_CLAIM_KEY: "short" }) === null, "no secret (or a short one): no keys, so no snapshots and no claims");
check(/^[0-9a-f]{64}$/.test(key("epic", "abc")) && key("epic", "abc") === key("epic", "abc"), "the key is 64 hex characters and stable");
check(key("epic", "abc") !== key("epic", "ABC") && key("epic", "abc") !== key("steam", "abc") && key("epic", "abc") !== key("epic", "abc "), "exact matching only: case, platform and whitespace all change the key");
check(key("epic", "abc") !== claimKeyFn({ VICTRESS_CLAIM_KEY: "j".repeat(40) })("epic", "abc"), "the key depends on the server secret (it cannot be recomputed from an id alone)");

// ---- result card
const card = cardText({ result: "win", goals_for: 3, goals_against: 1, overtime: true, opponent: "Rival", totals: { goals: 3, assists: 2, saves: 4, shots: 9, score: 900 }, snapshots: 2 }, "https://victress.gg/claim");
check(card.includes("Win 3 to 1 (overtime) vs Rival") && card.includes("Team totals: 3 goals, 2 assists, 4 saves, 9 shots, 900 score") && card.includes("2 player snapshots ready. Claim yours: https://victress.gg/claim"), "the card shows score, W or L, team totals and N player snapshots ready with the claim link");
check(!/Me Player|Mate One|76561198/.test(card), "the card shows no individual player or id");
check(/No player snapshots/.test(cardText({ result: "loss", goals_for: 0, goals_against: 2, overtime: false, opponent: null, totals: {}, snapshots: 0 })), "zero snapshots says so plainly");

// ---- pipeline: snapshots stored as keys only
const t = { game_accounts: [{ id: "acc-me", profile_id: "me", game: "ROCKET_LEAGUE", platform: "steam", external_id: "76561198000000001" }], game_matches: [], import_jobs: [], team_members: [{ team_id: "A", profile_id: "me" }], team_scrims: [], team_stat_sharing: [], events: [] };
const rpcCalls = [];
const q = (name) => { const f = []; let op = "select", payload = null, head = false; const rows = () => t[name].filter((r) => f.every((fn) => fn(r)));
  const b = { select(_c, o) { if (op === "select") head = !!o?.head; return b; }, insert(p) { op = "insert"; payload = p; return b; }, update(p) { op = "update"; payload = p; return b; },
    eq(k, v) { f.push((r) => r[k] === v); return b; }, in(k, vs) { f.push((r) => vs.includes(r[k])); return b; }, gte(k, v) { f.push((r) => r[k] >= v); return b; }, lt(k, v) { f.push((r) => r[k] < v); return b; },
    async maybeSingle() { return { data: rows()[0] ?? null, error: null }; }, async single() { return run(true); }, then(res, rej) { return run(false).then(res, rej); } };
  async function run(single) { if (op === "insert") { const row = { id: `id-${t[name].length + 1}`, status: "queued", created_at: new Date().toISOString(), ...payload }; t[name].push(row); return { data: single ? { id: row.id } : [row], error: null }; }
    if (op === "update") { rows().forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; } const r = rows(); return { data: head ? null : r, count: r.length, error: null }; }
  return b; };
const admin = { from: q, async rpc(fn, args) { rpcCalls.push({ fn, args }); if (fn === "record_team_scrim") { t.team_scrims.push({ id: "ts-1" }); return { data: { status: "ok", scrim_id: "ts-1" }, error: null }; } if (fn === "record_rl_snapshots") return { data: args.p.length, error: null }; return { data: null, error: { code: "42883" } }; } };
const deps = { admin, client: { details: async () => replay(), ping: async () => true }, team: { build: teamScrimFromReplay, members: sharingMembers, snapshots: { slots: snapshotSlots, key } }, claimUrl: "https://victress.gg/claim" };
const r = await runReplayImport(deps, "me", `https://ballchasing.com/replay/${ID}`, { authorized: true, consent: true, via: "discord", forTeam: true, opponent: "Rival" });
const snapCall = rpcCalls.find((c) => c.fn === "record_rl_snapshots");
check(r.ok && r.team === "added" && snapCall && snapCall.args.p_scrim === "ts-1" && snapCall.args.p_submitter === "me", "after the team scrim is added, its snapshots are recorded for that scrim and submitter");
check(snapCall && snapCall.args.p.length === 2 && snapCall.args.p[0].key === key("steam", "76561198000000001") && snapCall.args.p[1].key === key("epic", "aaaabbbbccccddddeeeeffff00001111"), "the stored keys are the keyed hashes of each player's exact platform and id, the submitter included");
check(snapCall && !/aaaabbbbccccddddeeeeffff00001111|76561198000000001|"epic"|"steam"/.test(JSON.stringify(snapCall.args)), "no platform id or platform name is sent to the database");
check(r.card && r.card.snapshots === 2 && /2 player snapshots ready\. Claim yours: https:\/\/victress\.gg\/claim/.test(r.message) && /Win 3 to 1 vs Rival/.test(r.message), "the reply is the result card with 2 player snapshots ready");
check(!/Mate One|Opp One|aaaabbbb|5551212/.test(r.message), "the reply names no player and shows no id or individual numbers of others");
const noKey = { ...deps, team: { ...deps.team, snapshots: { slots: snapshotSlots, key: null } } };
t.team_scrims.length = 0; t.game_matches.length = 0; t.import_jobs.length = 0; rpcCalls.length = 0;
const r2 = await runReplayImport(noKey, "me", `https://ballchasing.com/replay/${ID}`, { authorized: true, consent: true, via: "web", forTeam: true });
check(r2.ok && r2.team === "added" && !rpcCalls.some((c) => c.fn === "record_rl_snapshots") && /No player snapshots/.test(r2.message), "without the claim secret the scrim still saves and no snapshots are made");

// ---- side option: must match the side of the submitter's own ID
t.team_scrims.length = 0; t.game_matches.length = 0; t.import_jobs.length = 0; rpcCalls.length = 0;
const r3 = await runReplayImport(deps, "me", `https://ballchasing.com/replay/${ID}`, { authorized: true, consent: true, via: "discord", forTeam: true, side: "orange" });
check(!r3.ok && r3.code === "side_mismatch" && t.game_matches.length === 0 && !rpcCalls.length, "a side that is not the side of the player's own ID saves nothing");
t.import_jobs.length = 0;
const r4 = await runReplayImport(deps, "me", `https://ballchasing.com/replay/${ID}`, { authorized: true, consent: true, via: "discord", forTeam: true, side: "blue" });
check(r4.ok && r4.team === "added", "the matching side is accepted");

// ---- Steam OpenID
const cfg = steamConfig({ VICTRESS_STEAM_SIGNIN_ENABLED: "true", VICTRESS_STEAM_RETURN_URL: "https://victress.gg/dashboard/link/steam/callback" });
check(steamConfig({ VICTRESS_STEAM_RETURN_URL: "https://victress.gg/dashboard/link/steam/callback" }) === null, "Steam is off unless its own flag is exactly true (independent of Epic)");
check(steamConfig({ VICTRESS_STEAM_SIGNIN_ENABLED: "true", VICTRESS_STEAM_RETURN_URL: "http://victress.gg/dashboard/link/steam/callback" }) === null && steamConfig({ VICTRESS_STEAM_SIGNIN_ENABLED: "true", VICTRESS_STEAM_RETURN_URL: "https://victress.gg/x" }) === null, "the return URL must be https and the callback route");
const state = "a".repeat(64);
const login = new URL(steamLoginUrl(cfg, state));
check(login.origin + login.pathname === STEAM_OPENID && login.searchParams.get("openid.mode") === "checkid_setup" && login.searchParams.get("openid.return_to") === `https://victress.gg/dashboard/link/steam/callback?state=${state}` && login.searchParams.get("openid.realm") === "https://victress.gg", "login goes to Steam's OpenID endpoint with our return URL, state and realm");
const PID = "11111111-2222-4333-8444-555555555555";
const okQuery = (over = {}) => new URLSearchParams({ state, "openid.ns": "http://specs.openid.net/auth/2.0", "openid.mode": "id_res", "openid.op_endpoint": STEAM_OPENID,
  "openid.claimed_id": "https://steamcommunity.com/openid/id/76561198000000042", "openid.identity": "https://steamcommunity.com/openid/id/76561198000000042",
  "openid.return_to": `https://victress.gg/dashboard/link/steam/callback?state=${state}`, "openid.response_nonce": "2026-11-15T10:00:00Zabc", "openid.assoc_handle": "1234567890",
  "openid.signed": "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle", "openid.sig": "c2ln", ...over });
const steamSays = (text, status = 200) => { const calls = []; return { calls, f: async (url, init) => { calls.push({ url, body: String(init.body) }); return new Response(text, { status }); } }; };
let s = steamSays("ns:http://specs.openid.net/auth/2.0\nis_valid:true\n");
let v = await verifySteamCallback({ cfg, profileId: PID, query: okQuery(), cookie: steamStateCookie(state, PID), fetch: s.f });
check(v.ok && v.steamId === "76561198000000042", "a confirmed Steam response gives the SteamID64");
check(s.calls.length === 1 && s.calls[0].url === STEAM_OPENID && /openid\.mode=check_authentication/.test(s.calls[0].body) && /openid\.sig=/.test(s.calls[0].body), "the response is confirmed with Steam (check_authentication) before use");
s = steamSays("ns:http://specs.openid.net/auth/2.0\nis_valid:false\n");
v = await verifySteamCallback({ cfg, profileId: PID, query: okQuery(), cookie: steamStateCookie(state, PID), fetch: s.f });
check(!v.ok && v.reason === "invalid", "Steam saying is_valid:false is refused");
const refused = async (q, cookie = steamStateCookie(state, PID)) => { const x = steamSays("is_valid:true"); const out = await verifySteamCallback({ cfg, profileId: PID, query: q, cookie, fetch: x.f }); return !out.ok && x.calls.length === 0; };
check(await refused(okQuery(), steamStateCookie(state, "99999999-2222-4333-8444-555555555555")), "a callback for a different Victress account is refused before contacting Steam");
check(await refused(okQuery({ state: "b".repeat(64) })), "a different state is refused");
check(await refused(okQuery({ "openid.op_endpoint": "https://evil.example/openid/login" })), "another OpenID provider is refused");
check(await refused(okQuery({ "openid.return_to": "https://evil.example/dashboard/link/steam/callback?state=" + state })), "a different return_to is refused");
check(await refused(okQuery({ "openid.claimed_id": "https://steamcommunity.com/openid/id/123", "openid.identity": "https://steamcommunity.com/openid/id/123" })), "a claimed id that is not 17 digits is refused");
check(await refused(okQuery({ "openid.signed": "signed,op_endpoint,return_to" })), "a response that does not sign the claimed id is refused");
check(await refused(okQuery({ "openid.mode": "cancel" })), "the player cancelling is refused without contacting Steam");

console.log(failed ? `\n${failed} FAILED` : "\nAll snapshot and Steam checks passed.");
process.exit(failed ? 1 : 0);
