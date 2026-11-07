import { AppFrame } from "@/components/marketing/AppFrame";

/** Product moment 1: a sample profile card (games, role and rank only; Victress does not publish stats players enter). */
export function ProfileMoment() {
  return (
    <AppFrame route="victress.gg/yourname" label="Sample profile frame">
      <article aria-label="Sample player profile">
        <header className="flex items-center gap-4">
          <div
            aria-hidden
            className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-surface-2 font-display text-3xl font-bold text-coral"
          >
            Y
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-2xl font-bold">yourname</p>
            <p className="truncate text-sm text-mute">victress.gg/yourname</p>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
          {["VALORANT", "Duelist", "Diamond"].map((c) => (
            <span key={c} className="rounded-full bg-surface-2 px-3.5 py-1.5">
              {c}
            </span>
          ))}
        </div>

      </article>
    </AppFrame>
  );
}
