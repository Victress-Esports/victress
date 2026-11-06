import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { APP_URL, MARKETING_URL } from "@/lib/urls";

const PROD_HOSTS = new Set(["victress.gg", "www.victress.gg", "victressesports.com", "www.victressesports.com"]);

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = ((await headers()).get("host") ?? "").split(":")[0];
  const isApp = host.startsWith("app.") || host.endsWith("victress.gg");
  const isLocal = host.endsWith("localhost");

  // Previews and staging: keep every crawler out.
  if (!PROD_HOSTS.has(host) && !isLocal && !host.startsWith("app.") && !host.startsWith("marketing.")) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  const base = isApp ? APP_URL : MARKETING_URL;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: isApp ? ["/api/", "/dashboard", "/onboarding", "/login", "/join"] : ["/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
