"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Result } from "@/app/a/dashboard/actions";
import { requireUser } from "@/lib/auth";
import { GAME_IDS } from "@/content/games";

const fail = (message = "Something went wrong. Try again."): Result => ({ ok: false, message });
const limit = (e: { message: string } | null) => (e?.message.includes("dashboard_limit") ? "You have reached the limit for this section. Remove one first." : undefined);

const tournamentSchema = z.object({
  game: z.enum(GAME_IDS),
  name: z.string().trim().min(1).max(80),
  placement: z.string().trim().max(40),
  team_name: z.string().trim().max(60),
  played_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
});

export async function addTournamentAction(input: z.input<typeof tournamentSchema>): Promise<Result> {
  const { sb, user } = await requireUser();
  const p = tournamentSchema.safeParse(input);
  if (!p.success) return fail("Add a tournament name and pick a game.");
  const { error } = await sb.from("tournament_entries").insert({
    profile_id: user.id,
    game: p.data.game,
    name: p.data.name,
    placement: p.data.placement || null,
    team_name: p.data.team_name || null,
    played_on: p.data.played_on || null,
  });
  if (error) return fail(limit(error) ?? (error.code === "23514" ? "Check the date." : undefined));
  revalidatePath("/dashboard/resume");
  return { ok: true, message: "Added." };
}

export async function removeTournamentAction(id: string): Promise<Result> {
  const { sb, user } = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return fail();
  const { error } = await sb.from("tournament_entries").delete().eq("id", id).eq("profile_id", user.id);
  if (error) return fail();
  revalidatePath("/dashboard/resume");
  return { ok: true };
}

const highlightSchema = z.object({
  game: z.enum(GAME_IDS),
  title: z.string().trim().min(1).max(80),
  url: z.string().trim().max(300),
  note: z.string().trim().max(200),
});

export async function addHighlightAction(input: z.input<typeof highlightSchema>): Promise<Result> {
  const { sb, user } = await requireUser();
  const p = highlightSchema.safeParse(input);
  if (!p.success) return fail("Add a title and pick a game.");
  let url: URL;
  try {
    url = new URL(p.data.url);
  } catch {
    return fail("Paste a full link that starts with https://");
  }
  if (url.protocol !== "https:") return fail("Paste a full link that starts with https://");
  const { error } = await sb.from("highlights").insert({
    profile_id: user.id,
    game: p.data.game,
    title: p.data.title,
    url: url.toString(),
    note: p.data.note || null,
  });
  if (error) return fail(limit(error));
  revalidatePath("/dashboard/resume");
  return { ok: true, message: "Added." };
}

export async function removeHighlightAction(id: string): Promise<Result> {
  const { sb, user } = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return fail();
  const { error } = await sb.from("highlights").delete().eq("id", id).eq("profile_id", user.id);
  if (error) return fail();
  revalidatePath("/dashboard/resume");
  return { ok: true };
}
