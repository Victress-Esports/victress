// The team and snapshot pipeline on REAL public Ballchasing replays, against an in-memory database. READ ONLY at Ballchasing (about
// 2 calls per replay). Prints counts only: no names or ids.
//   NODE_USE_ENV_PROXY=1 node scripts/snapshots-live-check.mjs [replays=10]
// For each 3v3 replay: acts as the first player on blue who has an id, submits it for a team, and checks that snapshots are made for
// exactly the other blue players who have ids (never orange), as keyed hashes only, and that the reply is the result card.
import { runReplayImport } from "../lib/ballchasing/rl.ts";
import { snapshotSlots, teamScrimFromReplay, sharingMembers } from "../lib/ballchasing/team.ts";
import { claimKeyFn } from "../lib/claim-core.ts";
import { randomBytes } from "node:crypto";

const N = Number(process.argv[2] ?? 10);
const token = process.env.BALLCHASING_API_TOKEN?.trim();
const get = async (path) => { await new Promise((r) => setTimeout(r, 600)); const r = await fetch(`https://ballchasing.com/api${path}`, token ? { headers: { Authorization: token } } : {}); if (!r.ok) throw new Error(`ballchasing ${r.status}`); return r.json(); };
const key = claimKeyFn({ VICTRESS_CLAIM_KEY: randomBytes(32).toString("hex") });
const list = (await get(`/replays?playlist=ranked-standard&count=${N}&sort-by=replay-date&sort-dir=desc`)).list ?? [];
let ok = 0, checked = 0;
for (const s of list) {
  const detail = await get(`/replays/${s.id}`);
  const blue = detail.blue?.players ?? [], orange = detail.orange?.players ?? [];
  const me = blue.find((p) => p.id?.platform && p.id?.id);
  if (!me) continue;
  checked++;
  const who = { platform: me.id.platform, id: me.id.id };
  const t = { game_accounts: [{ id: "acc", profile_id: "u", game: "ROCKET_LEAGUE", platform: who.platform, external_id: who.id }], game_matches: [], import_jobs: [], team_members: [{ team_id: "A", profile_id: "u" }], team_scrims: [], team_stat_sharing: [], events: [] };
  const calls = [];
  const q = (name) => { const f = []; let op = "select", payload = null, head = false; const rows = () => t[name].filter((r) => f.every((fn) => fn(r)));
    const b = { select(_c, o) { if (op === "select") head = !!o?.head; return b; }, insert(p) { op = "insert"; payload = p; return b; }, update(p) { op = "update"; payload = p; return b; },
      eq(k, v) { f.push((r) => r[k] === v); return b; }, in(k, vs) { f.push((r) => vs.includes(r[k])); return b; }, gte(k, v) { f.push((r) => r[k] >= v); return b; }, lt(k, v) { f.push((r) => r[k] < v); return b; },
      async maybeSingle() { return { data: rows()[0] ?? null, error: null }; }, async single() { return run(true); }, then(res, rej) { return run(false).then(res, rej); } };
    async function run(single) { if (op === "insert") { const row = { id: `id-${t[name].length + 1}`, status: "queued", created_at: new Date().toISOString(), ...payload }; t[name].push(row); return { data: single ? { id: row.id } : [row], error: null }; }
      if (op === "update") { rows().forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; } const r = rows(); return { data: head ? null : r, count: r.length, error: null }; }
    return b; };
  const admin = { from: q, async rpc(fn, args) { calls.push({ fn, args }); if (fn === "record_team_scrim") return { data: { status: "ok", scrim_id: "ts" }, error: null }; if (fn === "record_rl_snapshots") return { data: args.p.length, error: null }; return { data: null, error: { code: "42883" } }; } };
  const client = { details: async () => detail, ping: async () => true };
  const r = await runReplayImport({ admin, client, team: { build: teamScrimFromReplay, members: sharingMembers, snapshots: { slots: snapshotSlots, key } }, claimUrl: "https://victress.gg/claim" }, "u", `https://ballchasing.com/replay/${s.id}`, { authorized: true, consent: true, via: "discord", forTeam: true });
  const snap = calls.find((c) => c.fn === "record_rl_snapshots");
  const expected = blue.filter((p) => p !== me && p.id?.platform && p.id?.id).map((p) => key(p.id.platform, p.id.id)).sort();
  const got = (snap?.args.p ?? []).map((x) => x.key).sort();
  const oppKeys = orange.filter((p) => p.id?.platform && p.id?.id).map((p) => key(p.id.platform, p.id.id));
  const sent = JSON.stringify(calls);
  const leak = [...blue, ...orange].some((p) => (p.id?.id && sent.includes(p.id.id)) || (p.name && p.name.length > 3 && sent.includes(p.name)));
  const pass = r.ok && r.team === "added" && JSON.stringify(got) === JSON.stringify(expected) && !got.some((k) => oppKeys.includes(k)) && !leak
    && new RegExp(`${expected.length ? expected.length + " snapshot" : "No snapshots"}`).test(r.message) && !/assists, \d+ saves, \d+ shots, score/.test(r.message.split("Team totals:")[0]);
  if (pass) ok++; else console.log(`replay ${s.id}: MISMATCH (expected ${expected.length} snapshots, got ${got.length}, leak ${leak}, team ${r.team})`);
}
console.log(`${ok} of ${checked} real replays: snapshots for exactly the submitter's other teammates with ids, none for opponents, keys only (no ids or names sent), result card shown.`);
process.exit(ok === checked && checked > 0 ? 0 : 1);
