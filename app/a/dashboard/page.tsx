import type { Metadata } from "next";
import Link from "next/link";
import { StatusChip } from "@/components/app/StatusChip";
import { buttonClass } from "@/components/ui/Button";
import { Section } from "@/components/ui/form";
import { seo } from "@/content/seo";
import { scrimUploadsEnabled } from "@/lib/dashboard";
import { billingEnabled, canUseScoutDesk, currentTier, planName } from "@/lib/entitlements";
import { loadMe } from "@/lib/me";
import { directoryEnabled, sharingEnabled } from "@/lib/privacy";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata(seo.app.dashboard.title, seo.app.dashboard.description);

function ModuleCard({ href, title, line, chip }: { href?: string; title: string; line: string; chip: React.ReactNode }) {
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
  const { user, profile, games, entries, team } = await loadMe();
  const tier = await currentTier();
  const uploads = scrimUploadsEnabled();
  const sharing = sharingEnabled();
  const directory = directoryEnabled();
  const listed = profile.directory_listed;

  const next =
    games.length === 0
      ? { text: "Add the game you play to start your Player Resume.", href: "/dashboard/profile", label: "Add a game" }
      : entries.length === 0
        ? { text: "Add your first stats. They show as Self-reported.", href: "/dashboard/stats", label: "Add stats" }
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
        </div>
      </div>

      <section aria-label="Feature status" className="rounded-3xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-bold">What is switched on</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            ["Public profiles and leaderboards", directory],
            ["Private sharing links", sharing],
            ["Scrim file uploads", uploads],
            ["Paid plans and billing", billingEnabled()],
          ].map(([label, on]) => (
            <li key={label as string} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-2.5">
              <span className="text-sm font-semibold">{label as string}</span>
              <StatusChip tone={on ? "on" : "muted"}>{on ? "On" : "Not open yet"}</StatusChip>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-mute">Features that make your data more visible open only after the privacy foundation is live and approved.</p>
      </section>

      {next ? (
        <div className="rounded-2xl border border-dashed border-line p-5">
          <p className="text-mute">{next.text}</p>
          <Link href={next.href} className={buttonClass("secondary", "mt-4")}>
            {next.label}
          </Link>
        </div>
      ) : null}

      <section aria-label="Modules" className="grid gap-4 sm:grid-cols-2">
        <ModuleCard
          href="/dashboard/resume"
          title="Player Resume"
          line="Games, stats, tournaments and highlights, with each number labeled by source."
          chip={<StatusChip tone="on">Available now</StatusChip>}
        />
        <ModuleCard
          href="/dashboard/scrims"
          title="Scrim Intelligence"
          line="Private practice files. Automated analysis is coming soon."
          chip={<StatusChip>{uploads ? "Uploads open" : "Uploads not open yet"}</StatusChip>}
        />
        <ModuleCard
          href="/dashboard/privacy"
          title="Privacy and sharing"
          line="Choose who sees your profile and what they see. Private by default."
          chip={<StatusChip tone="on">Available now</StatusChip>}
        />
        <ModuleCard
          title="Scout Desk"
          line={
            canUseScoutDesk(tier)
              ? "Structured discovery and evaluation."
              : "Player discovery is part of the Scout plan. Coming soon, and not open to any plan yet."
          }
          chip={<StatusChip>Scout plan · Coming soon</StatusChip>}
        />
        <ModuleCard href="/dashboard/team" title="Team" line="Create a team, invite players with a link, and see your roster." chip={<StatusChip tone="on">Available now</StatusChip>} />
        <ModuleCard href="/dashboard/stats" title="Stats" line="Enter your own stats. They are shown as Self-reported." chip={<StatusChip tone="on">Available now</StatusChip>} />
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
              {listed ? "Listed publicly, with only the fields you chose." : "Private. Visible only through a link you create."}{" "}
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
