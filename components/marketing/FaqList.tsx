/** Plain accordion built on <details>: works without JavaScript and is fully readable by crawlers. */
export function FaqList({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((f) => (
        <details key={f.q} className="group py-1">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
            {f.q}
            <span aria-hidden className="text-coral transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="pb-5 text-mute">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
