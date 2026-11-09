import type { Metadata } from "next";
import Link from "next/link";
import { HeroClaim } from "@/components/marketing/HeroClaim";
import { IntentPicker } from "@/components/marketing/IntentPicker";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { organizationAndWebsite } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";
import { appUrl } from "@/lib/urls";

export const metadata: Metadata = pageMetadata({
  ...seo.marketing.home,
  path: "/",
  image: "home",
});

const section = "border-t border-line";
const inner = "mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28";
const h2 = "font-display text-3xl font-bold leading-tight sm:text-5xl";

/**
 * One idea per section, in this order: the hero (one button), what brings you here (pick a role, see its next step),
 * the three products with the practice to opportunity path, Women in Esports, a short About story, one closing button.
 */
export default function Home() {
  const h = copy.home;
  const e = copy.womenInEsports;
  const soonTag = "inline-flex rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-coral";
  return (
    <>
      <JsonLd data={organizationAndWebsite()} />

      <HeroClaim title={h.hero.title} sentence={h.hero.sentence} primary={h.hero.primary} note={h.hero.note} />

      <IntentPicker playerHref={appUrl("/login")} teamHref={appUrl("/login?next=/dashboard/team")} />

      <section aria-labelledby="products-title" className={section}>
        <div className={inner}>
          <h2 id="products-title" className={`${h2} max-w-3xl`}>
            {h.productsTitle}
          </h2>
          <ul className="mt-12 border-t border-line">
            {h.pillars.map((p, i) => (
              <li key={p.id} className="grid items-start gap-4 border-b border-line py-8 md:grid-cols-[1fr_1.4fr_auto] md:gap-12">
                <div className="flex items-baseline gap-4">
                  <span className="tnum text-sm font-semibold text-cool-gray">0{i + 1}</span>
                  <h3 className="font-display text-2xl font-bold sm:text-3xl">{p.title}</h3>
                </div>
                <p className="text-lg text-mute">{p.line}</p>
                <div className="flex flex-wrap items-center gap-4">
                  {p.soon ? <span className={soonTag}>{h.soonLabel}</span> : null}
                  <Link href={`/platform#${p.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:text-coral">
                    {h.learnMore}
                    <span className="sr-only">: {p.title}</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-base font-semibold text-mute sm:text-lg">
            {copy.about.path.map((step, i) => (
              <span key={step.title} className="inline-flex items-center gap-3">
                {i > 0 ? <span aria-hidden className="text-coral">→</span> : null}
                <span className={i === 0 || i === copy.about.path.length - 1 ? "text-white" : undefined}>{step.title}</span>
              </span>
            ))}
          </p>
        </div>
      </section>

      <section aria-labelledby="women-title" className="px-4 sm:px-6">
        <div className="mx-auto grid max-w-6xl items-end gap-10 rounded-3xl bg-crimson p-8 sm:p-14 md:grid-cols-2">
          <h2 id="women-title" className="font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
            {e.title}
          </h2>
          <div>
            <p className="text-lg text-white">{e.line} {e.message}</p>
            <p className="mt-4 text-sm text-white/85">{e.note}</p>
            <ButtonLink href="/women-in-esports" variant="ghost" className="mt-8 bg-carbon hover:bg-surface-2">
              {e.more}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section aria-labelledby="about-title" className="mt-20 border-t border-line sm:mt-28">
        <div className={`${inner} grid gap-10 md:grid-cols-2`}>
          <h2 id="about-title" className={h2}>
            {h.aboutTitle}
          </h2>
          <div className="space-y-5 text-lg text-mute">
            {h.aboutLines.map((l) => (
              <p key={l}>{l}</p>
            ))}
            <p className="text-white">{h.aboutFounder}</p>
            <Link href="/about" className="inline-flex min-h-11 items-center text-sm font-semibold text-white underline underline-offset-4 hover:text-coral">
              {h.aboutMore}
            </Link>
          </div>
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
