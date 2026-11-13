"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Result } from "@/app/a/dashboard/actions";
import { requireUser } from "@/lib/auth";

const PAGE = "/dashboard/team/scrims";

/** Turns sharing of the player's own Rocket League numbers with their current team on or off. The database checks the roster. Off deletes their lines. */
export async function setTeamSharingAction(on: boolean): Promise<Result> {
  const { sb } = await requireUser();
  const { data, error } = await sb.rpc("set_team_stat_sharing", { p_on: on === true });
  if (error) return { ok: false, message: "Couldn't change sharing. Try again." };
  revalidatePath(PAGE);
  if (data === "on") return { ok: true, message: "Sharing is on. Your numbers will appear in team scrims submitted from now on." };
  if (data === "off") return { ok: true, message: "Sharing is off. Your individual numbers were removed from your team's scrims." };
  return { ok: false, message: "You are not on a team." };
}

/** Removes a team scrim. Row level security allows only the team owner or the player who submitted it. */
export async function deleteTeamScrimAction(id: string): Promise<Result> {
  const { sb } = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Something went wrong. Try again." };
  const { data, error } = await sb.from("team_scrims").delete().eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, message: "Only the team owner or the player who submitted it can remove this scrim." };
  revalidatePath(PAGE);
  return { ok: true, message: "Removed from your team's scrims." };
}
