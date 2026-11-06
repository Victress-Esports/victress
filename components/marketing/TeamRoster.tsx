import { SampleTag } from "@/components/marketing/SampleTag";

/** A sample roster with an invite link. Static: the rows slide in with the section. */
export function TeamRoster() {
  const rows = [
    ["Sample A", "Owner"],
    ["Sample B", "Player"],
    ["Sample C", "Player"],
    ["Sample D", "Coach"],
  ];
  return (
    <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-[0_30px_80px_-30px_rgba(207,20,43,0.45)] sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Your club</p>
        <SampleTag />
      </div>
      <p className="tnum mt-4 truncate rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-mute">victress.gg/join/yourclub</p>
      <ul className="mt-4 flex flex-col gap-2">
        {rows.map(([n, r]) => (
          <li key={n} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-crimson to-warm-coral text-sm font-bold">
              {n.slice(-1)}
            </span>
            <span className="flex-1 font-semibold">{n}</span>
            <span className="text-xs text-mute">{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
