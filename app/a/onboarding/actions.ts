"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { sendWelcome } from "@/lib/email";
import { checkHandle } from "@/lib/handles";
import { GAMES } from "@/content/games";

export async function claimNameAction(raw: string): Promise<{ status: "ok" | "invalid" | "reserved" | "taken" | "error" }> {
  const { sb, user } = await requireUser();
  const { verdict, handle } = checkHandle(String(raw ?? ""));
  if (verdict !== "ok") return { status: verdict };

  const { data, error } = await sb.rpc("claim_handle", { p_handle: handle });
  if (error || !data) return { status: "error" };
  if (data !== "ok") return { status: data === "taken" ? "taken" : data === "reserved" ? "reserved" : "invalid" };

  if (user.email && !user.user_metadata?.welcomed) {
    await sendWelcome(user.email, handle).catch((e) => console.error("welcome email failed", e));
    await sb.auth.updateUser({ data: { welcomed: true } });
  }
  return { status: "ok" };
}

const finishSchema = z.object({
  game: z.enum(["VALORANT", "CS2"]).nullable().optional(),
  role: z.string().max(40).nullable().optional(),
  rank: z.string().max(40).nullable().optional(),
});

/** Saves the three onboarding answers (all optional: skipping is always allowed) and goes to the dashboard. */
export async function finishOnboardingAction(input: z.input<typeof finishSchema>) {
  const { sb, user } = await requireUser();
  const parsed = finishSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };

  const { game } = parsed.data;
  const cfg = game ? GAMES[game] : null;
  const role = cfg && parsed.data.role && cfg.roles.includes(parsed.data.role) ? parsed.data.role : null;
  const rank = cfg && parsed.data.rank && cfg.ranks.includes(parsed.data.rank) ? parsed.data.rank : null;

  const { error } = await sb
    .from("profiles")
    .update({ game: game ?? null, role, rank })
    .eq("id", user.id);
  if (error) return { ok: false as const };

  await sb.auth.updateUser({ data: { onboarded: true } });
  redirect("/dashboard");
}
