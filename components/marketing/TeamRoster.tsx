import { SampleTag } from "@/components/marketing/SampleTag";
import { Card } from "@/components/ui/Card";

/** A sample roster with an invite link. Static: the rows slide in with the section. */
export function TeamRoster() {
  const rows = [
    ["Sample A", "Owner"],
    ["Sample B", "Player"],
    ["Sample C", "Player"],
    ["Sample D", "Coach"],
  ];
  return (
    <Card className="w-full max-w-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Your club</p>
        <SampleTag />
      </div>
      <p className="tnum mt-4 truncate rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-mute">victress.gg/join/yourclub</p>
      <ul className="mt-4 flex flex-col gap-2">
        {rows.map(([n, r]) => (
          <li key={n} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-carbon text-sm font-bold text-coral">
              {n.slice(-1)}
            </span>
            <span className="flex-1 font-semibold">{n}</span>
            <span className="text-xs text-mute">{r}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
