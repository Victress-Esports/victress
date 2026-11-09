import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CONTACT_EMAIL, copy } from "@/content/copy";
import { PARTNER_PLANS } from "@/content/partner";
import { seo } from "@/content/seo";
import { marketingCrumbs } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";
import { appUrl } from "@/lib/urls";

export const metadata: Metadata = pageMetadata({
  ...seo.marketing.partnerships,
  path: "/partnerships",
  image: "home",
});

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
      <p className="mt-6 text-mute">
        <a
          href="/design-partner"
          className="inline-block py-1 font-semibold text-white underline underline-offset-2"
        >
          The Founding Design Partner pilot
        </a>{" "}
        is open to women&apos;s rosters, Game Changers teams and collegiate
        programs.
      </p>
      <section className="mt-16" aria-labelledby="partner-plans">
        <h2 id="partner-plans" className="font-display text-3xl font-bold">
          Partner with Victress.
        </h2>
        <p className="mt-3 max-w-2xl text-mute">
          Partner is an account for organizations: universities, companies, esports organizations, leagues, community groups and nonprofits. Partners take part in
          addressing the barriers women competitors face in esports, and see what happened. Partners do not get access to player profiles, scrims or contact details.
        </p>
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {PARTNER_PLANS.map((pl) => (
            <Card as="li" key={pl.id}>
              <h3 className="font-display text-xl font-bold">{pl.name}</h3>
              <p className="mt-2">
                <span className="font-display text-3xl font-bold">{pl.price}</span> <span className="text-mute">{pl.priceLine}</span>
              </p>
              <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-mute">
                {pl.includes.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </Card>
          ))}
        </ul>
        <ButtonLink href={appUrl("/partner")} className="mt-8">
          Become a Partner
        </ButtonLink>
      </section>
      <p className="mt-6 text-sm text-mute">
        Questions about partnering?{" "}
        <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(p.subject)}`} className="inline-block py-1 font-semibold text-white underline underline-offset-2">
          {CONTACT_EMAIL}
        </a>
      </p>
    </div>
  );
}
