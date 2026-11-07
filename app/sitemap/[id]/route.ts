import { siteFor } from "@/lib/hosts";
import { openBoardEntries, profileEntries } from "@/lib/sitemap-data";
import { appBase, urlset, xmlResponse } from "@/lib/sitemap";

// Child sitemaps for the product site, used only when there are too many profiles for one file:
//   /sitemap/static.xml        home and open leaderboards
//   /sitemap/profiles-N.xml    profile pages, PAGE_SIZE per file, N starting at 1
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (siteFor(req.headers.get("host")) !== "a") return new Response("Not found", { status: 404 });
  const { id } = await params;

  try {
    if (id === "static.xml") return xmlResponse(urlset([{ loc: appBase }, ...(await openBoardEntries())]));
    const m = /^profiles-(\d{1,6})\.xml$/.exec(id);
    if (m && Number(m[1]) >= 1) {
      const entries = await profileEntries(Number(m[1]) - 1);
      if (entries.length === 0) return new Response("Not found", { status: 404 });
      return xmlResponse(urlset(entries));
    }
    return new Response("Not found", { status: 404 });
  } catch {
    return xmlResponse("sitemap unavailable", 503);
  }
}
