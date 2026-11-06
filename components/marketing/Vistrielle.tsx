import { WingsBackdrop } from "@/components/brand/WingsBackdrop";
import { ButtonLink } from "@/components/ui/Button";
import { CONTACT_EMAIL, copy } from "@/content/copy";

/**
 * Vistrielle by Victress: a restrained introduction to an initiative in development. It ties each focus area to an existing
 * pillar and repeats that pillar's real status, so nothing here reads as a live program or an offer.
 */
export function Vistrielle() {
  const e = copy.vistrielle;
  const pillar = (id: string) => copy.home.pillars.find((p) => p.id === id)!;
  return (
    <section
      aria-labelledby="vistrielle-title"
      className="relative overflow-hidden border-t border-line"
    >
      <WingsBackdrop
        variant="band"
        className="-right-40 -top-6 hidden w-[760px] max-w-none sm:block"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <span className="inline-flex rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-signal">
          {e.eyebrow}
        </span>
        <h2
          id="vistrielle-title"
          className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl"
        >
          {e.title}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-mute">{e.line}</p>
        <p className="mt-3 max-w-2xl text-mute">{e.why}</p>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
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
                  {e.builtOn}{" "}
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
      </div>
    </section>
  );
}
