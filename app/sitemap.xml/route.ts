import { siteFor } from "@/lib/hosts";
import { openBoardEntries, profileEntries, profileTotal } from "@/lib/sitemap-data";
import { PAGE_SIZE, appBase, marketingEntries, sitemapIndex, urlset, xmlResponse } from "@/lib/sitemap";

// One /sitemap.xml per domain, chosen by the Host header.
//   victressesports.com -> the marketing pages
//   victress.gg         -> home, open leaderboards and public profiles (a sitemap index once profiles outgrow one file)
export async function GET(req: Request) {
  if (siteFor(req.headers.get("host")) === "m") return xmlResponse(urlset(marketingEntries()));

  try {
    const total = await profileTotal();
    const statics = [{ loc: appBase }, ...(await openBoardEntries())];
    if (total <= PAGE_SIZE) return xmlResponse(urlset([...statics, ...(await profileEntries(0))]));

    const pages = Math.ceil(total / PAGE_SIZE);
    return xmlResponse(
      sitemapIndex([
        { loc: `${appBase}/sitemap/static.xml` },
        ...Array.from({ length: pages }, (_, i) => ({ loc: `${appBase}/sitemap/profiles-${i + 1}.xml` })),
      ]),
    );
  } catch {
    // Better to fail than to submit a sitemap that silently lacks profiles.
    return xmlResponse("sitemap unavailable", 503);
  }
}
