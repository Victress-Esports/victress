import { SampleTag } from "@/components/marketing/SampleTag";

// CSS/SVG product mockups. All data is sample data, labeled as such.
const Frame = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <figure className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-[0_30px_80px_-30px_rgba(207,20,43,0.45)]">
    <div role="img" aria-label={label}>
      {children}
    </div>
    <figcaption className="mt-5">
      <SampleTag />
    </figcaption>
  </figure>
);

export function ProfileCardMock() {
  return (
    <Frame label="Sample player profile card">
      <div className="flex items-center gap-4">
        {/* Photo slot: replace with a real player photo later. */}
        <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-crimson to-warm-coral font-display text-2xl font-bold">
          S
        </div>
        <div>
          <p className="text-lg font-bold">SampleAce</p>
          <p className="text-sm text-mute">victress.gg/sampleace</p>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
        {[
          ["Game", "VALORANT"],
          ["Role", "Duelist"],
          ["Rank", "Diamond"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-surface-2 px-2 py-3">
            <dt className="text-xs text-mute">{k}</dt>
            <dd className="mt-1 text-sm font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {[
          ["K/D", "1.24"],
          ["Win rate", "58%"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-surface-2 px-4 py-3">
            <dt className="text-xs text-mute">{k}</dt>
            <dd className="tnum mt-1 text-2xl font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-mute">Self-reported stats</p>
    </Frame>
  );
}

export function ProgressMock() {
  const pts = [38, 42, 40, 51, 49, 58, 62, 60, 71];
  const w = 320, h = 120;
  const path = pts.map((v, i) => `${i ? "L" : "M"}${(i / (pts.length - 1)) * w} ${h - (v / 80) * h}`).join(" ");
  return (
    <Frame label="Sample chart of a player's rating rising over nine weeks">
      <p className="text-sm text-mute">Rating, last 9 weeks</p>
      <p className="tnum mt-1 text-4xl font-bold">
        71 <span className="text-base font-semibold text-coral">+33</span>
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-32 w-full" aria-hidden>
        <path d={`${path} L${w} ${h} L0 ${h} Z`} fill="var(--crimson)" opacity="0.18" />
        <path d={path} fill="none" stroke="var(--signal)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Frame>
  );
}

const ROWS = [
  ["SampleAce", "Diamond", "1,842"],
  ["DemoNova", "Diamond", "1,790"],
  ["TestRaven", "Platinum", "1,733"],
  ["MockSage", "Platinum", "1,701"],
  ["FakeViper", "Gold", "1,655"],
];

export function LeaderboardMock() {
  return (
    <Frame label="Sample leaderboard with five players">
      <p className="text-sm font-semibold">Club leaderboard</p>
      <ol className="mt-4 space-y-2">
        {ROWS.map(([name, rank, score], i) => (
          <li key={name} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${i === 0 ? "bg-crimson" : "bg-surface-2"}`}>
            <span className="tnum w-5 text-sm font-bold">{i + 1}</span>
            <span className="flex-1 text-sm font-semibold">{name}</span>
            <span className={`text-xs ${i === 0 ? "text-white" : "text-mute"}`}>{rank}</span>
            <span className="tnum w-12 text-right text-sm font-bold">{score}</span>
          </li>
        ))}
      </ol>
    </Frame>
  );
}
