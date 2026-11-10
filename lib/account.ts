import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** Storage buckets that hold files under a `<user id>/` folder. */
const BUCKETS = ["avatars", "scrim-uploads"] as const;

/**
 * Permanently deletes an account: the player's files first, then the auth user, which cascades to the profile and every row
 * that references it (games, highlights, consents, share links, uploads' records, owned teams and memberships).
 * Service role only, server side. Returns false when it could not complete; nothing is half reported as done.
 */
export async function deleteAccount(userId: string): Promise<boolean> {
  const admin = supabaseAdmin();
  if (!admin) return false;
  try {
    for (const bucket of BUCKETS) {
      const { data: files, error } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
      if (error) return false;
      if (files?.length) {
        const { error: rmError } = await admin.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
        if (rmError) return false;
      }
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    return !error;
  } catch (e) {
    console.error("account deletion failed", e instanceof Error ? e.message : e);
    return false;
  }
}
