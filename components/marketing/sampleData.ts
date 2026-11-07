import type { GameId } from "@/content/games";

/**
 * SAMPLE data for the homepage previews. None of it is a real player: every place it is shown carries a "Sample" label.
 * Stat keys must match the game's config in content/games.ts so the labels stay accurate.
 */
export interface SampleGame {
  role: string | null;
  /** Three headline stats: [stat key, display value]. */
  stats: [string, string][];
  /** Eight weekly points for the progress line. */
  trend: number[];
  trendLabel: string;
  trendDelta: string;
}

export const SAMPLE: Record<GameId, SampleGame> = {
  VALORANT: { role: "Duelist", stats: [["acs", "251"], ["kd", "1.35"], ["win_rate", "58%"]], trend: [182, 190, 201, 198, 214, 226, 238, 251], trendLabel: "Avg combat score", trendDelta: "+69" },
  CS2: { role: "AWPer", stats: [["premier_rating", "17,420"], ["kd", "1.18"], ["adr", "84"]], trend: [14200, 14650, 14500, 15400, 16000, 16300, 16900, 17420], trendLabel: "Premier rating", trendDelta: "+3,220" },
  ROCKET_LEAGUE: { role: null, stats: [["goals_pg", "0.86"], ["saves_pg", "1.12"], ["win_rate", "54%"]], trend: [46, 48, 47, 50, 51, 52, 53, 54], trendLabel: "Win rate", trendDelta: "+8%" },
  LOL: { role: "Mid", stats: [["kda", "3.40"], ["cs_per_min", "7.1"], ["win_rate", "55%"]], trend: [2.4, 2.6, 2.5, 2.9, 3.0, 3.1, 3.3, 3.4], trendLabel: "KDA", trendDelta: "+1.00" },
  APEX: { role: "Recon", stats: [["avg_damage", "612"], ["kd", "1.90"], ["win_rate", "11%"]], trend: [410, 440, 430, 500, 530, 560, 590, 612], trendLabel: "Avg damage per game", trendDelta: "+202" },
  OVERWATCH2: { role: "Damage", stats: [["elims_10", "21.4"], ["deaths_10", "6.2"], ["win_rate", "53%"]], trend: [17.2, 18.0, 17.8, 19.1, 19.9, 20.4, 21.0, 21.4], trendLabel: "Eliminations per 10 min", trendDelta: "+4.2" },
};
