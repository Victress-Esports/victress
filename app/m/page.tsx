import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RolePicker } from "@/components/marketing/RolePicker";
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
 * Apple One style: clear and to the point. The hero (one button), what brings you here (pick a role, see its next step),
 * the three products, simple pricing, Women in Esports, questions and answers.
 */
export default function Home() {
  const h = copy.home;
  const e = copy.womenInEsports;
  const soonTag = "inline-flex rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-coral";
  return (
    <>
      <JsonLd data={organizationAndWebsite()} />

      <section aria-labelledby="hero-title">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-24">
          <Image src="/brand/wings-emblem-256.webp" alt="" width={96} height={96} priority className="h-20 w-auto sm:h-24" />
          <h1 id="hero-title" className="mt-8 font-display text-5xl font-bold leading-[1.05] sm:text-7xl">
            {h.hero.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-mute sm:text-xl">{h.hero.sentence}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink href={appUrl("/login")}>{h.hero.primary}</ButtonLink>
          </div>
          <p className="mt-3 text-sm text-mute">{h.hero.note}</p>
        </div>
      </section>

      <RolePicker />

      <section aria-labelledby="products-title" className={section}>
        <div className={inner}>
          <h2 id="products-title" className={`${h2} max-w-3xl`}>
            {h.productsTitle}
          </h2>
          <ul className="mt-12 grid gap-5 md:grid-cols-3">
            {h.pillars.map((p) => (
              <li key={p.id} className="flex flex-col rounded-2xl border border-line bg-surface p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-2xl font-bold">{p.title}</h3>
                  {p.soon ? <span className={soonTag}>{h.soonLabel}</span> : null}
                </div>
                <p className="mt-3 text-lg text-mute">{p.line}</p>
                <div className="mt-auto flex flex-wrap items-center gap-x-5 pt-6">
                  <Link
                    href={p.href.startsWith("app:") ? appUrl(p.href.slice(4)) : p.href}
                    className="inline-flex min-h-11 items-center text-sm font-semibold text-coral hover:text-white"
                  >
                    {p.cta} <span aria-hidden>&nbsp;→</span>
                  </Link>
                  <Link href={`/platform#${p.id}`} className="inline-flex min-h-11 items-center text-sm text-mute underline underline-offset-4 hover:text-white">
                    {h.learnMore}
                    <span className="sr-only">: {p.title}</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="women-title" className="px-4 pb-20 sm:px-6 sm:pb-28">
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

    </>
  );
}
