import Link from "next/link";
import { copy } from "@/content/copy";
import { AUDIENCES } from "@/lib/roles";
import { appUrl } from "@/lib/urls";

/**
 * Who are you? Each group goes straight into the one registration (sign in page with the role in the link). Nothing is
 * explained twice: one line per group, and a plain "Coming soon" where that group's own experience is not open yet.
 */
export function RolePicker() {
  return (
    <section aria-labelledby="roles-title" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <h2 id="roles-title" className="font-display text-3xl font-bold leading-tight sm:text-5xl">
          {copy.home.intent.title}
        </h2>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map((r) => (
            <li key={r.id}>
              <Link
                href={r.to.startsWith("app:") ? appUrl(r.to.slice(4)) : r.to}
                className="group flex min-h-44 flex-col rounded-3xl border border-line bg-surface p-6 transition-colors hover:border-white focus-visible:border-white sm:p-8"
              >
                <span className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-2xl font-bold">{r.title}</span>
                  {r.soon ? <span className="inline-flex rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-coral">{copy.home.soonLabel}</span> : null}
                </span>
                <span className="mt-2 text-lg text-mute">{r.line}</span>
                <span className="mt-auto pt-6 text-sm font-semibold text-coral group-hover:text-white">
                  {r.cta} <span aria-hidden>→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
