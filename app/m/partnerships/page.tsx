import type { Metadata } from "next";
import Image from "next/image";
import { PartnerSample } from "@/components/marketing/PartnerSample";
import { WingsBackdrop } from "@/components/brand/WingsBackdrop";
import { JsonLd } from "@/components/seo/JsonLd";
import { PARTNER_PLANS, isComing, marketingText, type PartnerPlanId } from "@/content/partnerships-data";
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

const STEPS = [
  { title: "Sign up.", line: "Create your organization account." },
  { title: "Choose a plan.", line: "Free, or paid through Stripe." },
  { title: "Start.", line: "Your Partner dashboard opens." },
];

/** One short line per plan. The approved benefits themselves come from content/partner-entitlements.ts, unchanged. */
const TAGLINE: Record<PartnerPlanId, string> = {
  community: "Join the community.",
  supporting: "Fund what players need.",
  anchor: "Lead the change.",
  anchor_exclusive: "Own your category.",
};

const WAYS_TO_PARTICIPATE = [
  { title: "Resources", line: "Funding, software and equipment." },
  { title: "Expertise and Mentorship", line: "Coaching, careers and know how." },
  { title: "Infrastructure", line: "Spaces, hardware and servers." },
  { title: "Opportunities", line: "Scholarships, internships and tryouts." },
];

/**
 * TEMPORARY: the Partner signup (victress.gg/partner) is not live yet, so every Become a Partner button is a disabled Coming Soon state, not a link.
 * When the Partner launch merges, replace this with <ComingSoonButton /> (the version on PR #42).
 */
function ComingSoonButton() {
  return (
    <button
      type="button"
      disabled
      aria-label="Become a Partner, Coming Soon"
      className="inline-flex min-h-12 cursor-not-allowed items-center justify-center rounded-xl border border-line bg-surface-2 px-6 text-base font-semibold text-white"
    >
      Coming Soon
    </button>
  );
}

/**
 * /partnerships: Apple style. Emotional hook, then exact steps, then the product. One button per section, all to victress.gg/partner.
 * Plans, prices and every approved benefit come from content/partnerships-data.ts (a copy of the approved entitlements config). A benefit that is not built carries one plain
 * Coming soon label. Nobody is told to email or contact anyone. No hyphens or em dashes. Nothing sits before the name "Women in Esports".
 */
export default function Partnerships() {
  return (
    <>
      <JsonLd data={marketingCrumbs("Partnerships", "/partnerships")} />

      <section aria-labelledby="hero-title">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-24">
          <Image src="/brand/wings-emblem-256.webp" alt="" width={96} height={96} priority className="h-20 w-auto sm:h-24" />
          <h1 id="hero-title" className="mt-8 font-display text-5xl font-bold leading-[1.05] sm:text-7xl">
            Back the next generation.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-mute sm:text-xl">Partner with Victress to grow Women in Esports.</p>
          <div className="mt-10">
            <ComingSoonButton />
          </div>
        </div>
      </section>

      <section aria-labelledby="steps-title" className={section}>
        <div className={inner}>
          <h2 id="steps-title" className="sr-only">
            How it works
          </h2>
          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
                <p className="tnum font-display text-5xl font-bold text-signal">{i + 1}</p>
                <h3 className="mt-6 font-display text-2xl font-bold">{s.title}</h3>
                <p className="mt-2 text-mute">{s.line}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="plans-title" className={section}>
        <div className={inner}>
          <h2 id="plans-title" className={`${h2} max-w-3xl`}>
            Four plans.
          </h2>
          <ul className="mt-12 grid gap-5 md:grid-cols-2">
            {PARTNER_PLANS.map((pl) => (
              <li key={pl.id} className="flex flex-col rounded-3xl border border-line bg-surface p-6 sm:p-8">
                <h3 className="font-display text-2xl font-bold">{pl.name}</h3>
                <p className="mt-1 text-lg font-semibold text-white">{TAGLINE[pl.id]}</p>
                <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                  <span className="tnum font-display text-5xl font-bold">{pl.price}</span>
                  <span className="text-mute">{pl.priceLine}</span>
                </p>
                {pl.id === "community" ? <p className="mt-2 text-sm text-mute">No payment needed.</p> : null}
                <p className="mt-6 text-sm font-semibold">{pl.includes ? `Everything in ${PARTNER_PLANS.find((x) => x.id === pl.includes)?.name}, plus:` : "Includes:"}</p>
                <ul className="mt-3 flex flex-col gap-2 text-mute">
                  {pl.benefits.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-baseline gap-x-2">
                      <span>{marketingText(b)}</span>
                      {isComing(b) ? <span className="whitespace-nowrap rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-coral">Coming soon</span> : null}
                    </li>
                  ))}
                </ul>
                {pl.id === "anchor_exclusive" ? <p className="mt-4 text-sm text-mute">Requested in your dashboard. Victress approves the category.</p> : null}
                <div className="mt-auto pt-8">
                  <ComingSoonButton />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-mute">Partners do not get player profiles or private data. Players decide what is shared.</p>
        </div>
      </section>

      <section aria-labelledby="sample-title" className={section}>
        <div className={inner}>
          <h2 id="sample-title" className={`${h2} mb-12 max-w-3xl`}>
            Your dashboard.
          </h2>
          <PartnerSample />
        </div>
      </section>

      <section aria-labelledby="ways-title" className={section}>
        <div className={inner}>
          <h2 id="ways-title" className={`${h2} max-w-3xl`}>
            Four ways to participate.
          </h2>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WAYS_TO_PARTICIPATE.map((w) => (
              <li key={w.title} className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
                <h3 className="font-display text-2xl font-bold">{w.title}</h3>
                <p className="mt-2 text-mute">{w.line}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="commitment-title" className="relative overflow-hidden border-t border-line">
        <WingsBackdrop variant="band" className="-right-40 -top-6 hidden w-[760px] max-w-none sm:block" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <h2 id="commitment-title" className={h2}>
            Barriers down. Opportunities up.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-mute sm:text-xl">Women in Esports is our commitment to women who compete.</p>
          <div className="mt-10">
            <ComingSoonButton />
          </div>
        </div>
      </section>
    </>
  );
}
