import { GAME_LIST } from "@/content/games";
import { MIN_PLAYERS } from "@/lib/leaderboard";
import { PAGE_SIZE, appBase, type UrlEntry } from "@/lib/sitemap";
import { directoryEnabled } from "@/lib/privacy";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase-admin";

// Only directory listed profiles that also opted into search engines are ever listed; nothing while the directory is off.
const configured = () => directoryEnabled() && supabaseAdminConfigured();

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

/** No leaderboard is published (they are built on stats players enter, which Victress does not publish), so none is listed. */
export async function openBoardEntries(): Promise<UrlEntry[]> {
  return [];
}
