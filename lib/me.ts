import "server-only";
import { redirect } from "next/navigation";
import { PLACEHOLDER_HANDLE, requireUser } from "@/lib/auth";

/** Everything the signed-in dashboard pages need, in one place. Redirects to onboarding if it isn't finished. */
export async function loadMe() {
  const { sb, user } = await requireUser();

  const { data: profile } = await sb
    .from("profiles")
    .select("handle, display_name, avatar_url, bio, game, role, rank, team_id, is_demo, search_indexable, directory_listed, show_on_leaderboards, public_fields")
    .eq("id", user.id)
    .single();
  if (!profile || PLACEHOLDER_HANDLE.test(profile.handle) || !user.user_metadata?.onboarded) redirect("/onboarding");

  const [{ data: games }, { data: team }] = await Promise.all([
    sb.from("player_games").select("game, role, rank, is_primary, created_at").eq("profile_id", user.id).order("created_at"),
    profile.team_id ? sb.from("teams").select("id, name, owner_id").eq("id", profile.team_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return { sb, user, profile, games: games ?? [], team };
}

export type Me = Awaited<ReturnType<typeof loadMe>>;
