/** Small status label. `tone` only changes emphasis; the words carry the meaning. */
export function StatusChip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "on" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        tone === "on" ? "border-crimson text-white" : "border-line bg-surface-2 text-mute"
      }`}
    >
      {children}
    </span>
  );
}
