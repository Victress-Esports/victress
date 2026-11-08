// Rocket League scoreboard validation harness.
//   BALLCHASING_API_TOKEN=... node scripts/rl-validate.mjs [--count 50] [--seed 1] [--out docs/validation]
//   node scripts/rl-validate.mjs --dir path/to/replays        (local files, no token; for tests)
// For each replay: parse with tools/rlparse (boxcars), compare the scoreboard stored in the replay header (truth) with the
// same numbers rebuilt from the network frames. A file PASSES only if every player and every field (score, goals, assists,
// saves, shots) and both team scores match exactly. Parse errors and download errors count as failures.
// Replay files go to a scratch folder and are deleted right after parsing. Reports hold ids and numbers, never player names.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const COUNT = Number(arg("count", 50)), SEED = Number(arg("seed", 1)), OUT = arg("out", "docs/validation"), DIR = arg("dir", "");
const BIN = arg("bin", "tools/rlparse/target/release/rlparse");
if (!existsSync(BIN)) { console.error(`parser not built: cargo build --release --manifest-path tools/rlparse/Cargo.toml`); process.exit(2); }

export const FIELDS = ["score", "goals", "assists", "saves", "shots"];
const n0 = (v) => (typeof v === "number" ? v : 0);

/** Pure comparison. Returns { pass, causes: string[] }. Missing network values are zero (the game never updated them). */
export function compare(parsed) {
  if (parsed.error) return { pass: false, causes: ["parse_error"] };
  const { header: h, network: n } = parsed;
  const causes = [];
  if (n0(h.team0_score) !== n0(n.team0_score) || n0(h.team1_score) !== n0(n.team1_score)) causes.push("team_score");
  if (!h.players.length) causes.push("no_header_players");
  if (h.players.length !== n.players.length) causes.push("player_count");
  const pool = n.players.map((p) => ({ ...p, used: false }));
  for (const hp of h.players) {
    const m = pool.find((p) => !p.used && p.name === hp.name && p.team === hp.team);
    if (!m) { causes.push("player_not_found"); continue; }
    m.used = true;
    for (const f of FIELDS) if (n0(hp[f]) !== n0(m[f])) causes.push(`field_${f}`);
  }
  return { pass: causes.length === 0, causes: [...new Set(causes)] };
}

export function runParser(path) {
  const r = spawnSync(BIN, [path], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: 120_000 });
  try { return JSON.parse(r.stdout); } catch { return { error: r.error ? String(r.error.code ?? "spawn") : "unreadable parser output" }; }
}

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffle = (a, rnd) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

