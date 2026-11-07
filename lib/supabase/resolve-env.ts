/**
 * Which Supabase project this build and this server talk to. Pure and dependency free so next.config.ts, the server code and the
 * tests all use the same rules. SERVER AND BUILD ONLY: never import it from client code (it names the service role variables).
 *
 *   VERCEL_ENV=production -> SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   VERCEL_ENV=preview    -> STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY, STAGING_SUPABASE_SERVICE_ROLE_KEY
 *   anywhere else (local) -> the STAGING_ trio when STAGING_SUPABASE_URL is set (run locally against staging); otherwise the
 *                            NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY pair plus SUPABASE_SERVICE_ROLE_KEY that
 *                            the mock sign in scripts and tests use.
 *
 * A Preview never falls back to the production values, and production never falls back to staging. Vercel does not allow the
 * same variable name in different environments, which is why Preview has its own names.
 */
export type SupabaseEnvMode = "production" | "preview" | "local";

type Env = Record<string, string | undefined>;

/** Project refs are public (they appear in every page's JavaScript). Used only to refuse a mix up between the two projects. */
export const PRODUCTION_PROJECT_REF = "pmamceqshyfptvjgimsf";
export const STAGING_PROJECT_REF = "cmvifuayvqhbfkeskoqi";

export interface ResolvedSupabaseEnv {
  mode: SupabaseEnvMode;
  url?: string;
  anonKey?: string;
  serviceRoleKey?: string;
  /** The variable names read in this mode (never values). */
  names: { url: string; anonKey: string; serviceRoleKey: string };
  /** Why the configuration is unusable. Empty means usable. */
  errors: string[];
}

export function resolveSupabaseEnv(env: Env): ResolvedSupabaseEnv {
  const vercelEnv = env.VERCEL_ENV;
  const mode: SupabaseEnvMode = vercelEnv === "production" ? "production" : vercelEnv === "preview" ? "preview" : "local";
  const errors: string[] = [];

  if (env.VERCEL && !vercelEnv) {
    errors.push(
      "Running on Vercel but VERCEL_ENV is not available, so the deployment cannot tell Production from Preview. In Vercel, Project Settings, Environment Variables, turn on 'Automatically expose System Environment Variables'.",
    );
  }

  let names: ResolvedSupabaseEnv["names"];
  let url: string | undefined;
  let anonKey: string | undefined;
  let serviceRoleKey: string | undefined;

  if (mode === "production") {
    names = { url: "SUPABASE_URL", anonKey: "SUPABASE_ANON_KEY", serviceRoleKey: "SUPABASE_SERVICE_ROLE_KEY" };
    ({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey } = env);
  } else if (mode === "preview" || env.STAGING_SUPABASE_URL) {
    names = { url: "STAGING_SUPABASE_URL", anonKey: "STAGING_SUPABASE_ANON_KEY", serviceRoleKey: "STAGING_SUPABASE_SERVICE_ROLE_KEY" };
    ({ STAGING_SUPABASE_URL: url, STAGING_SUPABASE_ANON_KEY: anonKey, STAGING_SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey } = env);
  } else {
    names = { url: "NEXT_PUBLIC_SUPABASE_URL", anonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY", serviceRoleKey: "SUPABASE_SERVICE_ROLE_KEY" };
    ({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey } = env);
  }

  // On Vercel all three must exist (the service role key is read at runtime, the other two at build time).
  // Locally only the URL and the anon key are required, so a marketing only build works.
  const required: [string, string | undefined][] = [
    [names.url, url],
    [names.anonKey, anonKey],
    ...(mode === "local" ? [] : ([[names.serviceRoleKey, serviceRoleKey]] as [string, string | undefined][])),
  ];
  const missing = required.filter(([, v]) => !v).map(([n]) => n);
  if (missing.length > 0) {
    const where =
      mode === "preview"
        ? "Vercel, Project Settings, Environment Variables, environment Preview only. A Preview never falls back to the production variables"
        : mode === "production"
          ? "Vercel, Project Settings, Environment Variables, environment Production"
          : "your local environment (the STAGING_ trio to run against staging, or NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for the mock scripts)";
    errors.push(`${mode === "preview" ? "Preview" : mode === "production" ? "Production" : "Local"} build: ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} not set. Add ${missing.length > 1 ? "them" : "it"} in ${where}, then redeploy.`);
  }

  // Never let one environment point at the other project.
  if (url) {
    if (mode === "preview" && url.includes(PRODUCTION_PROJECT_REF)) errors.push(`${names.url} points at the PRODUCTION Supabase project. A Preview must use the staging project.`);
    if (mode === "production" && url.includes(STAGING_PROJECT_REF)) errors.push(`${names.url} points at the STAGING Supabase project. Production must use the production project.`);
    if (mode === "preview" && env.SUPABASE_URL && url === env.SUPABASE_URL) errors.push(`${names.url} equals SUPABASE_URL (the production project). A Preview must use the staging project.`);
  }

  return { mode, url, anonKey, serviceRoleKey, names, errors };
}
