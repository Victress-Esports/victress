import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Cookie-less anon client for public reads (public profiles, OG images). Lets pages be cached. */
export function supabasePublic() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
