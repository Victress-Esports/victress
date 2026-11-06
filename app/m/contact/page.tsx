import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { CONTACT_EMAIL, copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { marketingCrumbs } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ ...seo.marketing.contact, path: "/contact", image: "home" });

export default function Contact() {
  const c = copy.contact;
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <JsonLd data={marketingCrumbs("Contact", "/contact")} />
      <h1 className="font-display text-5xl font-bold sm:text-6xl">{c.title}</h1>
      <p className="mt-6 text-xl text-mute">{c.line}</p>
      <ButtonLink href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(c.subject)}`} className="mt-8">
        {c.cta}
      </ButtonLink>
      <p className="mt-3 text-sm text-mute">{CONTACT_EMAIL}</p>
    </div>
  );
}
