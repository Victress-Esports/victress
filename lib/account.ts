import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** Storage buckets that hold files under a `<user id>/` folder. */
const BUCKETS = ["avatars", "scrim-uploads"] as const;

/**
 * Permanently deletes an account: the player's files and waitlist signup first, then the auth user, which cascades to the profile and every row
 * that references it (games, highlights, consents, share links, uploads' records, owned teams and memberships).
 * Service role only, server side. Returns false when it could not complete; nothing is half reported as done.
 */
export type DeleteResult = { ok: boolean; waitlist: "removed" | "failed" | "none" };

export async function deleteAccount(userId: string, email?: string | null): Promise<DeleteResult> {
  const admin = supabaseAdmin();
  if (!admin) return { ok: false, waitlist: "none" };
  let waitlist: DeleteResult["waitlist"] = "none";
  try {
    // A waitlist signup is keyed by email, not by account: remove it too.
    if (email) {
      const { error: wlError } = await admin.from("waitlist").delete().eq("email", email.trim().toLowerCase());
      // Needs migration 20261110000200 (service role may delete waitlist rows). Without it the account is still deleted and the
      // result says the waitlist signup remains, so nobody is told something was removed that was not.
      if (wlError) console.error(`account deletion: removing waitlist rows failed: ${wlError.message}`);
      waitlist = wlError ? "failed" : "removed";
    }
    for (const bucket of BUCKETS) {
      const { data: files, error } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
      if (error) {
        console.error(`account deletion: listing ${bucket} failed: ${error.message}`);
        return { ok: false, waitlist };
      }
      if (files?.length) {
        const { error: rmError } = await admin.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
        if (rmError) {
          console.error(`account deletion: removing from ${bucket} failed: ${rmError.message}`);
          return { ok: false, waitlist };
        }
      }
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.error(`account deletion: deleting the user failed: ${error.message}`);
    return { ok: !error, waitlist };
  } catch (e) {
    console.error("account deletion failed", e instanceof Error ? e.message : e);
    return { ok: false, waitlist };
  }
}
