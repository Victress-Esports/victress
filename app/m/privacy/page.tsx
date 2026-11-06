import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { marketingCrumbs } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ ...seo.marketing.privacy, path: "/privacy", image: "home" });

export default function Privacy() {
  const l = copy.legal.privacy;
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <JsonLd data={marketingCrumbs("Privacy", "/privacy")} />
      <h1 className="font-display text-5xl font-bold">{l.title}</h1>
      <p className="mt-3 text-sm text-coral">{l.updated}</p>
      <div className="mt-8 space-y-4 text-lg text-mute">
        {l.body.map((s) => (
          <p key={s}>{s}</p>
        ))}
      </div>
    </div>
  );
}
