import type { Metadata } from "next";
import { ScoutSample, ScrimSample } from "@/components/marketing/PillarVisuals";
import { ProfileMoment } from "@/components/marketing/ProfileMoment";
import { WaitlistButton } from "@/components/marketing/WaitlistButton";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { marketingCrumbs } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";
import { appUrl } from "@/lib/urls";

export const metadata: Metadata = pageMetadata({
  ...seo.marketing.platform,
  path: "/platform",
  image: "home",
});

// Every visual is a labeled Sample; the two unbuilt products are also labeled Coming soon.
const visuals = {
  scrim: ScrimSample,
  resume: ProfileMoment,
  scout: ScoutSample,
};
const waitlist = { scrim: "scrims", scout: "scout" } as const;

export default function Platform() {
  const p = copy.platform;
  const h = copy.home;
  return (
    <div>
      <JsonLd data={marketingCrumbs("Platform", "/platform")} />
      <header className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pt-24">
        <h1 className="font-display text-5xl font-bold leading-tight sm:text-6xl">
          {p.title}
        </h1>
        <p className="mt-5 max-w-2xl text-xl text-mute">{p.line}</p>
      </header>

      <section aria-labelledby="pathway-title" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2
            id="pathway-title"
            className="font-display text-3xl font-bold sm:text-4xl"
          >
            {p.pathwayTitle}
          </h2>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-5">
            {p.steps.map((s, i) => (
              <li key={s.title} className="flex flex-col bg-carbon p-5">
                <span className="tnum text-sm font-semibold text-signal">
                  0{i + 1}
                </span>
                <h3 className="mt-2 font-display text-xl font-bold">
                  {s.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-mute">{s.line}</p>
                <p className="mt-4 border-t border-line pt-3 text-xs text-mute">
                  {s.product}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {h.pillars.map((pillar, i) => {
        const Visual = visuals[pillar.id as keyof typeof visuals];
        const live = pillar.status === "live";
        const detail = p.products[pillar.id as keyof typeof p.products];
        return (
          <section
            key={pillar.id}
            id={pillar.id}
            aria-labelledby={`${pillar.id}-title`}
            className="scroll-mt-20 border-t border-line"
          >
            <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
              <div
                className={`grid items-center gap-12 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${live ? "bg-crimson text-white" : "bg-surface-2 text-coral"}`}
                  >
                    {live ? h.statusLive : h.statusSoon}
                  </span>
                  <h2
                    id={`${pillar.id}-title`}
                    className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl"
                  >
                    {pillar.title}
                  </h2>
                  <p className="mt-4 max-w-md text-lg text-mute">
                    {pillar.line}
                  </p>
                  <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-mute">
                    {p.todayTitle}
                  </h3>
                  {detail.today.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-mute">
                      {detail.today.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-mute">{p.nothingToday}</p>
                  )}
                  <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-mute">
                    {p.plannedTitle}
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-mute">
                    {detail.planned.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    {live ? (
                      <ButtonLink href={appUrl("/login")}>
                        {h.final.cta}
                      </ButtonLink>
                    ) : (
                      <WaitlistButton
                        interest={waitlist[pillar.id as keyof typeof waitlist]}
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

      <section
        aria-labelledby="provenance-title"
        className="border-t border-line"
      >
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <Card>
            <h2
              id="provenance-title"
              className="font-display text-3xl font-bold"
            >
              {p.provenanceTitle}
            </h2>
            <p className="mt-4 text-lg text-mute">{p.provenance}</p>
          </Card>
          <div className="mt-10">
            <ButtonLink href="/design-partner">{p.cta}</ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
