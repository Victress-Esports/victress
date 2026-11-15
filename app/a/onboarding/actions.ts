"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ROLE_IDS, getRole } from "@/lib/roles";
import { requireUser, safeNext } from "@/lib/auth";
import { sendWelcome } from "@/lib/email";
import { checkHandle } from "@/lib/handles";
import { GAME_IDS, getGame } from "@/content/games";
import { savePlayerGame } from "@/lib/player-games";

export type ClaimStatus = "ok" | "invalid" | "reserved" | "taken" | "cooldown" | "error";

export async function claimNameAction(raw: string): Promise<{ status: ClaimStatus }> {
  const { sb, user } = await requireUser();
  const { verdict, handle } = checkHandle(String(raw ?? ""));
  if (verdict !== "ok") return { status: verdict };

  const { data, error } = await sb.rpc("claim_handle", { p_handle: handle });
  if (error || !data) return { status: "error" };
  if (data !== "ok") {
    return { status: data === "taken" || data === "reserved" || data === "cooldown" ? data : "invalid" };
  }

  if (user.email && !user.user_metadata?.welcomed) {
    await sendWelcome(user.email, handle).catch((e) => console.error("welcome email failed", e));
    await sb.auth.updateUser({ data: { welcomed: true } });
  }
  return { status: "ok" };
}

const finishSchema = z.object({
  game: z.enum(GAME_IDS).nullable().optional(),
  role: z.string().max(40).nullable().optional(),
  account_type: z.enum(ROLE_IDS).optional(),
});

/** Saves the onboarding answers (all optional: skipping is always allowed). The first game becomes the primary game. */
export async function finishOnboardingAction(input: z.input<typeof finishSchema>) {
  const { sb, user } = await requireUser();
  const parsed = finishSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };

  const cfg = getGame(parsed.data.game);
  if (cfg) {
    const role = parsed.data.role && cfg.roles.includes(parsed.data.role) ? parsed.data.role : null;
    if (!(await savePlayerGame(sb, user.id, cfg, role))) return { ok: false as const };
  }

  // account_type records what the person said they are. It is not an entitlement: it grants no access to anyone's data.
  await sb.auth.updateUser({ data: { onboarded: true, account_type: parsed.data.account_type ?? "player" } });

  // An invite link opened before signup: continue to it.
  const store = await cookies();
  const next = safeNext(decodeURIComponent(store.get("v_next")?.value ?? ""), getRole(parsed.data.account_type)?.destination ?? "/dashboard");
  store.delete("v_next");
  store.delete("v_role");
  redirect(next);
}
