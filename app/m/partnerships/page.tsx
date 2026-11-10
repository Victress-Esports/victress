import type { Metadata } from "next";
import Image from "next/image";
import { PartnerSample } from "@/components/marketing/PartnerSample";
import { WingsBackdrop } from "@/components/brand/WingsBackdrop";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { PARTNER_PLANS, isComing, marketingText } from "@/content/partner";
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
const STEPS = [
  { title: "Sign up.", line: "Create your organization account." },
  { title: "Choose a plan.", line: "Free, or paid through Stripe." },
  { title: "Start in your dashboard.", line: "Your Partner section opens right away." },
];

/**
 * /partnerships: Apple One style. Short headlines, one line each, big visuals. One way to become a Partner: the button to victress.gg/partner.
 * Plans, prices and benefits come from content/partner-entitlements.ts (approved brief); an unbuilt benefit carries one plain Coming soon label.
 * Nobody is told to email or contact anyone. No hyphens or em dashes (victressesports.com rule). Nothing is placed before "Women in Esports".
 */
export default function Partnerships() {
  return (
    <>
      <JsonLd data={marketingCrumbs("Partnerships", "/partnerships")} />

      <section aria-labelledby="hero-title">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-24">
          <Image src="/brand/wings-emblem-256.webp" alt="" width={96} height={96} priority className="h-20 w-auto sm:h-24" />
          <h1 id="hero-title" className="mt-8 font-display text-5xl font-bold leading-[1.05] sm:text-7xl">
            Partner to grow Women in Esports.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-mute sm:text-xl">Open to universities, companies, leagues, communities and nonprofits.</p>
          <div className="mt-10">
            <ButtonLink href={appUrl("/partner")}>Become a Partner</ButtonLink>
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
                <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                  <span className="tnum font-display text-5xl font-bold">{pl.price}</span>
                  <span className="text-mute">{pl.priceLine}</span>
                </p>
                {pl.includes ? <p className="mt-6 text-sm font-semibold">Everything in {PARTNER_PLANS.find((x) => x.id === pl.includes)?.name}, plus:</p> : <p className="mt-6 text-sm font-semibold">Includes:</p>}
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
                  <ButtonLink href={appUrl("/partner")}>Become a Partner</ButtonLink>
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

      <section aria-labelledby="commitment-title" className="relative overflow-hidden border-t border-line">
        <WingsBackdrop variant="band" className="-right-40 -top-6 hidden w-[760px] max-w-none sm:block" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          {/* Nothing sits above or before the name: the initiative is called "Women in Esports". */}
          <h2 id="commitment-title" className={h2}>
            Women in Esports
          </h2>
          <ul className="mt-8 flex max-w-2xl flex-col gap-3 text-lg text-mute sm:text-xl">
            <li>Women who compete face extra barriers.</li>
            <li>Partners help address them, and see what their participation involved.</li>
            <li>We listen to women players and communities first.</li>
          </ul>
          <div className="mt-10">
            <ButtonLink href={appUrl("/partner")}>Become a Partner</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
