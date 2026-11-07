import { cache } from "react";
import { directoryEnabled } from "@/lib/privacy";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** Boards list only players who opted in (show_on_leaderboards), and stay closed while DIRECTORY_ENABLED is off.
 * A board opens once this many real (non-demo) players have entered stats for the game. */
export const MIN_PLAYERS = 10;

/** Demo players are only ever included where LEADERBOARD_INCLUDE_DEMO=true (dev and preview, never production). */
export const includeDemo = () => process.env.LEADERBOARD_INCLUDE_DEMO === "true";

/** Players counted for a game's board. Memoized per request so metadata and page share one query. */
export const boardPlayerCount = cache(async (gameId: string): Promise<number> => {
  if (!directoryEnabled()) return 0;
  const { data } = (await supabaseAdmin()?.rpc("board_player_count", { p_game: gameId, p_include_demo: includeDemo() })) ?? { data: 0 };
  return (data as number | null) ?? 0;
});
