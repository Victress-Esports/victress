import type { Metadata } from "next";
import Link from "next/link";
import { HeroClaim } from "@/components/marketing/HeroClaim";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { organizationAndWebsite } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  ...seo.marketing.home,
  path: "/",
  image: "home",
});

const section = "border-t border-line";
const inner = "mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28";
const h2 = "font-display text-3xl font-bold leading-tight sm:text-5xl";

/** One idea per section, in this order: the three products, how it works, the design partner pilot, one closing button. */
export default function Home() {
  const h = copy.home;
  const d = copy.designPartner;
  const soonTag = "inline-flex rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-coral";
  return (
    <>
      <JsonLd data={organizationAndWebsite()} />

      <HeroClaim title={h.hero.title} sentence={h.hero.sentence} primary={h.hero.primary} note={h.hero.note} />

      <section aria-labelledby="products-title" className={section}>
        <div className={inner}>
          <h2 id="products-title" className={h2}>
            {h.productsTitle}
          </h2>
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {h.pillars.map((p) => (
              <li key={p.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-2xl font-bold">{p.title}</h3>
                  {p.soon ? <span className={soonTag}>{h.soonLabel}</span> : null}
                </div>
                <p className="mt-3 text-lg text-mute">{p.line}</p>
                <Link href={`/platform#${p.id}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:text-coral">
                  {h.learnMore}
                  <span className="sr-only">: {p.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="how-title" className={section}>
        <div className={inner}>
          <h2 id="how-title" className={h2}>
            {h.howTitle}
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {h.steps.map((s, i) => (
              <li key={s.title}>
                <p className="tnum text-sm font-semibold text-signal">{i + 1}</p>
                <h3 className="mt-2 font-display text-2xl font-bold">{s.title}</h3>
                <p className="mt-2 text-lg text-mute">{s.line}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="pilot-title" className={section}>
        <div className={inner}>
          <h2 id="pilot-title" className={h2}>
            {h.pilotTitle}
          </h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {[
              { title: d.forTitle, items: d.for },
              { title: d.expectedTitle, items: d.expected },
              { title: d.receiveTitle, items: d.receive },
            ].map((col) => (
              <div key={col.title}>
                <h3 className="font-display text-xl font-bold">{col.title}</h3>
                <ul className="mt-3 space-y-2 text-mute">
                  {col.items.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-10 max-w-2xl text-sm text-mute">{d.status} {copy.womenInEsports.note}</p>
        </div>
      </section>

      <section aria-labelledby="closing-title" className={section}>
        <div className={`${inner} text-center`}>
          <h2 id="closing-title" className="sr-only">
            {h.closing.cta}
          </h2>
          <ButtonLink href="/design-partner">{h.closing.cta}</ButtonLink>
        </div>
      </section>
    </>
  );
}
