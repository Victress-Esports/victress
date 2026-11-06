import { formatStat, getGame } from "@/content/games";
import type { Json } from "@/types/database";

/** Turns a stat_entries.metrics blob into display rows (only fields that were entered), in the game's field order. */
export function statRows(game: string | null, metrics: Json | null | undefined) {
  const cfg = getGame(game);
  if (!cfg || !metrics || typeof metrics !== "object" || Array.isArray(metrics)) return [];
  const m = metrics as Record<string, Json | undefined>;
  return cfg.stats.flatMap((f) => {
    const v = m[f.key];
    return typeof v === "number" && Number.isFinite(v) ? [{ label: f.label, value: formatStat(f, v) }] : [];
  });
}

export const appHost = () => (process.env.NEXT_PUBLIC_APP_URL ?? "https://victress.gg").replace(/^https?:\/\//, "");
