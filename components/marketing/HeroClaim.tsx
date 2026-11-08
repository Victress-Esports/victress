import { SampleTag } from "@/components/marketing/SampleTag";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * Above the fold, and nothing else: the headline, one sentence, ONE button with one small line under it, and one product
 * preview labeled Sample. No badges, counters, product cards, secondary buttons or extra links. The preview is static (no
 * stats: Victress does not publish stats players enter).
 */
export function HeroClaim({ title, sentence, primary, note }: { title: string; sentence: string; primary: string; note: string }) {
  return (
    <section>
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-10 sm:px-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1fr_26rem] lg:gap-20 lg:pb-16 lg:pt-8">
        <div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">{title}</h1>
          <p className="mt-5 max-w-xl text-lg text-mute sm:text-xl">{sentence}</p>
          <div className="mt-8">
            <ButtonLink href="/design-partner">{primary}</ButtonLink>
            <p className="mt-3 text-sm text-mute">{note}</p>
          </div>
        </div>

        <Card as="article" aria-label="Sample Player Resume" className="mx-auto w-full max-w-sm lg:max-w-none">
          <header className="flex items-center gap-4">
            <div aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface-2 font-display text-xl font-bold text-coral">
              Y
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-bold">yourname</p>
              <p className="truncate text-sm text-mute">Player Resume</p>
            </div>
            <SampleTag />
          </header>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
            <span className="rounded-full bg-surface-2 px-3.5 py-1.5">VALORANT</span>
            <span className="rounded-full bg-surface-2 px-3.5 py-1.5">Duelist</span>
            <span className="rounded-full bg-crimson px-3.5 py-1.5">Diamond</span>
          </div>
          <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-mute">Tournament</dt>
              <dd className="font-semibold">Spring Open, 2nd place</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-mute">Highlight</dt>
              <dd className="font-semibold">Ace on Bind</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-mute">Team</dt>
              <dd className="font-semibold">Example Club</dd>
            </div>
          </dl>
        </Card>
      </div>
    </section>
  );
}
