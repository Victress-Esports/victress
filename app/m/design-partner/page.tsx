import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/ContactForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { Card } from "@/components/ui/Card";
import { copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { marketingCrumbs } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  ...seo.marketing.designPartner,
  path: "/design-partner",
  image: "home",
});

function List({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: readonly string[];
}) {
  return (
    <Card as="section" aria-labelledby={id}>
      <h2 id={id} className="font-display text-2xl font-bold">
        {title}
      </h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-mute">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </Card>
  );
}

export default function DesignPartner() {
  const d = copy.designPartner;
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <JsonLd data={marketingCrumbs("Design Partner", "/design-partner")} />
      <h1 className="font-display text-5xl font-bold leading-tight sm:text-6xl">
        {d.title}
      </h1>
      <p className="mt-5 text-xl text-mute">{d.line}</p>
      <p
        role="note"
        className="mt-6 max-w-2xl rounded-2xl border border-line bg-surface p-5 text-mute"
      >
        {d.status}
      </p>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        <List id="receive-title" title={d.receiveTitle} items={d.receive} />
        <List id="expected-title" title={d.expectedTitle} items={d.expected} />
        <List id="for-title" title={d.forTitle} items={d.for} />
      </div>

      <section aria-labelledby="apply-title" className="mt-16 max-w-xl">
        <h2
          id="apply-title"
          className="font-display text-3xl font-bold sm:text-4xl"
        >
          {d.applyTitle}
        </h2>
        <div className="mt-6">
          <ContactForm
            kind="organization"
            id="dp"
            submitLabel={copy.contactPage.orgSubmit}
          />
        </div>
      </section>
    </div>
  );
}
