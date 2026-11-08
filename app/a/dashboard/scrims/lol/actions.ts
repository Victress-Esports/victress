"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Result } from "@/app/a/dashboard/actions";
import { requireUser } from "@/lib/auth";
import { scrimUploadsEnabled } from "@/lib/dashboard";
import { recordFunnelEvent } from "@/lib/funnel";
import { parseRiotId, RIOT_ROUTES } from "@/lib/riot/core";
import { runLolImport } from "@/lib/riot/import";
import { rateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase-admin";

const fail = (message = "Something went wrong. Try again."): Result => ({ ok: false, message });
const schema = z.object({ riotId: z.string().trim().min(5).max(30), route: z.enum(RIOT_ROUTES as [string, ...string[]]), count: z.number().int().min(1).max(30) });

/** Same gates as scrim uploads: the flag AND the design partner allowlist. Returns the signed in user or a refusal message. */
async function gate() {
  const { sb, user } = await requireUser();
  if (!scrimUploadsEnabled()) return { error: "This is not open yet." } as const;
  const { data: approved } = await sb.rpc("upload_allowed");
  if (approved !== true) return { error: "This is open to approved design partners only." } as const;
  return { sb, user } as const;
}

/** Looks up the Riot ID, links it, and imports recent matches with their timelines. Stored with provenance "api". */
export async function importLolAction(input: z.input<typeof schema>): Promise<Result> {
  const g = await gate();
  if ("error" in g) return fail(g.error);
  const p = schema.safeParse(input);
  const id = p.success ? parseRiotId(p.data.riotId) : null;
  if (!p.success || !id) return fail("Enter your Riot ID as Name#TAG, and choose your region.");
  if (!rateLimit(`lol-import:${g.user.id}`, 6, 60 * 60_000)) return fail("You have imported several times in the last hour. Try again later.");
  const admin = supabaseAdmin();
  if (!admin) return fail();
  await recordFunnelEvent("first_import_started", g.user.id, { game: "LOL" });
  const r = await runLolImport(admin, g.user.id, id, p.data.route as never, p.data.count);
  revalidatePath("/dashboard/scrims/lol");
  return { ok: r.ok, message: r.message };
}

/** Deletes every League of Legends record Victress holds for the player: matches, the linked Riot ID and import history. */
export async function deleteLolDataAction(): Promise<Result> {
  const { sb, user } = await requireUser();
  const a = await sb.from("game_accounts").delete().eq("profile_id", user.id).eq("game", "LOL");
  const j = await sb.from("import_jobs").delete().eq("profile_id", user.id).eq("game", "LOL");
  const m = await sb.from("game_matches").delete().eq("profile_id", user.id).eq("game", "LOL");
  if (a.error || j.error || m.error) return fail("Couldn't delete everything. Try again.");
  revalidatePath("/dashboard/scrims/lol");
  return { ok: true, message: "Deleted your linked Riot ID, imported matches and import history." };
}

export async function deleteLolMatchAction(id: string): Promise<Result> {
  const { sb, user } = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return fail();
  const { error } = await sb.from("game_matches").delete().eq("id", id).eq("profile_id", user.id);
  if (error) return fail();
  revalidatePath("/dashboard/scrims/lol");
  return { ok: true, message: "Deleted." };
}
