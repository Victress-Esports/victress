import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isLocalHost, isProdHost, siteFor } from "@/lib/hosts";
import { APP_URL, MARKETING_URL } from "@/lib/urls";

// robots.txt per domain, each pointing at its own sitemap.
// Disallow rules use "/" or "$" so they match only the private routes, never a player whose handle starts the same way
// (for example /dashboard_fan or /joint_ace are valid profile URLs).
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");

  // Previews and staging: keep every crawler out.
  if (!isProdHost(host) && !isLocalHost(host)) return { rules: { userAgent: "*", disallow: "/" } };

  if (siteFor(host) === "m") {
    return {
      rules: { userAgent: "*", allow: ["/", "/api/og"], disallow: ["/api/"] },
      sitemap: `${MARKETING_URL}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: "*",
      // /api/og stays crawlable: Twitter, Facebook and LinkedIn fetch social cards from there.
      allow: ["/", "/api/og"],
      disallow: [
        "/api/",
        "/auth/",
        "/dashboard$",
        "/dashboard/",
        "/partner$",
        "/partner/",
        "/onboarding$",
        "/onboarding/",
        "/login$",
        "/login/",
        "/join/",
        "/__site/",
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
