// Staging connectivity checks for the Riot key and the ballchasing token. Run locally or in a Preview shell:
//   RIOT_CHECK_ENABLED=true BALLCHASING_CHECK_ENABLED=true node --experimental-strip-types scripts/api-key-check.mjs \
//     riot "GameName#TAG" [na1]
//   ... ballchasing [path/to/test.replay]
//   ... compare path/to/test.replay        (needs rrrocket on PATH or RRROCKET_BIN)
// Prints statuses, rate-limit headers and result tables only. Never prints a key or token. Stores nothing.
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import * as riot from "../lib/riot.ts";
import * as bc from "../lib/ballchasing.ts";
import * as rl from "../lib/rl-validation.ts";

const [cmd, arg, arg2] = process.argv.slice(2);
const show = (label, r) => console.log(label, JSON.stringify(r.ok ? { status: r.status } : { status: r.status, error: r.error }));

async function runRiot() {
  if (!riot.riotEnabled()) return console.log("RIOT_CHECK_ENABLED is not true. Skipping.");
  const [name, tag] = (arg ?? "").split("#");
  if (!name || !tag) return console.log('Usage: riot "GameName#TAG" [platform]');
  const platform = arg2 ?? "na1";
  const a = await riot.getAccountByRiotId(name, tag);
  show("account-v1 by-riot-id (americas)", a);
  console.log("  rate:", JSON.stringify(a.rate));
  if (!a.ok) return;
  const s = await riot.getSummonerByPuuid(a.data.puuid, platform);
  show(`summoner-v4 by-puuid (${platform})`, s);
  console.log("  rate:", JSON.stringify(s.rate));
  const ids = await riot.getMatchIdsByPuuid(a.data.puuid, 1);
  show("match-v5 ids (americas)", ids);
  if (ids.ok && ids.data[0]) {
    const m = await riot.getMatch(ids.data[0]);
    show("match-v5 match (americas)", m);
    console.log("  rate:", JSON.stringify(m.rate)); // match data itself is discarded
  }
  console.log("Key:", riot.describeKey(a.rate));
}

async function runBc() {
  if (!bc.ballchasingEnabled()) return console.log("BALLCHASING_CHECK_ENABLED is not true. Skipping.");
  const p = await bc.ping();
  show("GET /api/", p);
  if (p.ok) console.log("  account:", p.data.name, "| tier:", p.data.type);
  console.log("  rate headers:", JSON.stringify(p.headers));
  const l = await bc.listReplays(1);
  show("GET /api/replays?count=1", l);
  if (!arg) return;
  const u = await bc.uploadReplay(new Blob([readFileSync(arg)]), basename(arg));
  show("POST /api/v2/upload?visibility=private", u);
  if (u.ok) {
    console.log("  id:", u.data.id, u.data.duplicate ? "(already on ballchasing)" : "");
    const d = await bc.waitForReplay(u.data.id);
    show("GET replay detail", d);
    if (d.ok) console.log("  status:", d.data.status, "| visibility:", d.data.visibility);
  }
}

async function runCompare() {
  if (!rl.rocketLeagueCheckEnabled() || !bc.ballchasingEnabled()) return console.log("Set RL_VALIDATION_ENABLED=true and BALLCHASING_CHECK_ENABLED=true.");
  if (!arg) return console.log("Usage: compare path/to/test.replay");
  const ours = rl.parseWithRrrocket(arg);
  const u = await bc.uploadReplay(new Blob([readFileSync(arg)]), basename(arg));
  if (!u.ok) return show("upload", u);
  const d = await bc.waitForReplay(u.data.id);
  if (!d.ok || d.data.status !== "ok") return show("replay detail", d);
  console.log(rl.formatTable(rl.compare(ours, d.data)));
}

const run = { riot: runRiot, ballchasing: runBc, compare: runCompare }[cmd];
if (!run) console.log("Usage: riot | ballchasing | compare");
else await run();
