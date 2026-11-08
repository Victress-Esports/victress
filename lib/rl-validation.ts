// Rocket League validation: compare scoreboard stats parsed locally by rrrocket with ballchasing's replay detail.
// Scoreboard stats only (goals, assists, saves, shots, score). Boost is intentionally excluded.
// Test data only. Nothing here reads or writes real profiles.

import { execFileSync } from "node:child_process";
import type { BcReplay } from "./ballchasing";

export const STATS = ["goals", "assists", "saves", "shots", "score"] as const;
export type Stat = (typeof STATS)[number];

export type LocalPlayer = { name: string; team: number; platformId?: string; stats: Record<Stat, number> };
export type Row = { player: string; stat: Stat | "presence"; ours: number | string | null; ballchasing: number | string | null; match: boolean };

export const rocketLeagueCheckEnabled = () => process.env.RL_VALIDATION_ENABLED === "true";

type RrrocketPlayerStat = { Name?: string; Team?: number; Score?: number; Goals?: number; Assists?: number; Saves?: number; Shots?: number; bBot?: boolean; OnlineID?: string | number };

// Parses the replay header with the rrrocket CLI (source: stats recorded as demo_parsed).
export function parseWithRrrocket(replayPath: string, bin = process.env.RRROCKET_BIN || "rrrocket"): LocalPlayer[] {
  const out = execFileSync(bin, [replayPath], { maxBuffer: 256 * 1024 * 1024, encoding: "utf8" });
  const props = (JSON.parse(out) as { properties?: { PlayerStats?: RrrocketPlayerStat[] } }).properties;
  const list = props?.PlayerStats ?? [];
  return list
    .filter((p) => !p.bBot && p.Name)
    .map((p) => ({
      name: String(p.Name),
      team: Number(p.Team ?? -1),
      platformId: p.OnlineID != null ? String(p.OnlineID) : undefined,
      stats: { goals: p.Goals ?? 0, assists: p.Assists ?? 0, saves: p.Saves ?? 0, shots: p.Shots ?? 0, score: p.Score ?? 0 },
    }));
}

const norm = (s: string) => s.trim().toLowerCase();

export function compare(ours: LocalPlayer[], bc: BcReplay): Row[] {
  const rows: Row[] = [];
  const theirs = [
    ...bc.blue.players.map((p) => ({ p, team: 0 })),
    ...bc.orange.players.map((p) => ({ p, team: 1 })),
  ];
  const used = new Set<number>();
  for (const o of ours) {
    const idx = theirs.findIndex((t, i) => !used.has(i) && t.team === o.team && norm(t.p.name) === norm(o.name));
    if (idx < 0) {
      rows.push({ player: o.name, stat: "presence", ours: "found", ballchasing: "missing", match: false });
      continue;
    }
    used.add(idx);
    const core = theirs[idx].p.stats?.core;
    for (const s of STATS) {
      const b = core ? core[s] : null;
      rows.push({ player: o.name, stat: s, ours: o.stats[s], ballchasing: b, match: b !== null && b === o.stats[s] });
    }
  }
  theirs.forEach((t, i) => {
    if (!used.has(i)) rows.push({ player: t.p.name, stat: "presence", ours: "missing", ballchasing: "found", match: false });
  });
  return rows;
}

export function formatTable(rows: Row[]): string {
  const head = ["player", "stat", "ours", "ballchasing", "match"];
  const body = rows.map((r) => [r.player, r.stat, String(r.ours ?? "n/a"), String(r.ballchasing ?? "n/a"), r.match ? "yes" : "NO"]);
  const w = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  const line = (c: string[]) => "| " + c.map((x, i) => x.padEnd(w[i])).join(" | ") + " |";
  const sep = "|" + w.map((n) => "-".repeat(n + 2)).join("|") + "|";
  const exact = rows.length > 0 && rows.every((r) => r.match);
  return [line(head), sep, ...body.map(line), "", `Exact match on scoreboard stats: ${exact ? "YES" : "NO"} (${rows.filter((r) => r.match).length}/${rows.length} rows)`].join("\n");
}
