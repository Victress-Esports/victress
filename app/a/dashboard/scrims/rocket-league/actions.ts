"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Result } from "@/app/a/dashboard/actions";
import { requireUser } from "@/lib/auth";
import { ballchasingClient } from "@/lib/ballchasing";
import { IDENTITY_MESSAGES, parseIdentity, runReplayImport } from "@/lib/ballchasing/rl";
import { scrimUploadsEnabled } from "@/lib/dashboard";
import { supabaseAdmin } from "@/lib/supabase-admin";

const fail = (message = "Something went wrong. Try again."): Result => ({ ok: false, message });
const PAGE = "/dashboard/scrims/rocket-league";

/** Same gates as scrim uploads and the League import: the flag AND the design partner allowlist (the pilot roster). */
async function gate() {
  const { sb, user } = await requireUser();
  if (!scrimUploadsEnabled()) return { error: "This is not open yet." } as const;
  const { data: approved } = await sb.rpc("upload_allowed");
  if (approved !== true) return { error: "This is open to approved pilot players only." } as const;
  return { sb, user } as const;
}

const identitySchema = z.object({ platform: z.string().max(20), id: z.string().max(200) });

/** Saves the player's own Rocket League platform and player id. Used only to find their slot in a replay. Not verified. */
export async function saveRlIdentityAction(input: z.input<typeof identitySchema>): Promise<Result> {
  const g = await gate();
  if ("error" in g) return fail(g.error);
  const p = identitySchema.safeParse(input);
  const who = p.success ? parseIdentity(p.data.platform, p.data.id) : null;
  if (!who) return fail(IDENTITY_MESSAGES.empty);
  if (!who.ok) return fail(IDENTITY_MESSAGES[who.reason]);
  const admin = supabaseAdmin();
  if (!admin) return fail();
  const { data: cur } = await admin.from("game_accounts").select("id, platform, external_id").eq("profile_id", g.user.id).eq("game", "ROCKET_LEAGUE").maybeSingle();
  if (cur) {
    if (cur.platform === who.platform && cur.external_id === who.id) return { ok: true, message: "Already saved." };
    const { count } = await admin.from("game_matches").select("id", { count: "exact", head: true }).eq("profile_id", g.user.id).eq("game", "ROCKET_LEAGUE");
    if ((count ?? 0) > 0) return fail("Delete your saved Rocket League games before changing your ID, so old games are never attached to a different player.");
    const { error } = await admin.from("game_accounts").update({ platform: who.platform, external_id: who.id }).eq("id", cur.id);
    if (error) return fail();
  } else {
    const { error } = await admin.from("game_accounts").insert({ profile_id: g.user.id, game: "ROCKET_LEAGUE", provider: "rocket_league", platform: who.platform, external_id: who.id });
    if (error) return fail();
  }
  revalidatePath(PAGE);
  return { ok: true, message: "Saved. Victress will use this to find your own numbers in replays you submit. It is private and not verified." };
}

const submitSchema = z.object({ link: z.string().max(300), authorized: z.boolean(), consent: z.boolean() });

/** Reads one Ballchasing replay link and saves the player's own numbers from it. Both confirmations are required. */
export async function submitReplayAction(input: z.input<typeof submitSchema>): Promise<Result> {
  const g = await gate();
  if ("error" in g) return fail(g.error);
  const p = submitSchema.safeParse(input);
  if (!p.success) return fail("Paste a Ballchasing replay link.");
  const admin = supabaseAdmin();
  const client = ballchasingClient();
  if (!admin || !client) return fail("Rocket League replay import is not configured on this server yet.");
  const r = await runReplayImport({ admin, client }, g.user.id, p.data.link, { authorized: p.data.authorized, consent: p.data.consent, via: "web" });
  revalidatePath(PAGE);
  return { ok: r.ok, message: r.message };
}

/** Deletes every Rocket League record Victress holds for the player: games, the saved ID and the submission history. */
export async function deleteRlDataAction(): Promise<Result> {
  const { sb, user } = await requireUser();
  const j = await sb.from("import_jobs").delete().eq("profile_id", user.id).eq("game", "ROCKET_LEAGUE");
  const a = await sb.from("game_accounts").delete().eq("profile_id", user.id).eq("game", "ROCKET_LEAGUE"); // also removes the games (cascade)
  if (a.error || j.error) return fail("Couldn't delete everything. Try again.");
  revalidatePath(PAGE);
  return { ok: true, message: "Deleted your saved Rocket League ID, games and submission history." };
}

export async function deleteRlMatchAction(id: string): Promise<Result> {
  const { sb, user } = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return fail();
  const { error } = await sb.from("game_matches").delete().eq("id", id).eq("profile_id", user.id).eq("game", "ROCKET_LEAGUE");
  if (error) return fail();
  revalidatePath(PAGE);
  return { ok: true, message: "Deleted." };
}
