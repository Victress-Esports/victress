import "server-only";
import { createClient } from "@supabase/supabase-js";
import { resolveSupabaseEnv } from "@/lib/supabase/resolve-env";

/**
 * The service role configuration for this deployment, or null. Production reads SUPABASE_SERVICE_ROLE_KEY; Preview reads
 * STAGING_SUPABASE_SERVICE_ROLE_KEY and never the production one (lib/supabase/resolve-env.ts). The URL is the one inlined at build
 * time (the same project as the anon key); if the runtime variables disagree with it, nothing is returned rather than risk
 * pairing a key with the wrong project. Server only.
 */
function adminConfig(): { url: string; key: string } | null {
  const r = resolveSupabaseEnv(process.env);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !r.serviceRoleKey) {
    console.error(`Supabase admin client unavailable: ${!url ? "the Supabase URL was not set at build time" : `${r.names.serviceRoleKey} is not set`}.`);
    return null;
  }
  if (r.url && r.url !== url) {
    console.error(`Supabase admin client unavailable: ${r.names.url} does not match the project this build was made for.`);
    return null;
  }
  return { url, key: r.serviceRoleKey };
}

/** True when a service role client can be created. Does not log. */
export function supabaseAdminConfigured(): boolean {
  const r = resolveSupabaseEnv(process.env);
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!r.serviceRoleKey && (!r.url || r.url === process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** Service-role client. Server only: never import from a client component. */
export function supabaseAdmin() {
  const c = adminConfig();
  if (!c) return null;
  return createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false } });
}
