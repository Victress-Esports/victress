import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { copy } from "@/content/copy";

/** Overview cards for the three products. A product that is not built carries one plain "Coming soon" label; nothing else about status. */
export function ProductCards() {
  const h = copy.home;
  return (
    <ul className="mt-10 grid gap-5 md:grid-cols-3">
      {h.pillars.map((p) => (
        <Card as="li" key={p.id} className="flex flex-col">
          <h3 className="font-display text-2xl font-bold">{p.title}</h3>
          {p.soon ? (
            <span className="mt-3 inline-flex w-fit rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-coral">{h.soonLabel}</span>
          ) : null}
          <p className="mt-3 flex-1 text-mute">{p.line}</p>
          <Link
            href={`/platform#${p.id}`}
            className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-white underline underline-offset-4 hover:text-coral"
          >
            {h.learnMore}
            <span className="sr-only">: {p.title}</span>
          </Link>
        </Card>
      ))}
    </ul>
  );
}
