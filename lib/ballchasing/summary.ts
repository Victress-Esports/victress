// Performance summary for a player's own Rocket League games. Pure. Games are grouped by kind and never mixed unless "all" is chosen,
// and the summary always carries the number of games so a small sample is shown as one.
export type RlRow = {
  queue_kind: string; played_at: string; duration_seconds: number; result: "win" | "loss" | "remake";
  me: { core?: Record<string, number>; boost?: Record<string, number>; movement?: Record<string, number>; positioning?: Record<string, number>; demo?: Record<string, number> };
};
export type RlSummary = {
  games: number; wins: number; losses: number; winRate: number | null; smallSample: boolean;
  perGame: { score: number; goals: number; assists: number; saves: number; shots: number; demosInflicted: number; demosTaken: number };
  shootingPercent: number | null; boostPerMinute: number | null; averageSpeed: number | null; supersonicPercent: number | null;
  defensiveThirdPercent: number | null; offensiveThirdPercent: number | null;
  series: { playedAt: string; score: number; goals: number; win: boolean | null }[];
};

export function summarizeRl(rows: RlRow[], kind: string | "all", last = 30): RlSummary | null {
  const used = rows.filter((r) => r.duration_seconds >= 60 && (kind === "all" || r.queue_kind === kind))
    .sort((a, b) => a.played_at.localeCompare(b.played_at)).slice(-last);
  if (!used.length) return null;
  const n = used.length;
  const total = (g: "core" | "boost" | "movement" | "positioning" | "demo", k: string) => used.reduce((s, r) => s + (r.me[g]?.[k] ?? 0), 0);
  const avg = (g: "core" | "boost" | "movement" | "positioning" | "demo", k: string) => {
    const have = used.filter((r) => typeof r.me[g]?.[k] === "number");
    return have.length ? have.reduce((s, r) => s + (r.me[g]![k] as number), 0) / have.length : null;
  };
  const decided = used.filter((r) => r.result !== "remake");
  const wins = decided.filter((r) => r.result === "win").length;
  const shots = total("core", "shots");
  return {
    games: n, wins, losses: decided.length - wins, winRate: decided.length ? wins / decided.length : null, smallSample: n < 5,
    perGame: {
      score: total("core", "score") / n, goals: total("core", "goals") / n, assists: total("core", "assists") / n, saves: total("core", "saves") / n,
      shots: shots / n, demosInflicted: total("demo", "inflicted") / n, demosTaken: total("demo", "taken") / n,
    },
    shootingPercent: shots > 0 ? (total("core", "goals") / shots) * 100 : null,
    boostPerMinute: avg("boost", "bpm"), averageSpeed: avg("movement", "avg_speed"), supersonicPercent: avg("movement", "percent_supersonic_speed"),
    defensiveThirdPercent: avg("positioning", "percent_defensive_third"), offensiveThirdPercent: avg("positioning", "percent_offensive_third"),
    series: used.map((r) => ({ playedAt: r.played_at, score: r.me.core?.score ?? 0, goals: r.me.core?.goals ?? 0, win: r.result === "remake" ? null : r.result === "win" })),
  };
}
