import type { Metadata } from "next";
import { PricingCards } from "@/components/marketing/PricingCards";
import { JsonLd } from "@/components/seo/JsonLd";
import { copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { faqPage, marketingCrumbs } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ ...seo.marketing.pricing, path: "/pricing", image: "pricing" });

export default function Pricing() {
  const p = copy.pricing;
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <JsonLd data={marketingCrumbs("Pricing", "/pricing")} />
      <JsonLd data={faqPage(p.faq)} />
      <header className="text-center">
        <h1 className="font-display text-5xl font-bold sm:text-6xl">{p.title}</h1>
        <p className="mt-4 text-lg text-mute">{p.line}</p>
      </header>
      <div className="mt-12">
        <PricingCards />
      </div>
      <section aria-labelledby="faq" className="mx-auto mt-24 max-w-2xl">
        <h2 id="faq" className="font-display text-3xl font-bold">
          {p.faqTitle}
        </h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {p.faq.map((f) => (
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
      </section>
    </div>
  );
}
