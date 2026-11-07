import { WingsBackdrop } from "@/components/brand/WingsBackdrop";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";

/**
 * Women in Esports: an intentional shared value commitment (strategy section 4), delivered through the same three pillars
 * (docs/strategy/victress-business-purpose.md, section 4). Each focus area names the pillar that delivers it and
 * repeats that pillar's real status, so nothing here reads as a live program or an offer. The About page carries
 * the fuller explanation.
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
        {/* Nothing sits above the headline. The initiative is called "Women in Esports", with nothing in front of it. */}
        <h2
          id="women-in-esports-title"
          className="font-display text-3xl font-bold leading-tight sm:text-4xl"
        >
          {e.title}
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
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/women-in-esports" variant="secondary">
            {copy.home.sharedValueLink}
          </ButtonLink>
          <ButtonLink href="/about#women-in-esports" variant="ghost">
            {e.more}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
