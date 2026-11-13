"use server";

import { revalidatePath } from "next/cache";
import type { Result } from "@/app/a/dashboard/actions";
import { requireUser } from "@/lib/auth";
import { DISCORD_LINK_CONSENT_VERSION, hashLinkCode, isLinkCode } from "@/lib/discord/link";

const MESSAGES: Record<string, string> = {
  invalid: "This link is not valid any more. Run /link in Discord again to get a new one.",
  expired: "This link has expired. Run /link in Discord again to get a new one.",
  consent_required: "Accept the Terms and Privacy Policy first, then open the link again.",
  profile_has_link: "Your Victress account is already linked to a Discord account. Unlink it on your Account page first.",
  discord_taken: "That Discord account is already linked to another Victress account.",
  unauthorized: "Sign in to Victress first.",
};

/** Completes a link as the signed in player. The database checks the code, the expiry, the consent records and the one to one rules. */
export async function confirmDiscordLinkAction(code: string): Promise<Result> {
  const { sb } = await requireUser();
  if (!isLinkCode(code)) return { ok: false, message: MESSAGES.invalid };
  const { data, error } = await sb.rpc("discord_complete_link", { p_code_hash: hashLinkCode(code), p_consent_version: DISCORD_LINK_CONSENT_VERSION });
  if (error) return { ok: false, message: "Something went wrong. Try again." };
  revalidatePath("/dashboard/account");
  if (data === "ok") return { ok: true, message: "Your Discord account is linked. Go back to Discord and run /profile." };
  return { ok: false, message: MESSAGES[String(data)] ?? "Something went wrong. Try again." };
}

/** Removes the link from the website. Row level security allows a player to delete only their own link. */
export async function unlinkDiscordAction(): Promise<Result> {
  const { sb, user } = await requireUser();
  const { error } = await sb.from("discord_links").delete().eq("profile_id", user.id);
  if (error) return { ok: false, message: "Couldn't unlink. Try again." };
  revalidatePath("/dashboard/account");
  return { ok: true, message: "Your Discord account is no longer linked." };
}
