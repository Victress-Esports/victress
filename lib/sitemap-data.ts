import { GAME_LIST } from "@/content/games";
import { MIN_PLAYERS } from "@/lib/leaderboard";
import { PAGE_SIZE, appBase, type UrlEntry } from "@/lib/sitemap";
import { directoryEnabled } from "@/lib/privacy";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Only directory listed profiles that also opted into search engines are ever listed; nothing while the directory is off.
const configured = () => directoryEnabled() && !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Number of public profiles (real handles, no demo players). Throws on a database error. */
export async function profileTotal(): Promise<number> {
  if (!configured()) return 0;
  const { data, error } = await supabaseAdmin()!.rpc("sitemap_directory_count");
  if (error) throw new Error(error.message);
  return data ?? 0;
}

/** One page of profile URLs with a real lastmod (the profile's updated_at). Page index starts at 0. */
export async function profileEntries(page: number): Promise<UrlEntry[]> {
  if (!configured()) return [];
  const { data, error } = await supabaseAdmin()!.rpc("sitemap_directory_profiles", { p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { handle: string; updated_at: string }[]).map((p) => ({ loc: `${appBase}/${p.handle}`, lastmod: new Date(p.updated_at).toISOString() }));
}

/** Leaderboards only enter the sitemap once they are open (10+ real players); closed boards are noindex. */
export async function openBoardEntries(): Promise<UrlEntry[]> {
  if (!configured()) return [];
  const db = supabaseAdmin()!;
  const counts = await Promise.all(
    GAME_LIST.map(async (g) => {
      const { data, error } = await db.rpc("board_player_count", { p_game: g.id, p_include_demo: false });
      if (error) throw new Error(error.message);
      return { g, n: data ?? 0 };
    }),
  );
  return counts.filter((c) => c.n >= MIN_PLAYERS).map((c) => ({ loc: `${appBase}/leaderboard/${c.g.slug}` }));
}
