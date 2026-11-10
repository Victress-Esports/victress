import Link from "next/link";

/** A slim, consistent reminder at the end of marketing pages. Women in Esports is an initiative of the platform, not the platform. */
export function WomenStrip() {
  return (
    <aside aria-label="Women in Esports" className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-display text-xl font-bold sm:text-2xl">Women in Esports</p>
        <p className="text-mute">Our commitment to women who compete.</p>
        <Link href="/women-in-esports" className="inline-flex min-h-11 items-center text-sm font-semibold text-coral underline underline-offset-4 hover:text-white">
          See how organizations take part
        </Link>
      </div>
    </aside>
  );
}
