"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Result } from "@/app/a/dashboard/actions";
import { requireUser } from "@/lib/auth";
import { FIELD_KEYS, cleanFields, directoryEnabled, newShareToken, sharingEnabled } from "@/lib/privacy";
import { appUrl } from "@/lib/urls";

const fail = (message = "Something went wrong. Try again."): Result => ({ ok: false, message });

// Link lifetimes offered to players, in days. The 90 day default is a proposal pending legal review.
const LINK_DAYS = [7, 30, 90] as const;

const settingsSchema = z.object({
  directory_listed: z.boolean(),
  search_indexable: z.boolean(),
  show_on_leaderboards: z.boolean(),
  public_fields: z.record(z.enum(FIELD_KEYS), z.boolean()),
});

/**
 * Saves the player's consent choices. Everything is private by default. Turning exposure ON requires the matching
 * feature to be switched on for the site; turning it OFF is always allowed. `scoutable` is not writable here
 * (and recruiter discovery does not exist).
 */
export async function savePrivacyAction(input: z.input<typeof settingsSchema>): Promise<Result> {
  const { sb, user } = await requireUser();
  const p = settingsSchema.safeParse(input);
  if (!p.success) return fail();
  const s = p.data;
  const { data: cur } = await sb.from("profiles").select("directory_listed, show_on_leaderboards").eq("id", user.id).single();
  if (!cur) return fail();

  const wantsExposure = s.directory_listed && !cur.directory_listed;
  if (wantsExposure && !directoryEnabled()) return fail("Public profiles are not open. Your profile stays private.");

  const directory = s.directory_listed;
  const { error } = await sb
    .from("profiles")
    .update({
      directory_listed: directory,
      search_indexable: directory && s.search_indexable,
      show_on_leaderboards: false, // leaderboards are built on stats players enter, which Victress does not publish
      public_fields: cleanFields(s.public_fields),
    })
    .eq("id", user.id);
  if (error) return fail();
  revalidatePath("/dashboard/privacy");
  return { ok: true, message: "Saved." };
}

const linkSchema = z.object({
  label: z.string().trim().max(60),
  days: z.number().refine((d) => (LINK_DAYS as readonly number[]).includes(d)),
  fields: z.record(z.enum(FIELD_KEYS), z.boolean()),
});

/** Creates a private sharing link. The token is returned once; only its hash is stored. */
export async function createShareLinkAction(input: z.input<typeof linkSchema>): Promise<Result & { url?: string }> {
  const { sb, user } = await requireUser();
  if (!sharingEnabled()) return fail("Sharing links are not available yet.");
  const p = linkSchema.safeParse(input);
  if (!p.success) return fail("Check the link name and expiry.");
  const { token, hash } = newShareToken();
  const { error } = await sb.from("profile_share_links").insert({
    profile_id: user.id,
    token_hash: hash,
    label: p.data.label || null,
    fields: cleanFields(p.data.fields),
    expires_at: new Date(Date.now() + p.data.days * 86_400_000).toISOString(),
  });
  if (error) return fail(error.message.includes("share_link_limit") ? "You have 20 active links. Revoke one first." : undefined);
  revalidatePath("/dashboard/privacy");
  return { ok: true, url: appUrl(`/r/${token}`), message: "Link created. Copy it now: it is shown only once." };
}

export async function revokeShareLinkAction(id: string): Promise<Result> {
  const { sb, user } = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return fail();
  const { error } = await sb
    .from("profile_share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("profile_id", user.id)
    .is("revoked_at", null);
  if (error) return fail();
  revalidatePath("/dashboard/privacy");
  return { ok: true, message: "Link revoked. It stops working immediately." };
}
