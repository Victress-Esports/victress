import type { GameId } from "@/content/games";

// Manual stat fields. Keys are stored in stat_entries.metrics; all optional; all self-reported.
export interface StatField {
  key: "kd" | "win_rate" | "rating" | "hs_pct" | "matches";
  label: string;
  suffix?: string;
  min: number;
  max: number;
  decimals: number;
}

export function statFields(game: GameId | string | null | undefined): StatField[] {
  return [
    { key: "kd", label: "K/D", min: 0, max: 20, decimals: 2 },
    { key: "win_rate", label: "Win rate", suffix: "%", min: 0, max: 100, decimals: 0 },
    game === "CS2"
      ? { key: "rating", label: "ADR", min: 0, max: 300, decimals: 0 }
      : { key: "rating", label: "Avg combat score", min: 0, max: 600, decimals: 0 },
    { key: "hs_pct", label: "Headshot %", suffix: "%", min: 0, max: 100, decimals: 0 },
    { key: "matches", label: "Matches", min: 0, max: 100000, decimals: 0 },
  ];
}

export function formatStat(f: StatField, value: number) {
  return `${value.toFixed(f.decimals)}${f.suffix ?? ""}`;
}
