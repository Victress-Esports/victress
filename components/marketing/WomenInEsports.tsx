import { WingsBackdrop } from "@/components/brand/WingsBackdrop";
import { ButtonLink } from "@/components/ui/Button";
import { CONTACT_EMAIL, copy } from "@/content/copy";

/**
 * Victress Women in Esports: a secondary, community-impact section. Smaller than the product pillars on purpose.
 * Each focus area names the existing pillar it connects to and repeats that pillar's real status, so nothing here
 * reads as a live program or an offer.
 */
export function WomenInEsports() {
  const e = copy.womenInEsports;
  const pillar = (id: string) => copy.home.pillars.find((p) => p.id === id)!;
  return (
    <section
      aria-labelledby="women-in-esports-title"
      className="relative overflow-hidden border-t border-line"
    >
      <WingsBackdrop
        variant="band"
        className="-right-40 -top-6 hidden w-[760px] max-w-none sm:block"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <span className="inline-flex rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-signal">
          {e.eyebrow}
        </span>
        {/* Accessible name is the full written reference: "Victress Women in Esports". */}
        <h2
          id="women-in-esports-title"
          className="mt-4 font-display font-bold leading-tight"
        >
          <span className="block text-sm uppercase tracking-[0.18em] text-mute">
            {e.brand}
          </span>{" "}
          <span className="mt-1 block text-3xl sm:text-4xl">{e.title}</span>
        </h2>
        <p className="mt-3 text-mute">{e.line}</p>
        <p className="mt-2 max-w-2xl text-lg">{e.message}</p>

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
                    (
                    {p.status === "live"
                      ? copy.home.statusLive
                      : copy.home.statusSoon}
                    )
                  </span>
                </p>
              </li>
            );
          })}
        </ol>

        <p className="mt-8 max-w-2xl text-sm text-mute">{e.note}</p>
        <ButtonLink
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(e.subject)}`}
          variant="secondary"
          className="mt-6"
        >
          {e.cta}
        </ButtonLink>
        <ButtonLink
          href="/women-in-esports"
          variant="ghost"
          className="mt-6 ml-2"
        >
          {copy.home.sharedValueLink}
        </ButtonLink>
      </div>
    </section>
  );
}
