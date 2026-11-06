import { formatStat, statFields } from "@/content/stats";
import type { Json } from "@/types/database";

/** Turns a stat_entries.metrics blob into display rows (only fields that were entered). */
export function statRows(game: string | null, metrics: Json | null | undefined) {
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) return [];
  const m = metrics as Record<string, Json | undefined>;
  return statFields(game).flatMap((f) => {
    const v = m[f.key];
    return typeof v === "number" && Number.isFinite(v) ? [{ label: f.label, value: formatStat(f, v) }] : [];
  });
}

export const appHost = () => (process.env.NEXT_PUBLIC_APP_URL ?? "https://victress.gg").replace(/^https?:\/\//, "");
