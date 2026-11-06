import type { Metadata } from "next";
import { CreateTeamForm, InviteBox, LeaveTeamButton, RemoveMemberButton } from "@/components/app/TeamPanel";
import { Section } from "@/components/ui/form";
import { getGame } from "@/content/games";
import { loadMe } from "@/lib/me";
import { appUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Team", robots: { index: false } };

export default async function Team() {
  const { sb, user, team } = await loadMe();

  if (!team) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <h1 className="font-display text-4xl font-bold">Run your club like a pro team.</h1>
        <Section title="Start your team" line="Create a team, then share one link. Teammates join in a tap.">
          <CreateTeamForm />
        </Section>
        <p className="text-sm text-mute">Already have an invite link? Open it to join.</p>
      </div>
    );
  }

  const isOwner = team.owner_id === user.id;
  const { data: members } = await sb.from("team_members").select("profile_id, role").eq("team_id", team.id);
  const ids = (members ?? []).map((m) => m.profile_id);
  const { data: people } = ids.length
    ? await sb.from("public_profiles").select("id, handle, display_name, game, rank").in("id", ids)
    : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  const roster = (members ?? [])
    .map((m) => ({ ...m, p: byId.get(m.profile_id) }))
    .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : (a.p?.handle ?? "").localeCompare(b.p?.handle ?? "")));

  let inviteUrl: string | null = null;
  if (isOwner) {
    const { data: code } = await sb.rpc("team_invite_code");
    if (code) inviteUrl = appUrl(`/join/${code}`);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-4xl font-bold">{team.name}</h1>

      {inviteUrl ? (
        <Section title="Invite your roster">
          <InviteBox url={inviteUrl} />
        </Section>
      ) : null}

      <Section title={`Roster (${roster.length} of 10)`}>
        <ul className="flex flex-col gap-2">
          {roster.map((m) => {
            const name = m.p?.display_name || m.p?.handle || "Player";
            return (
              <li key={m.profile_id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {name} {m.role === "owner" ? <span className="ml-1 rounded-full bg-crimson px-2 py-0.5 text-xs">Owner</span> : null}
                  </p>
                  <p className="truncate text-sm text-mute">
                    @{m.p?.handle} {m.p?.game ? `· ${getGame(m.p.game)?.name ?? m.p.game}` : ""} {m.p?.rank ? `· ${m.p.rank}` : ""}
                  </p>
                </div>
                {isOwner && m.profile_id !== user.id ? <RemoveMemberButton profileId={m.profile_id} name={name} /> : null}
              </li>
            );
          })}
        </ul>
      </Section>

      <LeaveTeamButton isOwner={isOwner} alone={roster.length === 1} />
    </div>
  );
}
