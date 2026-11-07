import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { copy } from "@/content/copy";

/** Overview cards for the three products. Each shows its real status and links to its section on /platform. */
export function ProductCards() {
  const h = copy.home;
  return (
    <ul className="mt-10 grid gap-5 md:grid-cols-3">
      {h.pillars.map((p) => {
        const live = p.status === "live";
        return (
          <Card as="li" key={p.id} className="flex flex-col">
            <h3 className="font-display text-2xl font-bold">{p.title}</h3>
            <span
              className={`mt-3 inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${live ? "bg-crimson text-white" : "bg-surface-2 text-coral"}`}
            >
              {live ? h.statusLive : h.statusSoon}
            </span>
            <p className="mt-3 flex-1 text-mute">{p.line}</p>
            <p className="mt-2 text-sm text-mute">{p.note}</p>
            <Link
              href={`/platform#${p.id}`}
              className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-white underline underline-offset-4 hover:text-coral"
            >
              {h.learnMore}
              <span className="sr-only">: {p.title}</span>
            </Link>
          </Card>
        );
      })}
    </ul>
  );
}
