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
 * what it is and what protects players.
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

      <Section title="Scout plan" line={`You are on the ${planName(tier)} plan.`}>
        <p className="text-mute">Scout plan only. Scout Desk is part of the Scout plan.</p>
        {state === "plan" ? (
          <Link href={marketingUrl("/pricing")} className={buttonClass("secondary", "mt-4")}>
            See plans
          </Link>
        ) : null}
      </Section>

      <Section title="What players control" line="The rules Scout Desk follows.">
        <ul className="flex list-disc flex-col gap-2 pl-5 text-mute">
          <li>A player appears only if they chose to be listed and chose which fields to show. Nobody is listed by default.</li>
          <li>Contact details and private identity are never shown without the player&apos;s consent.</li>
          <li>Performance is shown in context, such as role and team, and every number shows its source.</li>
          <li>Verification means where evidence came from and that it is intact. It never says how good a player is.</li>
        </ul>
      </Section>

      <Section title="What it does">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="font-semibold">Discovery</dt>
            <dd className="mt-1 text-sm text-mute">Find players who opted in, filtered by game and role.</dd>
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
