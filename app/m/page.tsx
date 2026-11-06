import type { Metadata } from "next";
import { WingsBackdrop } from "@/components/brand/WingsBackdrop";
import { FaqList } from "@/components/marketing/FaqList";
import { HeroClaim } from "@/components/marketing/HeroClaim";
import { ScoutSample, ScrimSample } from "@/components/marketing/PillarVisuals";
import { ProfileMoment } from "@/components/marketing/ProfileMoment";
import { TeamRoster } from "@/components/marketing/TeamRoster";
import { WaitlistButton } from "@/components/marketing/WaitlistButton";
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

// One small visual per pillar. Every one is labeled Sample; the two unbuilt pillars are also labeled Coming soon.
const visuals = {
  scrim: ScrimSample,
  resume: ProfileMoment,
  scout: ScoutSample,
};
const waitlistInterest = { scrim: "scrims", scout: "scout" } as const;

export default function Home() {
  const h = copy.home;
  return (
    <>
      <JsonLd data={organizationAndWebsite()} />
      <JsonLd data={faqPage(h.faq)} />

      <HeroClaim
        title={h.hero.title}
        sentence={h.hero.sentence}
        cta={h.hero.cta}
        login={h.hero.login}
      />

      {h.pillars.map((p, i) => {
        const Visual = visuals[p.id as keyof typeof visuals];
        const live = p.status === "live";
        return (
          <section
            key={p.id}
            aria-labelledby={`pillar-${p.id}`}
            className="relative overflow-hidden border-t border-line"
          >
            {/* The original wings, cropped and faint, on the two outer pillars. Never behind the product sample. */}
            {i !== 1 ? (
              <WingsBackdrop
                flip={i === 2}
                className={`top-1/2 hidden h-[520px] w-auto -translate-y-1/2 lg:block ${i === 2 ? "-right-56" : "-left-56"}`}
              />
            ) : null}
            <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
              <div
                className={`reveal grid items-center gap-12 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${live ? "bg-crimson text-white" : "bg-surface-2 text-coral"}`}
                  >
                    {live ? h.statusLive : h.statusSoon}
                  </span>
                  <h2
                    id={`pillar-${p.id}`}
                    className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl"
                  >
                    {p.title}
                  </h2>
                  <p className="mt-4 max-w-md text-lg text-mute">{p.line}</p>
                  <p className="mt-2 max-w-md text-sm text-mute">{p.note}</p>
                  <div className="mt-8">
                    {live ? (
                      <ButtonLink href={appUrl("/login")}>
                        {h.hero.cta}
                      </ButtonLink>
                    ) : (
                      <WaitlistButton
                        interest={
                          waitlistInterest[
                            p.id as keyof typeof waitlistInterest
                          ]
                        }
                        label={h.soonCta}
                      />
                    )}
                  </div>
                </div>
                <div className="flex justify-center">
                  <Visual />
                </div>
              </div>
            </div>
          </section>
        );
      })}

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
