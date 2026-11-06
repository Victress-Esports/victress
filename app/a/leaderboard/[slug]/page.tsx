import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui/Button";
import { GAME_LIST, formatStat, gameBySlug } from "@/content/games";
import { supabasePublic } from "@/lib/supabase/public";
import { marketingUrl } from "@/lib/urls";

export const revalidate = 60;

/** A board opens once this many real (non-demo) players have entered stats for the game. */
const MIN_PLAYERS = 10;

/** Demo players are only ever included where LEADERBOARD_INCLUDE_DEMO=true (dev and preview, never production). */
const includeDemo = () => process.env.LEADERBOARD_INCLUDE_DEMO === "true";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const game = gameBySlug((await params).slug);
  if (!game) return { title: "Leaderboard", robots: { index: false } };
  return {
    title: `${game.name} leaderboard`,
    description: `See how ${game.name} players on Victress compare. Stats are self-reported.`,
    alternates: { canonical: `/leaderboard/${game.slug}` },
  };
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

  const db = supabasePublic();
  const demo = includeDemo();
  const { data: count } = await db.rpc("leaderboard_player_count", { p_game: game.id, p_include_demo: demo });
  const players = count ?? 0;
  const open = players >= MIN_PLAYERS;

  const { data: rows } = open
    ? await db.rpc("leaderboard", { p_game: game.id, p_metric: stat.key, p_limit: 50, p_include_demo: demo })
    : { data: [] };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
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
              {(rows ?? []).map((r) => (
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
                    <Link href={`/${r.handle}`} className="block truncate font-semibold hover:underline">
                      {r.display_name || r.handle}
                      {r.is_demo ? <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-coral">Demo</span> : null}
                    </Link>
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
