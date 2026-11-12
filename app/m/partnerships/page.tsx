import type { Metadata } from "next";
import { PartnerSample } from "@/components/marketing/PartnerSample";
import { WingsBackdrop } from "@/components/brand/WingsBackdrop";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { CHALLENGE_AREAS, IMPACT_CATEGORIES, PARTNER_PLANS, WAYS, marketingText, type PartnerPlanId } from "@/content/partnerships-data";
import { seo } from "@/content/seo";
import { marketingCrumbs } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  ...seo.marketing.partnerships,
  path: "/partnerships",
  image: "home",
});

const section = "border-t border-line";
const inner = "mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28";
const h2 = "font-display text-3xl font-bold leading-tight sm:text-5xl";
const lead = "mt-5 max-w-2xl text-lg text-mute sm:text-xl";
const chip = "rounded-full border border-line bg-surface-2 px-3 py-1 text-sm text-mute";

/** The one primary action on this page. /contact is the existing, working way to reach the team (its form emails Victress). */
const TALK = "/contact";
function TalkButton() {
  return <ButtonLink href={TALK}>Talk with our team</ButtonLink>;
}

const MANAGE = [
  "Organization profile and partnership status",
  "Partner plan",
  "Challenges and initiatives",
  "Participation",
  "Opportunities",
  "Impact summary",
  "Supported teams",
  "Contributions and resources provided",
];

const JOURNEY: { title: string; line: string; chips: string[] }[] = [
  { title: "Discover", line: "Explore initiatives, challenges and opportunities across the Victress community.", chips: CHALLENGE_AREAS.map((a) => a.label) },
  { title: "Participate", line: "Choose how your organization wants to contribute and where it can make a difference.", chips: WAYS.map((w) => w.label.replace("&", "and")) },
  { title: "Support", line: "Provide funding, equipment, software, expertise, mentorship, infrastructure and opportunities.", chips: ["Funding", "Equipment", "Software", "Expertise", "Mentorship", "Infrastructure", "Opportunities"] },
  { title: "Measure", line: "Follow supported teams, contributions, program results and the impact of your involvement.", chips: IMPACT_CATEGORIES.map((c) => c.label.replace("&", "and")) },
];

const AREAS = [
  { title: "Resources", line: "Provide funding, software and equipment that help players and teams develop." },
  { title: "Expertise and Mentorship", line: "Share coaching, career experience and professional knowledge." },
  { title: "Infrastructure", line: "Provide spaces, hardware, servers and other resources that help esports programs operate and grow." },
  { title: "Opportunities", line: "Create access to scholarships, internships, tryouts and career pathways." },
];

const WHY = [
  "Connect with esports communities.",
  "Support developing players and teams.",
  "Contribute resources and expertise.",
  "Participate in meaningful initiatives.",
  "Build relationships across the esports ecosystem.",
  "Track contributions and outcomes.",
  "Demonstrate the impact of your involvement.",
];

const RELATIONSHIP = [
  "You start a conversation with Victress.",
  "You meet with our team to talk about your goals and interests.",
  "We identify the right partnership level and opportunities.",
  "We agree on the partnership and its objectives.",
  "You receive onboarding and support.",
  "We work together over time and review progress and impact.",
];

/** Support by level: only the approved commitments. */
const SUPPORT: Record<PartnerPlanId, string> = {
  community: "Free community participation and self service access.",
  supporting: "Guided onboarding and partner support.",
  anchor: "A dedicated Victress partnership representative assigned to your organization.",
  anchor_exclusive: "A dedicated relationship manager, exclusivity coordination and strategic partnership support.",
};

const LEVEL_INTRO: Record<PartnerPlanId, string> = {
  community: "Start taking part.",
  supporting: "Support developing teams.",
  anchor: "Build the partnership with us.",
  anchor_exclusive: "Lead a category.",
};

