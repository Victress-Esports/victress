/**
 * The two Supabase values every client needs. Both are PUBLIC by design (they ship to the browser; Row Level
 * Security is what protects data). The service role key is different: it is read only in lib/supabase-admin.ts,
 * is never mapped in next.config.ts and must never appear in a client bundle.
 *
 * Vercel names: SUPABASE_URL and SUPABASE_ANON_KEY. next.config.ts maps them to the names read here at build time.
 * Locally, NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY still work.
 */
export const SUPABASE_ENV_MESSAGE =
  "Supabase is not configured: SUPABASE_URL and SUPABASE_ANON_KEY are missing at build time. " +
  "Set them in Vercel (Production and Preview separately) and redeploy. " +
  "Locally, NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY also work.";

/** Returns the URL and anon key, or throws a clear error. Never returns undefined values. */
export function supabaseEnv(): { url: string; anonKey: string } {
  // Literal property reads: Next inlines these at build time, so they must not be computed.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error(SUPABASE_ENV_MESSAGE);
  return { url, anonKey };
}
