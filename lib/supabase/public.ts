import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseEnv } from "./env";

/** Cookie-less anon client for public reads (public profiles, OG images). Lets pages be cached. */
export function supabasePublic() {
  const { url, anonKey } = supabaseEnv();
  return createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
