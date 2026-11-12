// Fidelity of Victress's replay normalization against what Ballchasing returned, on real public replays. READ ONLY, counts against the
// Ballchasing read limits (about 55 calls), never the upload quota. Prints counts and replay ids only: no player names or ids.
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<proxy ca> node --experimental-transform-types scripts/rl-fidelity.mjs [replays=50]
// What this checks: our code stores the same numbers Ballchasing reported, picks the right slot, computes the right result, never stores
// names or ids, and fits the database limits. What it does NOT check: whether Ballchasing's own numbers match the game (that needs the
// in-game scoreboard as ground truth). A pass here is not a validated production ingestion workflow.
import { createBallchasingClient } from "../lib/ballchasing/core.ts";
import { normalizeReplay } from "../lib/ballchasing/rl.ts";

const N = Number(process.argv[2] ?? 50);
const token = process.env.BALLCHASING_API_TOKEN;
const client = createBallchasingClient({ token: token || "sandbox", fetch: token ? undefined : (url, init) => fetch(url, { ...init, headers: {} }) });
const lists = [["ranked-duels", 8], ["ranked-doubles", 14], ["ranked-standard", 14], ["unranked-doubles", 7], ["unranked-standard", 7]];
const ids = [];
for (const [pl, n] of lists) { const r = await client.list({ playlist: [pl], count: n }); ids.push(...r.list.map((x) => x.id)); }
const pick = [...new Set(ids)].slice(0, N);

const fails = [];
const tally = { replays: 0, normalized: 0, resultCorrect: 0, slotsExact: 0, participantsExact: 0, noLeak: 0, sizesOk: 0, deterministic: 0, unlisted: 0, noid: 0 };
const core = ["score", "goals", "assists", "saves", "shots"];
for (const id of pick) {
  let d;
  try { d = await client.details(id); } catch (e) { fails.push([id, `read failed: ${e.code ?? e.message}`]); continue; }
  tally.replays++;
  const teams = [d.blue.players, d.orange.players];
  const all = [...teams[0], ...teams[1]];
  const withId = all.map((p, i) => [p, i]).filter(([p]) => p.id?.platform && p.id?.id);
  if (!withId.length) { tally.noid = (tally.noid ?? 0) + 1; continue; }
  const [mine, k] = withId[Math.floor(Math.random() * withId.length)];
  const who = { platform: mine.id.platform, id: mine.id.id };
  const dupes = all.filter((p) => p.id.platform === who.platform && String(p.id.id).toLowerCase() === String(who.id).toLowerCase()).length;
  if (dupes !== 1) { tally.unlisted++; continue; } // an identity that appears twice is refused by design; not counted against fidelity
  const n = normalizeReplay(d, who);
  if (!n.ok) { fails.push([id, `not normalized: ${n.reason}`]); continue; }
  tally.normalized++;
  const row = n.row;
  const myTeam = k < teams[0].length ? 0 : 1;
  const sumGoals = (ps) => ps.reduce((a, p) => a + (p.stats?.core?.goals ?? 0), 0);
  const tg = (t) => d[t === 0 ? "blue" : "orange"].stats?.core?.goals ?? sumGoals(teams[t]);
  const expected = tg(myTeam) > tg(1 - myTeam) ? "win" : tg(myTeam) < tg(1 - myTeam) ? "loss" : "remake";
  if (row.result === expected) tally.resultCorrect++; else fails.push([id, `result ${row.result} != ${expected}`]);
  // slot and numbers
  const rawMe = mine.stats.core;
  if (row.me.slot === k && core.every((c) => (rawMe[c] ?? undefined) === row.me.core[c])) tally.slotsExact++; else fails.push([id, "own slot or numbers differ from the replay"]);
  const partOk = row.participants.length === all.length && row.participants.every((p, i) => p.slot === i && core.every((c) => (all[i].stats?.core?.[c] ?? undefined) === p.core[c]));
  if (partOk) tally.participantsExact++; else fails.push([id, "anonymous slots differ from the replay"]);
  const dump = JSON.stringify(row);
  const sensitive = all.flatMap((p) => [p.name, String(p.id.id)]).filter((s) => s && s.length > 3);
  const up = d.uploader ? [d.uploader.name, String(d.uploader.steam_id ?? "")].filter((s) => s && s.length > 3) : [];
  if ([...sensitive, ...up].every((s) => !dump.includes(s))) tally.noLeak++; else fails.push([id, "a name or id appears in the stored row"]);
  if (Buffer.byteLength(JSON.stringify(row.me)) < 8000 && Buffer.byteLength(JSON.stringify(row.participants)) < 40000 && Buffer.byteLength(JSON.stringify(row.objectives)) < 4000) tally.sizesOk++; else fails.push([id, "row too large for the database limits"]);
  if (JSON.stringify(normalizeReplay(d, who).row) === dump) tally.deterministic++; else fails.push([id, "normalizing twice gave different rows"]);
}
const checked = tally.normalized;
console.log(JSON.stringify({ requested: N, read: tally.replays, skipped_identity_appears_twice: tally.unlisted, skipped_no_player_ids: tally.noid, normalized: tally.normalized }));
for (const [k, v] of Object.entries(tally)) if (!["replays", "normalized", "unlisted", "noid"].includes(k)) console.log(`${k}: ${v} of ${checked}`);
if (fails.length) { console.log(`\n${fails.length} problem(s):`); for (const f of fails.slice(0, 20)) console.log(" ", f[0], "-", f[1]); }
console.log(fails.length ? "\nFIDELITY: PROBLEMS FOUND" : `\nFIDELITY: ${checked} of ${checked} replays reproduced exactly. This is not validation against the game.`);
process.exit(fails.length ? 1 : 0);
