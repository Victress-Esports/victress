import type { Metadata } from "next";
import { ClaimInput } from "@/components/marketing/ClaimInput";
import { FaqList } from "@/components/marketing/FaqList";
import { GamePicker } from "@/components/marketing/GamePicker";
import { HeroClaim } from "@/components/marketing/HeroClaim";
import { LeaderboardClimb } from "@/components/marketing/LeaderboardClimb";
import { ProfileMoment } from "@/components/marketing/ProfileMoment";
import { StatChart } from "@/components/marketing/StatChart";
import { TeamRoster } from "@/components/marketing/TeamRoster";
import { WaitlistButton } from "@/components/marketing/WaitlistButton";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { faqPage, organizationAndWebsite } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";
import { appUrl } from "@/lib/urls";

export const metadata: Metadata = pageMetadata({ ...seo.marketing.home, path: "/", image: "home" });

// One product moment per scroll section. Every moment is a labeled Sample: nothing here is real player data.
const moments = { profile: ProfileMoment, progress: StatChart, leaderboard: LeaderboardClimb };

export default function Home() {
  const h = copy.home;
  return (
    <>
      <JsonLd data={organizationAndWebsite()} />
      <JsonLd data={faqPage(h.faq)} />

      <HeroClaim title={h.hero.title} line={h.hero.line} />

      <section aria-label="How it works" className="border-y border-line">
        <ol className="mx-auto grid max-w-6xl gap-px px-4 sm:grid-cols-3 sm:px-6">
          {h.steps.map((s) => (
            <li key={s.n} className="flex items-center gap-4 py-8">
              <span className="tnum grid h-10 w-10 shrink-0 place-items-center rounded-full bg-crimson font-bold">{s.n}</span>
              <span className="font-display text-2xl font-bold">{s.title}</span>
            </li>
          ))}
        </ol>
      </section>

      {h.features.map((f, i) => {
        const Moment = moments[f.id as keyof typeof moments];
        return (
          <section key={f.id} className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className={`reveal grid items-center gap-12 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div>
                <h2 className="font-display text-4xl font-bold leading-tight sm:text-5xl">{f.title}</h2>
                <p className="mt-4 max-w-md text-lg text-mute">{f.line}</p>
              </div>
              <div className="flex justify-center">
                <Moment />
              </div>
            </div>
          </section>
        );
      })}

      <section aria-labelledby="games-title" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="reveal">
            <h2 id="games-title" className="font-display text-4xl font-bold leading-tight sm:text-5xl">
              {h.games.title}
            </h2>
            <p className="mt-4 max-w-md text-lg text-mute">{h.games.line}</p>
            <div className="mt-10">
              <GamePicker />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="reveal grid items-center gap-12 rounded-3xl border border-line bg-surface/40 p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight sm:text-5xl">{h.teams.title}</h2>
            <p className="mt-4 max-w-md text-lg text-mute">{h.teams.line}</p>
            <ButtonLink href={appUrl("/login?next=/dashboard/team")} className="mt-8">
              {h.teams.cta}
            </ButtonLink>
          </div>
          <div className="flex justify-center">
            <TeamRoster />
          </div>
        </div>
      </section>

      <section aria-labelledby="soon-title" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <h2 id="soon-title" className="sr-only">
          {h.soon.eyebrow}
        </h2>
        <ul className="grid gap-5 sm:grid-cols-2">
          {h.soon.items.map((it) => (
            <li key={it.interest} className="lift flex flex-col justify-between gap-8 rounded-3xl border border-line bg-surface p-8">
              <div>
                <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-coral">{h.soon.eyebrow}</span>
                <h3 className="mt-4 font-display text-2xl font-bold">{it.title}</h3>
                <p className="mt-2 text-mute">{it.line}</p>
              </div>
              <div>
                <WaitlistButton interest={it.interest} label={h.soon.cta} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq-title" className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 sm:pb-28">
        <h2 id="faq-title" className="font-display text-3xl font-bold sm:text-4xl">
          {h.faqTitle}
        </h2>
        <div className="mt-8">
          <FaqList items={h.faq} />
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <h2 className="font-display text-5xl font-bold sm:text-7xl">{h.final.title}</h2>
          <div className="mt-10 flex w-full justify-center">
            <ClaimInput id="claim-final" />
          </div>
        </div>
      </section>
    </>
  );
}
