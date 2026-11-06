import type { Metadata } from "next";
import { WingArt } from "@/components/brand/WingArt";
import { ClaimInput } from "@/components/marketing/ClaimInput";
import { LeaderboardMock, ProfileCardMock, ProgressMock } from "@/components/marketing/Mockups";
import { WaitlistButton } from "@/components/marketing/WaitlistButton";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { organizationAndWebsite } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";
import { GAMES, type GameId } from "@/content/games";
import { appUrl } from "@/lib/urls";

export const metadata: Metadata = pageMetadata({ ...seo.marketing.home, path: "/", image: "home" });

const visuals = { profile: ProfileCardMock, progress: ProgressMock, leaderboard: LeaderboardMock };

export default function Home() {
  const h = copy.home;
  return (
    <>
      <JsonLd data={organizationAndWebsite()} />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div>
            <h1 className="font-display text-4xl font-bold leading-[1.05] min-[400px]:text-5xl sm:text-7xl">{h.hero.title}</h1>
            <p className="mt-5 max-w-md text-lg text-mute">{h.hero.line}</p>
            <div className="mt-10">
              <ClaimInput id="claim-hero" />
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(closest-side,rgba(207,20,43,0.30),transparent)]" />
            <WingArt preload className="h-auto w-full" />
          </div>
        </div>
      </section>

      {/* Three steps */}
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

      {/* Games: VALORANT and CS2 are featured; the other four are open in onboarding and profiles. */}
      <section aria-labelledby="games-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="reveal">
          <p className="text-sm font-semibold uppercase tracking-widest text-coral">{h.games.eyebrow}</p>
          <h2 id="games-title" className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">
            {h.games.title}
          </h2>
          <p className="mt-4 max-w-md text-lg text-mute">{h.games.line}</p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {h.games.cards.map((c) => (
              <li key={c.id} className="lift rounded-3xl border border-line bg-surface p-8">
                {/* Art slot: add official game key art here only with permission. */}
                <h3 className="font-display text-3xl font-bold">{GAMES[c.id as GameId].name}</h3>
                <p className="mt-2 text-mute">{c.line}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-mute">
            <span className="font-semibold text-white">{h.games.alsoLabel}</span> {h.games.also.join(", ")}.
          </p>
          <p className="mt-2 text-sm text-mute">{h.games.note}</p>
        </div>
      </section>

      {/* Features */}
      {h.features.map((f, i) => {
        const Visual = visuals[f.id as keyof typeof visuals];
        return (
          <section key={f.id} className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className={`reveal grid items-center gap-12 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div>
                <h2 className="font-display text-4xl font-bold leading-tight sm:text-5xl">{f.title}</h2>
                <p className="mt-4 max-w-md text-lg text-mute">{f.line}</p>
              </div>
              <div className="flex justify-center">
                <Visual />
              </div>
            </div>
          </section>
        );
      })}

      {/* For teams */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="reveal rounded-3xl border border-line bg-surface px-6 py-14 text-center sm:px-12">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">{h.teams.title}</h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-mute">{h.teams.line}</p>
          <ButtonLink href={appUrl("/login?next=/dashboard/team")} className="mt-8">
            {h.teams.cta}
          </ButtonLink>
        </div>
      </section>

      {/* Coming soon */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <p className="text-sm font-semibold uppercase tracking-widest text-coral">{h.soon.eyebrow}</p>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2">
          {h.soon.items.map((it) => (
            <li key={it.interest} className="lift flex flex-col justify-between gap-6 rounded-3xl border border-line bg-surface p-8">
              <div>
                <h3 className="font-display text-2xl font-bold">{it.title}</h3>
                <p className="mt-2 text-mute">{it.line}</p>
              </div>
              <div>
                <WaitlistButton interest={it.interest} label={h.soon.cta} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Final CTA */}
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
