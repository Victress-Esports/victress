import type { Metadata } from "next";
import { Section } from "@/components/ui/form";
import { CHALLENGE_AREAS, PARTNER_SECTION_LINES } from "@/content/partner";
import { getGame } from "@/content/games";
import { requirePartner } from "@/lib/partner";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Partner Challenges | Victress", "The challenges Victress is working to address, with documented findings.");

interface Summary {
  players: number | null;
  teams: number | null;
  games: { game: string; players: number }[];
  minimum_group: number;
}

export default async function Challenges() {
  const { sb } = await requirePartner();
  const [{ data: findings }, { data: summary }] = await Promise.all([
    sb.from("partner_findings").select("id, area, title, summary, source, published_at").order("published_at", { ascending: false }),
    sb.rpc("partner_ecosystem_summary"),
  ]);
  const s = summary as Summary | null;
  const shown = (n: number | null | undefined) => (n == null ? `Fewer than ${s?.minimum_group ?? 5}` : String(n));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Challenges</h1>
        <p className="mt-2 text-mute">{PARTNER_SECTION_LINES.challenges} Findings are documented and published by Victress, with their source.</p>
      </div>

      <Section title="Platform totals" line="Counts only. No player is identified, and any group smaller than 5 is not shown.">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-mute">Players with a profile</dt>
            <dd className="tnum mt-1 font-display text-3xl font-bold">{shown(s?.players)}</dd>
          </div>
          <div>
            <dt className="text-sm text-mute">Teams</dt>
            <dd className="tnum mt-1 font-display text-3xl font-bold">{shown(s?.teams)}</dd>
          </div>
          <div>
            <dt className="text-sm text-mute">Games played</dt>
            <dd className="mt-1 text-sm">
              {s?.games?.length ? (
                <ul className="flex flex-col gap-1">
                  {s.games.map((g) => (
                    <li key={g.game} className="tnum">
                      {getGame(g.game)?.name ?? g.game}: {g.players}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-mute">No game has 5 or more players yet.</span>
              )}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-mute">Victress does not currently report these totals by gender.</p>
      </Section>

      {CHALLENGE_AREAS.map((a) => {
        const list = (findings ?? []).filter((f) => f.area === a.id);
        return (
          <Section key={a.id} title={a.label} line={a.line}>
            {list.length === 0 ? (
              <p className="text-mute">No findings published for this area yet.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {list.map((f) => (
                  <li key={f.id} className="rounded-2xl border border-line bg-surface-2 p-4">
                    <p className="font-semibold">{f.title}</p>
                    <p className="mt-1 text-mute">{f.summary}</p>
                    <p className="mt-2 text-sm text-mute">Source: {f.source}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        );
      })}
    </div>
  );
}
