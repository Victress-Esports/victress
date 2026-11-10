import "server-only";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Admin console guard. The person's OWN session must pass partner_is_admin() (a row in partner_admins, added by the founder with the service role).
 * Only then is the service role client returned. Anyone else gets a 404, so the console does not reveal that it exists.
 * The service role client is untyped on purpose: the generated types describe what the app roles may do, not what the console may do.
 */
export async function requireAdmin() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) notFound();
  const { data: isAdmin } = await sb.rpc("partner_is_admin");
  if (!isAdmin) notFound();
  const admin = supabaseAdmin() as unknown as SupabaseClient | null;
  if (!admin) notFound();
  return { admin, adminId: user.id };
}

/** Every console action is logged (Partner Experience, section 14). A failed log write stops the action from being reported as done. */
export async function logAdminAction(admin: SupabaseClient, adminId: string, action: string, table: string, targetId: string, detail: Record<string, unknown> = {}) {
  const { error } = await admin.from("partner_admin_log").insert({ admin_id: adminId, action, target_table: table, target_id: targetId, detail });
  if (error) console.error("partner admin log failed", error.message);
  return !error;
}
