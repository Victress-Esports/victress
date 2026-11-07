import type { Metadata } from "next";
import { WingsBackdrop } from "@/components/brand/WingsBackdrop";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { CONTACT_EMAIL, copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { marketingCrumbs } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  ...seo.marketing.womenInEsports,
  path: "/women-in-esports",
  image: "home",
});

export default function WomenInEsportsPage() {
  const e = copy.womenInEsports;
  const w = copy.womenPage;
  const h = copy.home;
  const pillar = (id: string) => h.pillars.find((x) => x.id === id)!;
  return (
    <div>
      <JsonLd data={marketingCrumbs("Women in Esports", "/women-in-esports")} />
      <header className="relative overflow-hidden">
        <WingsBackdrop
          variant="band"
          className="-right-40 -top-6 hidden w-[760px] max-w-none sm:block"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pt-24">
          <h1 className="font-display text-5xl font-bold leading-tight sm:text-6xl">
            {w.title}
          </h1>
          <p className="mt-4 text-lg text-mute">{e.line}</p>
          <p className="mt-2 max-w-2xl text-xl">{e.message}</p>
        </div>
      </header>

      <section aria-labelledby="why-title" className="border-t border-line">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2
            id="why-title"
            className="font-display text-3xl font-bold sm:text-4xl"
          >
            {w.whyTitle}
          </h2>
          <div className="mt-6 space-y-4 text-lg text-mute">
            {w.why.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="areas-title" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2
            id="areas-title"
            className="font-display text-3xl font-bold sm:text-4xl"
          >
            {w.areasTitle}
          </h2>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
            {e.areas.map((a, i) => {
              const p = pillar(a.pillar);
              return (
                <li key={a.title} className="bg-carbon p-6 sm:p-8">
                  <p className="tnum text-sm font-semibold text-signal">
                    0{i + 1}
                  </p>
                  <h3 className="mt-3 font-display text-2xl font-bold">
                    {a.title}
                  </h3>
                  <p className="mt-2 text-mute">{a.line}</p>
                  <p className="mt-6 border-t border-line pt-4 text-sm text-mute">
                    {e.connectedTo}{" "}
                    <span className="font-semibold text-white">{p.title}</span>
                    <span className="mt-1 block text-xs">
                      ({p.statusLabel})
                    </span>
                    <span className="mt-3 block text-white">
                      {w.today[a.pillar]}
                    </span>
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="commitments-title"
        className="border-t border-line"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2
            id="commitments-title"
            className="font-display text-3xl font-bold sm:text-4xl"
          >
            {w.commitmentsTitle}
          </h2>
          <p className="mt-3 max-w-xl text-mute">{w.commitmentsLine}</p>
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {w.commitments.map((c) => (
              <li
                key={c.title}
                className="rounded-2xl border border-line bg-surface p-6"
              >
                <h3 className="font-display text-xl font-bold">
                  {c.title}
                </h3>
                <span className="mt-3 inline-flex rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-coral">
                  {w.inDevelopment}
                </span>
                <p className="mt-2 text-mute">{c.line}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="pilot-title" className="border-t border-line">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2
            id="pilot-title"
            className="font-display text-3xl font-bold sm:text-4xl"
          >
            {w.pilotTitle}
          </h2>
          <p className="mt-4 text-lg text-mute">{w.pilot}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/design-partner">{w.pilotCta}</ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              {w.contactCta}
            </ButtonLink>
          </div>
          <p className="mt-10 max-w-2xl text-sm text-mute">{e.note}</p>
          <p className="mt-2 text-sm text-mute">{CONTACT_EMAIL}</p>
        </div>
      </section>
    </div>
  );
}
