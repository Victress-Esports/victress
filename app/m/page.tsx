import type { Metadata } from "next";
import { FaqList } from "@/components/marketing/FaqList";
import { HeroClaim } from "@/components/marketing/HeroClaim";
import { ProductCards } from "@/components/marketing/ProductCards";
import { TeamRoster } from "@/components/marketing/TeamRoster";
import { WomenInEsports } from "@/components/marketing/WomenInEsports";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { copy } from "@/content/copy";
import { GAME_LIST } from "@/content/games";
import { seo } from "@/content/seo";
import { faqPage, organizationAndWebsite } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";
import { appUrl } from "@/lib/urls";

export const metadata: Metadata = pageMetadata({
  ...seo.marketing.home,
  path: "/",
  image: "home",
});

export default function Home() {
  const h = copy.home;
  return (
    <>
      <JsonLd data={organizationAndWebsite()} />
      <JsonLd data={faqPage(h.faq)} />

      <HeroClaim
        title={h.hero.title}
        sentence={h.hero.sentence}
        primary={h.hero.primary}
        secondary={h.hero.secondary}
      />

      <section
        aria-labelledby="products-title"
        className="border-t border-line"
      >
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <h2
            id="products-title"
            className="font-display text-4xl font-bold leading-tight sm:text-5xl"
          >
            {h.productsTitle}
          </h2>
          <p className="mt-4 max-w-xl text-lg text-mute">{h.productsLine}</p>
          <ProductCards />
        </div>
      </section>

      <section aria-labelledby="games-title" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2
            id="games-title"
            className="font-display text-2xl font-bold sm:text-3xl"
          >
            {h.games.title}
          </h2>
          <p className="mt-2 text-mute">{h.games.line}</p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-lg font-semibold">
            {GAME_LIST.map((g) => (
              <li key={g.id}>{g.name}</li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="teams-title" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <Card className="reveal grid items-center gap-12 lg:grid-cols-2 sm:p-12">
            <div>
              <h2
                id="teams-title"
                className="font-display text-4xl font-bold leading-tight sm:text-5xl"
              >
                {h.teams.title}
              </h2>
              <p className="mt-4 max-w-md text-lg text-mute">{h.teams.line}</p>
              <p className="mt-2 max-w-md text-sm text-mute">{h.teams.soon}</p>
              <ButtonLink
                href={appUrl("/login?next=/dashboard/team")}
                className="mt-8"
              >
                {h.teams.cta}
              </ButtonLink>
            </div>
            <div className="flex justify-center">
              <TeamRoster />
            </div>
          </Card>
        </div>
      </section>

      <WomenInEsports />

      <section
        aria-labelledby="faq-title"
        className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 sm:pb-28"
      >
        <h2
          id="faq-title"
          className="font-display text-3xl font-bold sm:text-4xl"
        >
          {h.faqTitle}
        </h2>
        <div className="mt-8">
          <FaqList items={h.faq} />
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <h2 className="font-display text-5xl font-bold sm:text-6xl">
            {h.final.title}
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink href={appUrl("/login")}>{h.final.cta}</ButtonLink>
            <ButtonLink href={appUrl("/login")} variant="secondary">
              {h.final.login}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
