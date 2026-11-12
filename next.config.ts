import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { APP_HOST, MARKETING_HOST } from "./lib/hosts";
import { resolveSupabaseEnv } from "./lib/supabase/resolve-env";

const NOINDEX = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

// Vercel will not accept NEXT_PUBLIC_ names, nor the same name in two environments. Production reads SUPABASE_URL and
// SUPABASE_ANON_KEY; Preview reads STAGING_SUPABASE_URL and STAGING_SUPABASE_ANON_KEY and never falls back to production
// (lib/supabase/resolve-env.ts has the rules). Whichever pair applies is mapped here to the names the code reads. Both values are
// public by design (they ship to the browser). The service role key is deliberately NOT mapped: it is read at runtime on the
// server only and must never be inlined into any built file.
const supabase = resolveSupabaseEnv(process.env);
const SUPABASE_URL = supabase.url;
const SUPABASE_ANON_KEY = supabase.anonKey;

const config: NextConfig = {
  poweredByHeader: false,
  env: {
    ...(SUPABASE_URL ? { NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL } : {}),
    ...(SUPABASE_ANON_KEY ? { NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY } : {}),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Avatars: Supabase Storage uploads plus Discord and Google profile pictures.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  // One canonical host per domain: www redirects to the bare host with a 308 (permanent) for every path.
  // Runs before middleware, so it also covers /sitemap.xml, /robots.txt and icons.
  async redirects() {
    return [MARKETING_HOST, APP_HOST].map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: `www.${host}` }],
      destination: `https://${host}/:path*`,
      permanent: true,
    }));
  },

  // Private and utility routes are never indexed, even if something links to them.
  // (/api/og stays open: social networks fetch their cards from it.)
  async headers() {
    return [
      "/api/waitlist",
      "/api/contact",
      "/api/handle-check",
      "/api/discord/:path*",
      "/auth/:path*",
      "/dashboard/:path*",
      "/onboarding/:path*",
      "/login",
      "/join/:path*",
    ]
      .map((source) => ({ source, headers: NOINDEX }))
      // Sharing links are private capabilities: never cached, never indexed, and they send no referrer.
      .concat([
        {
          source: "/r/:path*",
          headers: [
            ...NOINDEX,
            { key: "Cache-Control", value: "no-store" },
            { key: "Referrer-Policy", value: "no-referrer" },
          ],
        },
      ]);
  },
};

// Fail the build loudly when either value is missing, so a deployment never ships without Supabase.
// Set SKIP_SUPABASE_ENV_CHECK=1 only for a marketing-only local build.
export default function nextConfig(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD && process.env.SKIP_SUPABASE_ENV_CHECK !== "1") {
    if (supabase.errors.length > 0) {
      throw new Error(`Build stopped: ${supabase.errors.join(" ")}`);
    }
  }
  return config;
}
