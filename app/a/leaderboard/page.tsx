import { notFound } from "next/navigation";

// See app/a/leaderboard/[slug]/page.tsx: no leaderboard is published.
export default function Leaderboards() {
  notFound();
}
