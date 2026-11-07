import { AppFrame } from "@/components/marketing/AppFrame";

/** Illustrative only. Every number and name below is invented, and every frame is labeled Sample. */
export function ScrimSample() {
  const rows = [
    ["Player A", "82", "71%", "1.2"],
    ["Player B", "74", "68%", "1.0"],
    ["Player C", "61", "59%", "0.8"],
  ];
  return (
    <AppFrame route="victress.gg/scrims" label="Sample scrim summary" soon>
      <p className="text-sm font-semibold">Scrim summary</p>
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
    </AppFrame>
  );
}

export function ScoutSample() {
  const rows = [
    ["Player A", "Duelist", "Diamond"],
    ["Player B", "Controller", "Ascendant"],
    ["Player C", "Sentinel", "Diamond"],
  ];
  return (
    <AppFrame route="victress.gg/scout" label="Sample prospect list" soon>
      <p className="text-sm font-semibold">Prospects</p>
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
    </AppFrame>
  );
}
