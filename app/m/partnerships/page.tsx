import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CONTACT_EMAIL, copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { marketingCrumbs } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ ...seo.marketing.partnerships, path: "/partnerships", image: "home" });

export default function Partnerships() {
  const p = copy.partnerships;
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28">
      <JsonLd data={marketingCrumbs("Partnerships", "/partnerships")} />
      <h1 className="font-display text-5xl font-bold sm:text-6xl">{p.title}</h1>
      <p className="mt-6 max-w-2xl text-xl text-mute">{p.line}</p>
      <ul className="mt-12 grid gap-5 md:grid-cols-3">
        {p.groups.map((g) => (
          <Card as="li" key={g.title}>
            <h2 className="font-display text-xl font-bold">{g.title}</h2>
            <p className="mt-2 text-mute">{g.line}</p>
          </Card>
        ))}
      </ul>
      <p className="mt-8 text-sm text-mute">{p.note}</p>
      <ButtonLink href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(p.subject)}`} className="mt-8">
        {p.cta}
      </ButtonLink>
      <p className="mt-3 text-sm text-mute">{CONTACT_EMAIL}</p>
    </div>
  );
}
