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
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <JsonLd data={marketingCrumbs("About", "/about")} />
      <h1 className="font-display text-5xl font-bold sm:text-6xl">{a.title}</h1>
      <div className="mt-8 space-y-4 text-xl text-mute">
        {a.body.map((s) => (
          <p key={s}>{s}</p>
        ))}
      </div>
      <ButtonLink href={appUrl("/login")} className="mt-10">
        {a.cta}
      </ButtonLink>
    </div>
  );
}
