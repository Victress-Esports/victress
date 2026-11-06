import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { APP_URL, MARKETING_URL } from "@/lib/urls";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = ((await headers()).get("host") ?? "").split(":")[0];
  if (host.startsWith("app.") || host.endsWith("victress.gg")) {
    return [{ url: APP_URL, changeFrequency: "monthly", priority: 0.5 }];
  }
  return ["", "/pricing", "/teams", "/about", "/privacy", "/terms"].map((p) => ({
    url: `${MARKETING_URL}${p}`,
    changeFrequency: "monthly",
    priority: p === "" ? 1 : 0.7,
  }));
}
