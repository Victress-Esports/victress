import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { marketingCrumbs } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";
import { appUrl } from "@/lib/urls";

export const metadata: Metadata = pageMetadata({ ...seo.marketing.about, path: "/about", image: "about" });

export default function About() {
  const a = copy.about;
  const list = "mt-4 list-disc space-y-2 pl-5 text-lg text-mute";
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <JsonLd data={marketingCrumbs("About", "/about")} />
      <h1 className="font-display text-5xl font-bold sm:text-6xl">{a.title}</h1>
      <p className="mt-8 text-xl">{a.intro}</p>
      <p className="mt-4 text-xl text-mute">{a.story}</p>
      <section aria-labelledby="now" className="mt-12">
        <h2 id="now" className="font-display text-2xl font-bold">
          {a.nowTitle}
        </h2>
        <ul className={list}>
          {a.now.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="planned" className="mt-10">
        <h2 id="planned" className="font-display text-2xl font-bold">
          {a.plannedTitle}
        </h2>
        <ul className={list}>
          {a.planned.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
      <ButtonLink href={appUrl("/login")} className="mt-12">
        {a.cta}
      </ButtonLink>
    </div>
  );
}
