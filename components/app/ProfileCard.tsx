import Image from "next/image";

export interface ProfileCardProps {
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  game: string | null;
  role: string | null;
  rank: string | null;
  teamName: string | null;
  stats: { label: string; value: string }[];
  appHost: string;
}

/** The public profile card. Used for the live preview on the dashboard and the public page. */
export function ProfileCard(p: ProfileCardProps) {
  const name = p.displayName || p.handle;
  const facts = [
    ["Game", p.game],
    ["Role", p.role],
    ["Rank", p.rank],
  ] as const;

  return (
    <article className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-[0_30px_80px_-30px_rgba(207,20,43,0.45)]">
      <header className="flex items-center gap-4">
        {p.avatarUrl ? (
          <Image src={p.avatarUrl} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div
            aria-hidden
            className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-crimson to-warm-coral font-display text-2xl font-bold"
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{name}</h1>
          <p className="truncate text-sm text-mute">
            {p.appHost}/{p.handle}
          </p>
          {p.teamName ? <p className="truncate text-sm text-coral">{p.teamName}</p> : null}
        </div>
      </header>

      <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
        {facts.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-surface-2 px-2 py-3">
            <dt className="text-xs text-mute">{k}</dt>
            <dd className="mt-1 truncate text-sm font-semibold">{v ?? "—"}</dd>
          </div>
        ))}
      </dl>

      {p.stats.length ? (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            {p.stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-surface-2 px-4 py-3">
                <dt className="text-xs text-mute">{s.label}</dt>
                <dd className="tnum mt-1 text-2xl font-bold">{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-mute">Self-reported stats</p>
        </>
      ) : null}
    </article>
  );
}
