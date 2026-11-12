/** Small line chart in plain SVG. Server renderable, no script. `zero` draws a baseline at 0 when values cross it. */
export function MiniChart({ values, label, width = 520, height = 120, zero = false }: { values: number[]; label: string; width?: number; height?: number; zero?: boolean }) {
  if (values.length < 2) return <p className="text-sm text-mute">Not enough games yet for a chart.</p>;
  const min = Math.min(...values, zero ? 0 : Infinity), max = Math.max(...values, zero ? 0 : -Infinity);
  const span = max - min || 1, pad = 6;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (values.length - 1);
  const y = (v: number) => height - pad - ((v - min) * (height - pad * 2)) / span;
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
      {zero && min < 0 && max > 0 ? <line x1={pad} x2={width - pad} y1={y(0)} y2={y(0)} stroke="currentColor" className="text-line" strokeDasharray="4 4" /> : null}
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="text-coral" />
    </svg>
  );
}
