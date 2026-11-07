import type { Metadata } from "next";
import Link from "next/link";
import { StatusChip } from "@/components/app/StatusChip";
import { buttonClass } from "@/components/ui/Button";
import { Section } from "@/components/ui/form";
import { currentTier, planName, scoutDeskState } from "@/lib/entitlements";
import { loadMe } from "@/lib/me";
import { privateMetadata } from "@/lib/seo";
import { marketingUrl } from "@/lib/urls";

export const metadata: Metadata = privateMetadata("Scout Desk | Victress", "Structured discovery and evaluation. Not open yet.");

/**
 * Scout Desk: a gated shell. It reads no player data. Discovery, rosters and contact are not built, and are disabled for all
 * players pending qualified legal review, organization verification capacity and safety operations. The page only explains
 * what is planned, why it is closed, and what protects players.
 */
export default async function ScoutDesk() {
  await loadMe();
  const tier = await currentTier();
  const state = scoutDeskState(tier);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Scout Desk</h1>
          <p className="mt-2 text-mute">Structured discovery and evaluation connecting talent with teams, coaches, collegiate programs and recruiters.</p>
        </div>
        <StatusChip>Coming soon</StatusChip>
      </div>

      {state === "plan" ? (
        <Section title="Part of the Scout plan" line={`You are on the ${planName(tier)} plan.`}>
          <p className="text-mute">
            Player discovery belongs to the Scout plan only. The Scout plan is Coming soon and is not available to buy yet, so there is nothing to upgrade to
            today.
          </p>
          <Link href={marketingUrl("/pricing")} className={buttonClass("secondary", "mt-4")}>
            See plans
          </Link>
        </Section>
      ) : (
        <Section title="Scout Desk is not open" line="Your plan includes it, but discovery is not available yet.">
          <p className="text-mute">It opens only after organization verification and the required legal and safety review are in place.</p>
        </Section>
      )}

      <Section title="Why it is closed" line="Players come first.">
        <ul className="flex list-disc flex-col gap-2 pl-5 text-mute">
          <li>Recruiter discovery and contact are switched off for every player until a qualified legal review is complete.</li>
          <li>Organizations will be verified before they can use it. Individual scouts are not part of the first release.</li>
          <li>Reporting, blocking and review need to be in place before players are visible to people they do not know.</li>
        </ul>
      </Section>

      <Section title="What players control" line="Described as design commitments. None of this is live while Scout Desk is closed.">
        <ul className="flex list-disc flex-col gap-2 pl-5 text-mute">
          <li>A player appears only if they chose to be listed and chose which fields to show. Nobody is listed by default.</li>
          <li>Contact details and private identity are never shown without the player&apos;s consent.</li>
          <li>Performance is shown in context, such as role and team, and every number shows its source: Self-reported, API or Demo parsed.</li>
          <li>Verification means where evidence came from and that it is intact. It never says how good a player is.</li>
        </ul>
      </Section>

      <Section title="What it will be" line="Planned. Not built.">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="font-semibold">Discovery</dt>
            <dd className="mt-1 text-sm text-mute">Find players who opted in, filtered by game, role and rank.</dd>
          </div>
          <div>
            <dt className="font-semibold">Evaluation</dt>
            <dd className="mt-1 text-sm text-mute">Compare players on source labeled evidence, in context.</dd>
          </div>
          <div>
            <dt className="font-semibold">Pipelines</dt>
            <dd className="mt-1 text-sm text-mute">Organize prospects and keep notes. Contact only through a consent flow.</dd>
          </div>
        </dl>
      </Section>
    </div>
  );
}