async function ballchasingSample() {
  const ts = createRequire(import.meta.url)("typescript");
  const d = mkdtempSync(join(tmpdir(), "bc-core-"));
  writeFileSync(join(d, "core.mjs"), ts.transpileModule(readFileSync("lib/ballchasing/core.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  const { createBallchasingClient } = await import(pathToFileURL(join(d, "core.mjs")).href);
  const token = process.env.BALLCHASING_API_TOKEN;
  if (!token) { console.error("BALLCHASING_API_TOKEN is not set in this shell."); process.exit(2); }
  const bc = createBallchasingClient({ token });
  await bc.ping();
  // Spread the sample over playlists and over the last 12 months (5 windows), fixed seed.
  const playlists = [["ranked-duels"], ["ranked-doubles"], ["ranked-standard"], ["unranked-doubles", "unranked-standard"]];
  const now = Date.now(), year = 365 * 864e5, windows = 5;
  const rnd = mulberry32(SEED);
  const pool = [];
  for (let w = 0; w < windows; w++) for (const pl of playlists) {
    const after = new Date(now - year + (w * year) / windows).toISOString(), before = new Date(now - year + ((w + 1) * year) / windows).toISOString();
    const r = await bc.list({ playlist: pl, replayDateAfter: after, replayDateBefore: before, count: 40 });
    pool.push(...shuffle(r.list, rnd).slice(0, Math.ceil((COUNT * 1.5) / (windows * playlists.length))));
  }
  const seen = new Set(), picks = [];
  for (const r of shuffle(pool, rnd)) if (!seen.has(r.id)) { seen.add(r.id); picks.push(r); }
  return { bc, picks: picks.slice(0, COUNT) };
}

const work = mkdtempSync(join(tmpdir(), "rl-work-"));
const results = [];
const started = new Date();
try {
  if (DIR) {
    for (const f of readdirSync(DIR).filter((x) => x.endsWith(".replay")).slice(0, COUNT)) {
      const t0 = Date.now(); const parsed = runParser(join(DIR, f));
      results.push({ id: f.replace(/\.replay$/, ""), source: "local", ...summarize(parsed), parse_ms: Date.now() - t0 });
    }
  } else {
    const { bc, picks } = await ballchasingSample();
    console.log(`sampled ${picks.length} public replays`);
    for (const p of picks) {
      const path = join(work, `${p.id}.replay`);
      try {
        writeFileSync(path, await bc.download(p.id));
      } catch (e) { results.push({ id: p.id, source: "ballchasing", pass: false, causes: ["download_error:" + (e.code ?? "unknown")] }); continue; }
      const t0 = Date.now(); const parsed = runParser(path); rmSync(path, { force: true });
      results.push({ id: p.id, source: "ballchasing", playlist: p.playlist_id ?? null, ...summarize(parsed), parse_ms: Date.now() - t0 });
      process.stdout.write(results.at(-1).pass ? "." : "x");
    }
    console.log();
  }
} finally { rmSync(work, { recursive: true, force: true }); }

function summarize(parsed) {
  const c = compare(parsed);
  const h = parsed.header ?? {};
  return { ...c, build: h.build_version ?? null, match_type: h.match_type ?? null, team_size: h.team_size ?? null, date: (h.date ?? "").slice(0, 10) || null, players: h.players?.length ?? null, error: parsed.error ?? undefined };
}

const total = results.length, passed = results.filter((r) => r.pass).length;
const causes = {}; for (const r of results) for (const c of r.causes) causes[c] = (causes[c] ?? 0) + 1;
const builds = new Set(results.map((r) => r.build).filter(Boolean));
const day = started.toISOString().slice(0, 10);
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, `rocket-league-${day}.json`), JSON.stringify({ started: started.toISOString(), seed: SEED, parser: "boxcars 0.13 via tools/rlparse", total, passed, causes, results }, null, 1));
const md = [
  `# Rocket League scoreboard validation, ${day}`, "",
  `Files attempted: **${total}**. Fully matching: **${passed}**. Pass rate: **${total ? ((passed / total) * 100).toFixed(1) : "n/a"}%**.`, "",
  `Parser: boxcars 0.13 (MIT) through tools/rlparse. Truth: the scoreboard stored in each replay header. Compared: score, goals, assists, saves and shots per player, and both team scores, rebuilt from the network frames. A file passes only if everything matches exactly.`, "",
  `Distinct game builds in the sample: ${builds.size}. Seed: ${SEED}. Source: ${DIR ? "local files" : "public ballchasing replays"}.`, "",
  `## Failure causes`, ...(Object.keys(causes).length ? Object.entries(causes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v} files`) : ["- none"]), "",
  `## Files`, "| id | result | build | type | causes |", "|---|---|---|---|---|",
  ...results.map((r) => `| ${r.id} | ${r.pass ? "pass" : "FAIL"} | ${r.build ?? ""} | ${r.match_type ?? ""} | ${r.causes.join(", ")} |`), "",
].join("\n");
writeFileSync(join(OUT, `rocket-league-${day}.md`), md);
console.log(`${passed}/${total} files match the scoreboard exactly. Report: ${join(OUT, `rocket-league-${day}.md`)}`);
process.exit(0);
