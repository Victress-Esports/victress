import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { APP_URL, MARKETING_URL } from "@/lib/urls";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = ((await headers()).get("host") ?? "").split(":")[0];
  const isApp = host.startsWith("app.") || host.endsWith("victress.gg");
  const base = isApp ? APP_URL : MARKETING_URL;
  return {
    rules: { userAgent: "*", allow: "/", disallow: isApp ? ["/api/", "/dashboard", "/onboarding", "/login"] : ["/api/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
