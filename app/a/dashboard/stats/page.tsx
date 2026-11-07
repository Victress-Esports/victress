import { redirect } from "next/navigation";

// Victress does not publish stats players enter themselves, so the stats page is retired (founder decision 2026-11-07).
// Previously saved entries stay in the database untouched; nothing displays them.
export default function StatsPage() {
  redirect("/dashboard");
}
