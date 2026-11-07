import { cache } from "react";
import { supabasePublic } from "@/lib/supabase/public";

/** A board opens once this many real (non-demo) players have entered stats for the game. */
export const MIN_PLAYERS = 10;

/** Demo players are only ever included where LEADERBOARD_INCLUDE_DEMO=true (dev and preview, never production). */
export const includeDemo = () => process.env.LEADERBOARD_INCLUDE_DEMO === "true";

/** Players counted for a game's board. Memoized per request so metadata and page share one query. */
export const boardPlayerCount = cache(async (gameId: string): Promise<number> => {
  const { data } = await supabasePublic().rpc("leaderboard_player_count", { p_game: gameId, p_include_demo: includeDemo() });
  return data ?? 0;
});
