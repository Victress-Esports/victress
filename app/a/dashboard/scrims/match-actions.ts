"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Result } from "@/app/a/dashboard/actions";
import { GAME_IDS } from "@/content/games";
import { requireUser } from "@/lib/auth";

const fail = (message = "Something went wrong. Try again."): Result => ({ ok: false, message });

const matchSchema = z.object({
  game: z.enum(GAME_IDS),
  played_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  opponent: z.string().trim().max(60),
  result: z.enum(["win", "loss", "draw"]),
  score: z.string().trim().max(10),
  map: z.string().trim().max(40),
  note: z.string().trim().max(200),
});

/**
 * Logs a practice match the player played. Private to the player, never published (source = manual,
 * enforced by the database). Opponent is a team or group name only. Private to the owner.
 */
export async function addMatchAction(input: z.input<typeof matchSchema>): Promise<Result> {
  const { sb, user } = await requireUser();
  const p = matchSchema.safeParse(input);
  if (!p.success) return fail("Pick a game, a date and a result.");
  const d = p.data;
  if (d.score && !/^[0-9]{1,3} ?[-:] ?[0-9]{1,3}$/.test(d.score)) return fail("Write the score like 13-9.");
  if (d.played_on > new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)) return fail("That date is in the future.");
  const { error } = await sb.from("scrim_matches").insert({
    profile_id: user.id,
    game: d.game,
    played_on: d.played_on,
    opponent: d.opponent || null,
    result: d.result,
    score: d.score || null,
    map: d.map || null,
    note: d.note || null,
  });
  if (error) return fail(error.message.includes("dashboard_limit") ? "You have reached the limit of 500 matches." : undefined);
  revalidatePath("/dashboard/scrims");
  return { ok: true, message: "Match logged." };
}

export async function removeMatchAction(id: string): Promise<Result> {
  const { sb, user } = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return fail();
  const { error } = await sb.from("scrim_matches").delete().eq("id", id).eq("profile_id", user.id);
  if (error) return fail();
  revalidatePath("/dashboard/scrims");
  return { ok: true };
}
