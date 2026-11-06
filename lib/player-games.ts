import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameConfig } from "@/content/games";
import type { Database } from "@/types/database";

/**
 * Adds a game to the signed-in player's profile, or updates its role and rank if it is already there.
 * Not an upsert on purpose: users can only update role and rank, and an upsert also tries to update the key columns.
 */
export async function savePlayerGame(
  sb: SupabaseClient<Database>,
  userId: string,
  cfg: GameConfig,
  role: string | null,
  rank: string | null,
): Promise<boolean> {
  const { error } = await sb.from("player_games").insert({ profile_id: userId, game: cfg.id, role, rank });
  if (!error) return true;
  if (error.code !== "23505") return false; // anything but "already added"
  const { error: updateError } = await sb
    .from("player_games")
    .update({ role, rank })
    .eq("profile_id", userId)
    .eq("game", cfg.id);
  return !updateError;
}
