import { notFound } from "next/navigation";

// Leaderboards are built on stats players enter themselves, and Victress does not publish those (founder decision 2026-11-07).
// No board renders. The database functions and stored data are unchanged.
export default function Leaderboard() {
  notFound();
}
