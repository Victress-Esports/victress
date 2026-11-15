import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { marketingCrumbs } from "@/lib/jsonld";
import { WomenStrip } from "@/components/marketing/WomenStrip";
import { pageMetadata } from "@/lib/seo";
import { appUrl } from "@/lib/urls";

export const metadata: Metadata = pageMetadata({ ...seo.marketing.about, path: "/about", image: "about" });

export default function About() {
  const a = copy.about;
  const pillars = copy.home.pillars;
  const h2 = "font-display text-2xl font-bold";
  const list = "mt-4 list-disc space-y-2 pl-5 text-lg text-mute";
  return (
    <>
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <JsonLd data={marketingCrumbs("About", "/about")} />
      <h1 className="font-display text-5xl font-bold sm:text-6xl">{a.title}</h1>
      <p className="mt-8 text-xl">{a.intro}</p>
      <p className="mt-4 text-xl text-mute">{a.story}</p>

      <section aria-labelledby="path" className="mt-14">
        <h2 id="path" className={h2}>
          {a.pathTitle}
        </h2>
        <ol className="mt-6 space-y-4">
          {a.path.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="tnum w-6 shrink-0 font-semibold text-signal">{i + 1}</span>
              <p className="text-lg">
                <span className="font-semibold">{step.title}.</span>{" "}
                <span className="text-mute">{step.line}</span>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="pillars" className="mt-14">
        <h2 id="pillars" className={h2}>
          {a.pillarsTitle}
        </h2>
        <ul className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-line bg-line">
          {pillars.map((p) => (
            <li key={p.id} className="bg-carbon p-6">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-xl font-bold">{p.title}</h3>
                {p.soon ? (
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-signal">{copy.home.soonLabel}</span>
                ) : null}
              </div>
              <p className="mt-2 text-mute">{p.line}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="women" id="women-in-esports" className="mt-14 scroll-mt-24">
        <h2 id="women" className={h2}>
          {a.womenTitle}
        </h2>
        {a.women.map((para, i) => (
          <p key={i} className={`mt-4 text-lg ${i === 0 ? "" : "text-mute"}`}>
            {para}
          </p>
        ))}
      </section>

      <section aria-labelledby="value" className="mt-14">
        <h2 id="value" className={h2}>
          {a.valueTitle}
        </h2>
        <p className="mt-4 text-lg text-mute">{a.value}</p>
      </section>

      <section aria-labelledby="now" className="mt-14">
        <h2 id="now" className={h2}>
          {a.nowTitle}
        </h2>
        <ul className={list}>
          {a.offers.map((o) => (
            <li key={o.text}>
              {o.text}
              {o.soon ? (
                <span className="ml-2 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-signal">{copy.home.soonLabel}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <ButtonLink href={appUrl("/login")} className="mt-12">
        {a.cta}
      </ButtonLink>
    </div>
    <WomenStrip />
    </>
  );
}
