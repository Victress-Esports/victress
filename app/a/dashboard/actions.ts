"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { checkHandle } from "@/lib/handles";
import { GAME_IDS, getGame } from "@/content/games";
import { savePlayerGame } from "@/lib/player-games";
import { recordEvent } from "@/lib/events";

export type Result = { ok: boolean; message?: string };
const fail = (message = "Something went wrong. Try again."): Result => ({ ok: false, message });

// ---------------------------------------------------------------- profile

const profileSchema = z.object({
  display_name: z.string().trim().max(40),
  bio: z.string().trim().max(280),
});

export async function updateProfileAction(input: z.input<typeof profileSchema>): Promise<Result> {
  const { sb, user } = await requireUser();
  const p = profileSchema.safeParse(input);
  if (!p.success) return fail("Name up to 40 characters, bio up to 280.");
  const { error } = await sb
    .from("profiles")
    .update({ display_name: p.data.display_name || null, bio: p.data.bio || null })
    .eq("id", user.id);
  return error ? fail() : { ok: true, message: "Saved." };
}

/** The client uploads the image to Storage; this records the URL, but only if it points into the user's own folder. */
export async function setAvatarAction(url: string | null): Promise<Result> {
  const { sb, user } = await requireUser();
  if (url !== null) {
    const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`;
    if (typeof url !== "string" || !url.startsWith(prefix) || url.length > 500) return fail("That image isn't valid.");
  }
  const { error } = await sb.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  return error ? fail() : { ok: true, message: url ? "Photo updated." : "Photo removed." };
}

export async function changeHandleAction(raw: string): Promise<Result & { status?: string }> {
  const { sb } = await requireUser();
  const { verdict, handle } = checkHandle(String(raw ?? ""));
  if (verdict === "invalid") return { ok: false, status: "invalid", message: "Use 3 to 20 letters, numbers or underscores." };
  if (verdict === "reserved") return { ok: false, status: "reserved", message: "That name isn't available." };

  const { data, error } = await sb.rpc("claim_handle", { p_handle: handle });
  if (error || !data) return fail();
  if (data === "ok") return { ok: true, status: "ok", message: `Your name is now ${handle}.` };
  if (data === "taken") return { ok: false, status: "taken", message: "That name is taken. Try another." };
  if (data === "cooldown") {
    const { data: at } = await sb.rpc("handle_change_available_at");
    const when = at ? new Date(at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "later";
    return { ok: false, status: "cooldown", message: `You can change your name once every 30 days. Next change: ${when}.` };
  }
  return { ok: false, status: String(data), message: "That name isn't available." };
}

// ---------------------------------------------------------------- games

const gameSchema = z.object({
  game: z.enum(GAME_IDS),
  role: z.string().max(40).nullable().optional(),
});

export async function saveGameAction(input: z.input<typeof gameSchema>): Promise<Result> {
  const { sb, user } = await requireUser();
  const p = gameSchema.safeParse(input);
  if (!p.success) return fail();
  const cfg = getGame(p.data.game)!;
  const role = p.data.role && cfg.roles.includes(p.data.role) ? p.data.role : null;
  return (await savePlayerGame(sb, user.id, cfg, role)) ? { ok: true } : fail();
}

export async function removeGameAction(game: string): Promise<Result> {
  const { sb, user } = await requireUser();
  if (!getGame(game)) return fail();
  const { error } = await sb.from("player_games").delete().eq("profile_id", user.id).eq("game", game);
  return error ? fail() : { ok: true };
}

export async function setPrimaryGameAction(game: string): Promise<Result> {
  const { sb } = await requireUser();
  if (!getGame(game)) return fail();
  const { data, error } = await sb.rpc("set_primary_game", { p_game: game });
  return error || data !== "ok" ? fail() : { ok: true };
}

// Stats players enter themselves are no longer collected or published (founder decision 2026-11-07). The stat_entries table and
// any rows already saved are left untouched; nothing in the app reads or displays them.

// ---------------------------------------------------------------- teams

const TEAM_MESSAGES: Record<string, string> = {
  invalid: "Team names are 2 to 40 characters.",
  already_in_team: "You're already on a team.",
  in_other_team: "You're already on a team. Leave it first.",
  already_member: "You're already on this team.",
  full: "That team is full (10 members).",
  owner_has_members: "Remove your teammates before you leave, or they'll lose the team.",
  not_owner: "Only the team owner can do that.",
};

export async function createTeamAction(name: string): Promise<Result> {
  const { sb, user } = await requireUser();
  const { data, error } = await sb.rpc("create_team", { p_name: String(name ?? "") });
  const status = (data as { status?: string } | null)?.status;
  if (error || !status) return fail();
  if (status === "ok") { await recordEvent(user.id, "team_created", { source: "web" }); return { ok: true }; }
  return fail(TEAM_MESSAGES[status]);
}

export async function joinTeamAction(code: string): Promise<Result> {
  const { sb, user } = await requireUser();
  const { data, error } = await sb.rpc("join_team", { p_code: String(code ?? "") });
  if (error || !data) return fail();
  if (data === "ok") await recordEvent(user.id, "team_joined", { source: "invite" });
  if (data === "ok" || data === "already_member") return { ok: true };
  return fail(data === "invalid" ? "That invite link isn't valid anymore." : TEAM_MESSAGES[data]);
}

export async function leaveTeamAction(): Promise<Result> {
  const { sb } = await requireUser();
  const { data, error } = await sb.rpc("leave_team");
  if (error || !data) return fail();
  return data === "ok" ? { ok: true } : fail(TEAM_MESSAGES[data]);
}

export async function removeMemberAction(profileId: string): Promise<Result> {
  const { sb } = await requireUser();
  if (!z.string().uuid().safeParse(profileId).success) return fail();
  const { data, error } = await sb.rpc("remove_team_member", { p_profile: profileId });
  if (error || !data) return fail();
  return data === "ok" ? { ok: true } : fail(TEAM_MESSAGES[data]);
}

export async function regenerateInviteAction(): Promise<Result> {
  const { sb } = await requireUser();
  const { data, error } = await sb.rpc("regenerate_invite_code");
  return error || !data ? fail(TEAM_MESSAGES.not_owner) : { ok: true, message: "New invite link created. The old one no longer works." };
}
