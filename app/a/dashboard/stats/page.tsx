import type { Metadata } from "next";
import { seo } from "@/content/seo";
import { privateMetadata } from "@/lib/seo";
import Link from "next/link";
import { StatForm, StatHistory, type StatEntry } from "@/components/app/StatForm";
import { buttonClass } from "@/components/ui/Button";
import { Section } from "@/components/ui/form";
import { loadMe } from "@/lib/me";

export const metadata: Metadata = privateMetadata(seo.app.stats.title, seo.app.stats.description);

export default async function Stats() {
  const { profile, games, entries } = await loadMe();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Your stats</h1>
        <p className="mt-2 text-mute">You enter these yourself. They show on your profile as Self-reported.</p>
      </div>

      {games.length === 0 ? (
        <Section title="Add a game first">
          <p className="text-mute">Pick the game you play, then add your stats.</p>
          <Link href="/dashboard/profile" className={buttonClass("primary", "mt-4")}>
            Add a game
          </Link>
        </Section>
      ) : (
        <Section title="Add stats">
          <StatForm games={games.map((g) => g.game)} defaultGame={profile.game ?? games[0].game} />
        </Section>
      )}

      <Section title="History" line="Your newest entry for each game is the one shown on your profile and leaderboards.">
        <StatHistory entries={entries as unknown as StatEntry[]} />
      </Section>
    </div>
  );
}
