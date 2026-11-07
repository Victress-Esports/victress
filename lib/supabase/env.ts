/**
 * The two Supabase values every client needs. Both are PUBLIC by design (they ship to the browser; Row Level
 * Security is what protects data). The service role key is different: it is read only in lib/supabase-admin.ts,
 * is never mapped in next.config.ts and must never appear in a client bundle.
 *
 * next.config.ts maps the right pair for the environment (production SUPABASE_*, Preview STAGING_SUPABASE_*) to the names read
 * here at build time; lib/supabase/resolve-env.ts has the rules.
 */
export const SUPABASE_ENV_MESSAGE =
  "Supabase is not configured: the Supabase URL and anon key were missing when this app was built. " +
  "Production needs SUPABASE_URL and SUPABASE_ANON_KEY; Preview needs STAGING_SUPABASE_URL and STAGING_SUPABASE_ANON_KEY. " +
  "Set them in Vercel for the right environment and redeploy. Locally, NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or the STAGING_ pair) work.";

/** Returns the URL and anon key, or throws a clear error. Never returns undefined values. */
export function supabaseEnv(): { url: string; anonKey: string } {
  // Literal property reads: Next inlines these at build time, so they must not be computed.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error(SUPABASE_ENV_MESSAGE);
  return { url, anonKey };
}
