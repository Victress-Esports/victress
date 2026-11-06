import { SampleTag, SoonTag } from "@/components/marketing/SampleTag";
import { Card } from "@/components/ui/Card";

/** Illustrative only. Every number and name below is invented, and both cards are labeled. */
export function ScrimSample() {
  const rows = [
    ["Player A", "82", "71%", "1.2"],
    ["Player B", "74", "68%", "1.0"],
    ["Player C", "61", "59%", "0.8"],
  ];
  return (
    <Card as="figure" className="w-full max-w-md" aria-label="Sample scrim summary">
      <figcaption className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Scrim summary</p>
        <span className="flex gap-2">
          <SampleTag />
          <SoonTag />
        </span>
      </figcaption>
      <table className="tnum mt-4 w-full text-left text-sm">
        <thead className="text-xs text-mute">
          <tr>
            <th scope="col" className="pb-2 font-medium">Player</th>
            <th scope="col" className="pb-2 font-medium">ADR</th>
            <th scope="col" className="pb-2 font-medium">KAST</th>
            <th scope="col" className="pb-2 font-medium">K/D</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([n, ...v]) => (
            <tr key={n} className="border-t border-line">
              <th scope="row" className="py-2.5 font-semibold">{n}</th>
              {v.map((x, i) => (
                <td key={i} className="py-2.5">{x}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function ScoutSample() {
  const rows = [
    ["Player A", "Duelist", "Diamond"],
    ["Player B", "Controller", "Ascendant"],
    ["Player C", "Sentinel", "Diamond"],
  ];
  return (
    <Card as="figure" className="w-full max-w-md" aria-label="Sample prospect list">
      <figcaption className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Prospects</p>
        <span className="flex gap-2">
          <SampleTag />
          <SoonTag />
        </span>
      </figcaption>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-mute">
        {["Game", "Role", "Rank"].map((f) => (
          <span key={f} className="rounded-full border border-line px-3 py-1">
            {f}
          </span>
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {rows.map(([n, role, rank]) => (
          <li key={n} className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-3">
            <span className="flex-1 font-semibold">{n}</span>
            <span className="text-xs text-mute">{role}</span>
            <span className="text-xs text-mute">{rank}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
