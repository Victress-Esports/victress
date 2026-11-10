"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { deleteAccount } from "@/lib/account";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

export type DeleteResult = { ok: false; message: string };

const schema = z.object({ confirm: z.string().trim().max(40) });

/**
 * Permanently deletes the signed in account. The player must type their name. A team owner with other members must first remove
 * them; a team they own alone goes with the account. The check only reads. Then files, waitlist signup and the account itself
 * are removed and the session ends.
 */
export async function deleteAccountAction(input: z.input<typeof schema>): Promise<DeleteResult> {
  const { sb, user } = await requireUser();
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, message: "Type your name to confirm." };
  if (!rateLimit(`delete:${user.id}`, 5, 60 * 60_000)) return { ok: false, message: "Too many attempts. Try again in an hour." };

  const { data: profile } = await sb.from("profiles").select("handle").eq("id", user.id).single();
  if (!profile || p.data.confirm.toLowerCase() !== profile.handle.toLowerCase()) return { ok: false, message: "That does not match your name. Nothing was deleted." };

  // Read only: nothing is changed until the final delete. A team owner with other players must remove them first (the same rule as
  // leaving a team). Anyone else's team membership, and a team owned alone, are removed by the account delete itself (cascade).
  const { data: roster, error: rosterError } = await sb.rpc("team_roster");
  if (rosterError) return { ok: false, message: "Something went wrong. Nothing was deleted." };
  const rows = roster ?? [];
  if (rows.some((m) => m.profile_id === user.id && m.team_role === "owner") && rows.length > 1) {
    return { ok: false, message: "You own a team with other players. Remove them from your team page first, then delete your account. Nothing was deleted." };
  }

  const result = await deleteAccount(user.id, user.email);
  if (!result.ok) return { ok: false, message: "We could not delete everything. Nothing further was changed. Try again." };
  await sb.auth.signOut();
  redirect(result.waitlist === "failed" ? "/login?deleted=partial" : "/login?deleted=1");
}
