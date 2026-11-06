import type { Metadata } from "next";
import { TeamRoster } from "@/components/marketing/TeamRoster";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { seo } from "@/content/seo";
import { marketingCrumbs } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";
import { appUrl } from "@/lib/urls";

export const metadata: Metadata = pageMetadata({ ...seo.marketing.teams, path: "/teams", image: "teams" });

export default function Teams() {
  const t = copy.teams;
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <JsonLd data={marketingCrumbs("For teams", "/teams")} />
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <header>
          <h1 className="font-display text-5xl font-bold leading-tight sm:text-6xl">{t.title}</h1>
          <p className="mt-5 text-lg text-mute">{t.line}</p>
          <ButtonLink href={appUrl("/login?next=/dashboard/team")} className="mt-8">
            {t.cta}
          </ButtonLink>
          <p className="mt-4 text-sm text-mute">{t.note}</p>
        </header>
        <div className="flex justify-center">
          <TeamRoster />
        </div>
      </div>

      {/* Features that exist are plain; features that are not built yet say Coming soon. */}
      <ul className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {t.benefits.map((b) => (
          <li key={b.title} className="lift reveal rounded-3xl border border-line bg-surface p-6">
            {b.soon ? <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-coral">{t.soonBadge}</span> : null}
            <h2 className={`font-display text-2xl font-bold ${b.soon ? "mt-3" : ""}`}>{b.title}</h2>
            {b.line ? <p className="mt-2 text-mute">{b.line}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