export default function Partnerships() {
  return (
    <>
      <JsonLd data={marketingCrumbs("Partnerships", "/partnerships")} />

      <section aria-labelledby="hero-title">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24">
          <h1 id="hero-title" className="font-display text-5xl font-bold leading-[1.05] sm:text-7xl">
            Build something meaningful with Victress.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-mute sm:text-xl">
            Work directly with our team to create a partnership that supports esports players, teams and programs while advancing your organization&apos;s goals.
          </p>
          <div className="mt-10">
            <TalkButton />
          </div>
        </div>
      </section>

      <section aria-labelledby="dashboard-title" className={section}>
        <div className={inner}>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-end">
            <div>
              <h2 id="dashboard-title" className={h2}>
                One place for your partnership.
              </h2>
              <p className={lead}>Your Partner dashboard is where your organization manages its relationship and involvement with Victress.</p>
              <ul className="mt-8 grid gap-2 text-mute">
                {MANAGE.map((m) => (
                  <li key={m} className="flex gap-3">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
            <PartnerSample />
          </div>
        </div>
      </section>

      <section aria-labelledby="journey-title" className={section}>
        <div className={inner}>
          <h2 id="journey-title" className={`${h2} max-w-3xl`}>
            From first look to measured impact.
          </h2>
          <ol className="relative mt-14 grid gap-12 lg:grid-cols-4 lg:gap-6">
            <span aria-hidden className="absolute bottom-4 left-5 top-4 w-px bg-line lg:bottom-auto lg:left-5 lg:right-5 lg:top-5 lg:h-px lg:w-auto" />
            {JOURNEY.map((s, i) => (
              <li key={s.title} className="relative pl-16 lg:pl-0 lg:pt-16">
                <span className="tnum absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full border border-line bg-carbon font-display text-lg font-bold text-signal">{i + 1}</span>
                <h3 className="font-display text-2xl font-bold">{s.title}</h3>
                <p className="mt-2 text-mute">{s.line}</p>
                <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${s.title} examples`}>
                  {s.chips.map((c) => (
                    <li key={c} className={chip}>
                      {c}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="areas-title" className={section}>
        <div className={inner}>
          <h2 id="areas-title" className={`${h2} max-w-3xl`}>
            Four ways to make a difference.
          </h2>
          <p className={lead}>Most organizations already have something players need. Start with what you have.</p>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2">
            {AREAS.map((a) => (
              <li key={a.title} className="rounded-3xl border border-line bg-surface p-6 sm:p-10">
                <h3 className="font-display text-2xl font-bold sm:text-3xl">{a.title}</h3>
                <p className="mt-3 text-lg text-mute">{a.line}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="why-title" className={section}>
        <div className={`${inner} grid gap-10 lg:grid-cols-2`}>
          <div>
            <h2 id="why-title" className={h2}>
              Why organizations partner with us.
            </h2>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {WHY.map((w) => (
              <li key={w} className="py-4 text-lg">
                {w}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="relationship-title" className={section}>
        <div className={inner}>
          <h2 id="relationship-title" className={`${h2} max-w-3xl`}>
            You work with people, not just an account.
          </h2>
          <p className={lead}>A Victress partnership starts with a conversation and grows through a relationship with our team.</p>
          <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {RELATIONSHIP.map((r, i) => (
              <li key={r} className="flex gap-4 rounded-2xl border border-line bg-surface p-6">
                <span className="tnum font-display text-3xl font-bold text-signal">{i + 1}</span>
                <span className="text-lg">{r}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="levels-title" className={section}>
        <div className={inner}>
          <h2 id="levels-title" className={`${h2} max-w-3xl`}>
            Four levels of partnership.
          </h2>
          <p className={lead}>Each level adds involvement and support. Pricing is discussed with the Victress team as part of the partnership conversation.</p>
          <ol className="mt-12 flex flex-col gap-5">
            {PARTNER_PLANS.map((pl, i) => {
              const parent = pl.includes ? PARTNER_PLANS.find((x) => x.id === pl.includes)?.name : null;
              return (
                <li
                  key={pl.id}
                  className="grid gap-8 rounded-3xl border border-line bg-surface p-6 sm:p-10 lg:grid-cols-[1fr_1.4fr]"
                  style={{ marginLeft: `min(${i * 1.5}rem, 4.5vw)` }}
                >
                  <div>
                    <p className="text-sm font-semibold text-signal">Level {i + 1}</p>
                    <h3 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{pl.name}</h3>
                    <p className="mt-1 font-semibold">{LEVEL_INTRO[pl.id]}</p>
                    <p className="mt-4 text-mute">
                      <span className="font-semibold text-white">Partner support. </span>
                      {SUPPORT[pl.id]}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{parent ? `Everything in ${parent}, plus:` : "Includes:"}</p>
                    <ul className="mt-3 flex flex-col gap-2 text-mute">
                      {pl.benefits.map((b) => (
                        <li key={b.id} className="flex gap-3">
                          <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                          {marketingText(b)}
                        </li>
                      ))}
                    </ul>
                    {pl.id === "anchor_exclusive" ? <p className="mt-4 text-sm text-mute">Victress approves the category as part of the partnership agreement.</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-6 max-w-3xl text-sm text-mute">
            Benefits are delivered through your partnership agreement and onboarding. Your Victress contact confirms what is available to you when you start and as the platform grows.
          </p>
        </div>
      </section>

      <section aria-labelledby="trust-title" className={section}>
        <div className={inner}>
          <h2 id="trust-title" className={`${h2} max-w-3xl`}>
            Players stay in control.
          </h2>
          <p className="mt-5 max-w-3xl text-xl font-semibold">Partners do not automatically receive player profiles or private player data. Players decide what information they share.</p>
          <p className={lead}>
            Any sharing is by permission. A player chooses what to share and with whom. Financial support does not buy access to private player information.
          </p>
        </div>
      </section>

      <section aria-labelledby="close-title" className="relative overflow-hidden border-t border-line">
        <WingsBackdrop variant="band" className="-right-40 -top-6 hidden w-[760px] max-w-none sm:block" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <h2 id="close-title" className={`${h2} max-w-3xl`}>
            More opportunity for players grows esports for everyone.
          </h2>
          <p className={lead}>Women in Esports is our commitment to women who compete. Tell us what your organization can bring, and we will find where it helps most.</p>
          <div className="mt-10">
            <TalkButton />
          </div>
        </div>
      </section>
    </>
  );
}
