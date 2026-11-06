import { redirect } from "next/navigation";
import { launchGame } from "@/content/games";

// NEXT_PUBLIC_LAUNCH_GAME sets which board /leaderboard opens on. Every game keeps its own board.
export default function LeaderboardIndex() {
  redirect(`/leaderboard/${launchGame().slug}`);
}
