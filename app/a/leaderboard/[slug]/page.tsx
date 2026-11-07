import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { GAME_LIST, formatStat, gameBySlug } from "@/content/games";
import { leaderboardSeo, seo } from "@/content/seo";
import { breadcrumbs } from "@/lib/jsonld";
import { MIN_PLAYERS, boardPlayerCount, includeDemo } from "@/lib/leaderboard";
import { pageMetadata, privateMetadata } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_URL, marketingUrl } from "@/lib/urls";

export const revalidate = 60;

type BoardRow = {
  place: number; handle: string; display_name: string | null; avatar_url: string | null; role: string | null; rank: string | null;
  value: number; matches: number | null; is_demo: boolean;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const game = gameBySlug((await params).slug);
  if (!game) return privateMetadata(seo.app.notFound.title, seo.app.notFound.description);
  const meta = pageMetadata({ ...leaderboardSeo(game.name), path: `/leaderboard/${game.slug}`, image: "leaderboard" });
  // A board that has not opened yet is a thin page: keep it out of the index until it has real players.
  const open = (await boardPlayerCount(game.id)) >= MIN_PLAYERS;
  return open ? meta : { ...meta, robots: { index: false, follow: true } };
}

export default async function Leaderboard({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ by?: string }>;
}) {
  const game = gameBySlug((await params).slug);
  if (!game) notFound();
  const sp = await searchParams;
  const stat = game.stats.find((s) => s.key === sp.by) ?? game.stats.find((s) => s.key === game.leaderboardStat)!;

  const db = supabaseAdmin();
  const demo = includeDemo();
  const players = await boardPlayerCount(game.id);
  const open = players >= MIN_PLAYERS;

  const { data: rows } = open && db
    ? await db.rpc("board_entries", { p_game: game.id, p_metric: stat.key, p_limit: 50, p_include_demo: demo })
    : { data: [] };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <JsonLd
        data={breadcrumbs([
          { name: "Home", url: APP_URL },
          { name: `${game.name} leaderboard`, url: `${APP_URL}/leaderboard/${game.slug}` },
        ])}
      />
      <header className="flex items-center justify-between">
        <Logo href={marketingUrl("/")} />
        <Link href="/dashboard" className={buttonClass("ghost", "min-h-11 px-3 text-sm")}>
          Your dashboard
        </Link>
      </header>

      <main id="main" className="mt-8">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Leaderboards</h1>

        <nav aria-label="Games" className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            {GAME_LIST.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/leaderboard/${g.slug}`}
                  aria-current={g.id === game.id ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-xl border px-4 text-sm font-semibold ${
                    g.id === game.id ? "border-crimson bg-crimson" : "border-line bg-surface text-mute hover:text-white"
                  }`}
                >
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {demo ? (
          <p className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-coral">
            Preview build: demo players are included and labeled Demo.
          </p>
        ) : null}

        {!open ? (
          <section className="mt-8 rounded-3xl border border-dashed border-line p-8 text-center">
            <h2 className="font-display text-3xl font-bold">The {game.name} board opens soon.</h2>
            <p className="mx-auto mt-3 max-w-md text-mute">
              It opens at {MIN_PLAYERS} players. <span className="tnum">{players}</span> of {MIN_PLAYERS} so far. Add your stats to help it open.
            </p>
            <Link href="/dashboard/stats" className={buttonClass("primary", "mt-6")}>
              Add your stats
            </Link>
          </section>
        ) : (
          <section className="mt-8" aria-label={`${game.name} leaderboard`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-mute">Ranked by</span>
              {game.stats.map((s) => (
                <Link
                  key={s.key}
                  href={`/leaderboard/${game.slug}?by=${s.key}`}
                  aria-current={s.key === stat.key ? "true" : undefined}
                  className={`inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold ${
                    s.key === stat.key ? "bg-surface-2 text-white" : "text-mute hover:text-white"
                  }`}
                >
                  {s.label}
                </Link>
              ))}
            </div>

            <ol className="mt-4 flex flex-col gap-2">
              {((rows ?? []) as BoardRow[]).map((r) => (
                <li key={r.handle} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                  <span className="tnum w-8 shrink-0 text-lg font-bold text-coral">{r.place}</span>
                  {r.avatar_url ? (
                    <Image src={r.avatar_url} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-crimson to-warm-coral font-bold">
                      {(r.display_name || r.handle).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {r.display_name || r.handle}
                      {r.is_demo ? <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-coral">Demo</span> : null}
                    </span>
                    <p className="truncate text-sm text-mute">{[r.role, r.rank].filter(Boolean).join(" · ") || `@${r.handle}`}</p>
                  </div>
                  <div className="text-right">
                    <p className="tnum text-lg font-bold">{formatStat(stat, Number(r.value))}</p>
                    {r.matches != null ? <p className="tnum text-xs text-mute">{Number(r.matches)} matches</p> : null}
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-mute">Stats are entered by players and labeled Self-reported. Each player&apos;s newest entry counts.</p>
          </section>
        )}
      </main>
    </div>
  );
}
