import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { appUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "For teams",
  description: "One dashboard for every player in your club.",
  alternates: { canonical: "/teams" },
};

export default function Teams() {
  const t = copy.teams;
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <header className="max-w-3xl">
        <h1 className="font-display text-5xl font-bold leading-tight sm:text-7xl">{t.title}</h1>
        <p className="mt-5 text-lg text-mute">{t.line}</p>
        <ButtonLink href={appUrl("/login?next=/dashboard/team")} className="mt-8">
          {t.cta}
        </ButtonLink>
        <p className="mt-4 text-sm text-mute">{t.note}</p>
      </header>
      <ul className="mt-20 grid gap-5 sm:grid-cols-3">
        {t.benefits.map((b) => (
          <li key={b.title} className="lift reveal rounded-3xl border border-line bg-surface p-8">
            <h2 className="font-display text-2xl font-bold">{b.title}</h2>
            <p className="mt-2 text-mute">{b.line}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
