import type { Metadata } from "next";
import { PartnerSample } from "@/components/marketing/PartnerSample";
import Link from "next/link";
import { WingsBackdrop } from "@/components/brand/WingsBackdrop";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { PARTNER_PLANS, marketingText, type PartnerPlanId } from "@/content/partnerships-data";
import { seo } from "@/content/seo";
import { marketingCrumbs } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";
import { appUrl } from "@/lib/urls";

export const metadata: Metadata = pageMetadata({
  ...seo.marketing.partnerships,
  path: "/partnerships",
  image: "home",
});

const section = "border-t border-line";
const inner = "mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28";
const h2 = "font-display text-3xl font-bold leading-tight sm:text-5xl";
const lead = "mt-5 max-w-2xl text-lg text-mute sm:text-xl";

/** The one action on this page: register as a partner organization. The partner experience itself lives in the Partner platform. */
function BecomePartner() {
  return <ButtonLink href={appUrl("/login?role=partner")}>Become a Partner</ButtonLink>;
}

const AREAS = [
  { title: "Resources", line: "Provide funding, software and equipment that help players and teams develop." },
  { title: "Expertise and Mentorship", line: "Share coaching, career experience and professional knowledge." },
  { title: "Infrastructure", line: "Provide spaces, hardware, servers and other resources that help esports programs operate and grow." },
  { title: "Opportunities", line: "Create access to scholarships, internships, tryouts and career pathways." },
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
            Support esports players, teams and programs, and see the impact of your involvement.
          </p>
          <div className="mt-10">
            <BecomePartner />
          </div>
          <p className="mt-4 max-w-md text-sm text-mute">Create your account now. Your Partner dashboard opens here when the Partner platform launches.</p>
        </div>
      </section>

      <section aria-labelledby="dashboard-title" className={section}>
        <div className={inner}>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-end">
            <div>
              <h2 id="dashboard-title" className={h2}>
                Your partnership, in one place.
              </h2>
              <p className={lead}>Manage your profile, plan, participation, opportunities and impact.</p>
            </div>
            <PartnerSample />
          </div>
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

      <section aria-labelledby="levels-title" className={section}>
        <div className={inner}>
          <h2 id="levels-title" className={`${h2} max-w-3xl`}>
            Four levels of partnership.
          </h2>
          <p className={lead}>Each level adds involvement and support. Pricing is shared directly by the Victress team.</p>
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
          <p className={lead}>Women in Esports is our commitment to women who compete.</p>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <BecomePartner />
            <Link href="/women-in-esports" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:text-coral">
              See how organizations take part
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
