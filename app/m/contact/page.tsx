import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/ContactForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { Card } from "@/components/ui/Card";
import { CONTACT_EMAIL, copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { marketingCrumbs } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  ...seo.marketing.contact,
  path: "/contact",
  image: "home",
});

export default function Contact() {
  const c = copy.contactPage;
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <JsonLd data={marketingCrumbs("Contact", "/contact")} />
      <h1 className="font-display text-5xl font-bold sm:text-6xl">{c.title}</h1>
      <p className="mt-5 text-xl text-mute">{c.line}</p>
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card as="section" aria-labelledby="partner-title" className="lg:col-span-2">
          <h2 id="partner-title" className="font-display text-2xl font-bold">
            {c.partnerTitle}
          </h2>
          <p className="mt-2 mb-6 text-mute">{c.partnerLine}</p>
          <ContactForm kind="partnership" id="partner" submitLabel={c.partnerSubmit} />
        </Card>
        <Card as="section" aria-labelledby="org-title">
          <h2 id="org-title" className="font-display text-2xl font-bold">
            {c.orgTitle}
          </h2>
          <p className="mt-2 mb-6 text-mute">{c.orgLine}</p>
          <ContactForm kind="organization" id="org" submitLabel={c.orgSubmit} />
        </Card>
        <Card as="section" aria-labelledby="player-title">
          <h2 id="player-title" className="font-display text-2xl font-bold">
            {c.playerTitle}
          </h2>
          <p className="mt-2 mb-6 text-mute">{c.playerLine}</p>
          <ContactForm kind="player" id="player" submitLabel={c.playerSubmit} />
        </Card>
      </div>
      <p className="mt-10 text-mute">
        {c.emailLine}{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-block py-1 font-semibold text-white underline underline-offset-2"
        >
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </div>
  );
}
