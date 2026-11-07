import type { NextConfig } from "next";
import { APP_HOST, MARKETING_HOST } from "./lib/hosts";

const NOINDEX = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const config: NextConfig = {
  poweredByHeader: false,
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
      "/auth/:path*",
      "/dashboard/:path*",
      "/onboarding/:path*",
      "/login",
      "/join/:path*",
    ].map((source) => ({ source, headers: NOINDEX }));
  },
};

export default config;
