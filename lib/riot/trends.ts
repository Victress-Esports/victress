/** Aggregates for the trends screen. Pure. Games are grouped by queue kind and never mixed, and remakes are left out. */
export type TrendRow = {
  queue_kind: string; played_at: string; duration_seconds: number; result: "win" | "loss" | "remake";
  me: { kills: number; deaths: number; assists: number; cs: number; vision: number; damage: number; champion: string };
};
export type Trend = {
  games: number; wins: number; winRate: number; kda: number; csPerMin: number; visionPerMin: number; damagePerMin: number;
  series: { playedAt: string; kda: number; csPerMin: number; win: boolean }[]; topChampions: { champion: string; games: number }[];
};

export function computeTrend(rows: TrendRow[], kind: string | "all", last = 30): Trend | null {
  const used = rows.filter((r) => r.result !== "remake" && r.duration_seconds >= 300 && (kind === "all" || r.queue_kind === kind))
    .sort((a, b) => a.played_at.localeCompare(b.played_at)).slice(-last);
  if (!used.length) return null;
  const sum = (f: (r: TrendRow) => number) => used.reduce((s, r) => s + f(r), 0);
  const minutes = sum((r) => r.duration_seconds) / 60;
  const wins = used.filter((r) => r.result === "win").length;
  const kdaOf = (r: TrendRow) => (r.me.kills + r.me.assists) / Math.max(1, r.me.deaths);
  const champs = new Map<string, number>();
  for (const r of used) champs.set(r.me.champion, (champs.get(r.me.champion) ?? 0) + 1);
  return {
    games: used.length, wins, winRate: wins / used.length,
    kda: (sum((r) => r.me.kills) + sum((r) => r.me.assists)) / Math.max(1, sum((r) => r.me.deaths)),
    csPerMin: sum((r) => r.me.cs) / minutes, visionPerMin: sum((r) => r.me.vision) / minutes, damagePerMin: sum((r) => r.me.damage) / minutes,
    series: used.map((r) => ({ playedAt: r.played_at, kda: kdaOf(r), csPerMin: r.me.cs / (r.duration_seconds / 60), win: r.result === "win" })),
    topChampions: [...champs].map(([champion, games]) => ({ champion, games })).sort((a, b) => b.games - a.games).slice(0, 3),
  };
}
