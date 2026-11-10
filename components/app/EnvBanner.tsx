import { PRODUCTION_PROJECT_REF, STAGING_PROJECT_REF } from "@/lib/supabase/resolve-env";

/**
 * A visible guard. It renders only when the Supabase project this build talks to is the STAGING project (a banner), and, as a second
 * line of defence behind the build check in next.config.ts, in red if a non production deployment somehow points at the PRODUCTION project.
 * Production (victress.gg and victressesports.com on the production project) and local mock runs show nothing.
 * Server component. Reads only the public Supabase URL and the Vercel environment name, both inlined at build time.
 */
export function EnvBanner() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
  const wrong = !!vercelEnv && vercelEnv !== "production" && url.includes(PRODUCTION_PROJECT_REF);
  if (!wrong && !url.includes(STAGING_PROJECT_REF)) return null;
  return (
    <div
      role={wrong ? "alert" : "status"}
      className={`px-4 py-2 text-center text-sm font-semibold ${wrong ? "bg-crimson text-white" : "bg-surface-2 text-white border-b border-line"}`}
    >
      {wrong
        ? "Wrong database: this preview is connected to the PRODUCTION project. Do not use it."
        : "Staging. Connected to the victress-staging database. Stripe test mode only. Test accounts only."}
    </div>
  );
}
