import type { Metadata } from "next";
import Link from "next/link";
import { StatusChip } from "@/components/app/StatusChip";
import { buttonClass } from "@/components/ui/Button";
import { Section } from "@/components/ui/form";
import { seo } from "@/content/seo";
import { billingEnabled, currentTier, planName } from "@/lib/entitlements";
import { loadMe } from "@/lib/me";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata(seo.app.dashboard.title, seo.app.dashboard.description);

function ModuleCard({ href, title, line, chip }: { href?: string; title: string; line: string; chip: React.ReactNode | null }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl font-bold">{title}</h3>
        {chip}
      </div>
      <p className="mt-2 text-mute">{line}</p>
    </>
  );
  const base = "block rounded-3xl border border-line bg-surface p-5";
  return href ? (
    <Link href={href} className={`${base} transition-colors hover:border-white focus-visible:border-white`}>
      {body}
    </Link>
  ) : (
    <div className={`${base} opacity-80`}>{body}</div>
  );
}

export default async function Dashboard() {
  const { user, profile, games, team } = await loadMe();
  const tier = await currentTier();
  const listed = profile.directory_listed;

  const next =
    games.length === 0
      ? { text: "Add the game you play to start your Player Resume.", href: "/dashboard/profile", label: "Add a game" }
      : !team
        ? { text: "Play on a roster or run a club? Start or join a team.", href: "/dashboard/team", label: "Team" }
        : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Dashboard</h1>
          <p className="mt-2 text-mute">Practice, performance evidence, development, recognition, opportunity.</p>
        </div>
        <div className="flex items-center gap-2" aria-label="Your plan">
          <span className="text-sm text-mute">Plan</span>
          <StatusChip tone="on">{planName(tier)}</StatusChip>
          {billingEnabled() ? (
            <Link href="/settings/billing" className="text-sm font-semibold underline underline-offset-2">
              Plan and billing
            </Link>
          ) : null}
        </div>
      </div>

      {next ? (
        <div className="rounded-2xl border border-dashed border-line p-5">
          <p className="text-mute">{next.text}</p>
          <Link href={next.href} className={buttonClass("secondary", "mt-4")}>
            {next.label}
          </Link>
        </div>
      ) : null}

      <section aria-label="Modules" className="grid gap-4 sm:grid-cols-2">
        <ModuleCard href="/dashboard/resume" title="Player Resume" line="Your games, roles, ranks, tournaments and highlights." chip={null} />
        <ModuleCard href="/dashboard/scrims" title="Scrims" line="Log your practice matches." chip={null} />
        <ModuleCard href="/dashboard/privacy" title="Privacy" line="Your profile is private by default. You choose what to share." chip={null} />
        <ModuleCard href="/dashboard/team" title="Team" line="Create a team, invite players with a link, and see your roster." chip={null} />
        <ModuleCard
          href="/dashboard/scout"
          title="Scout Desk"
          line="Discovery and evaluation for teams, coaches and collegiate programs."
          chip={<StatusChip>Coming soon</StatusChip>}
        />
      </section>

      <Section title="Your identity, kept separate" line="Three different things, with different rules.">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="font-semibold">Account</dt>
            <dd className="mt-1 text-sm text-mute">Your sign in{user.email ? ` (${user.email})` : ""}. Private. Never shown on your profile.</dd>
          </div>
          <div>
            <dt className="font-semibold">Public player identity</dt>
            <dd className="mt-1 text-sm text-mute">
              Your name <span className="text-white">{profile.handle}</span>.{" "}
              {listed ? "Listed publicly, with only the fields you chose." : "Private. You choose what to share."}{" "}
              <Link href="/dashboard/privacy" className="inline-block py-1 underline">
                Change
              </Link>
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Private contact details</dt>
            <dd className="mt-1 text-sm text-mute">Never shown without your consent. Nobody can contact you through Victress today.</dd>
          </div>
        </dl>
      </Section>
    </div>
  );
}
