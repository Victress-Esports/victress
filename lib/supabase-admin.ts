import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Service-role client. Server only: never import from a client component. */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Supabase admin client unavailable: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY is missing.");
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
