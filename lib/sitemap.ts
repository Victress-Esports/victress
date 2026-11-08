import { APP_URL, MARKETING_URL } from "@/lib/urls";

export interface UrlEntry {
  loc: string;
  /** ISO 8601. Only set it when it is true (profiles); a made-up lastmod teaches crawlers to ignore it. */
  lastmod?: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export const urlset = (entries: UrlEntry[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  entries.map((e) => `<url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${esc(e.lastmod)}</lastmod>` : ""}</url>`).join("\n") +
  `\n</urlset>\n`;

export const sitemapIndex = (entries: UrlEntry[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  entries.map((e) => `<sitemap><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${esc(e.lastmod)}</lastmod>` : ""}</sitemap>`).join("\n") +
  `\n</sitemapindex>\n`;

export const xmlResponse = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Cached at the edge for an hour; refreshed in the background for a day.
      "Cache-Control": status === 200 ? "public, s-maxage=3600, stale-while-revalidate=86400" : "no-store",
    },
  });

/** Profiles per sitemap file. The protocol allows 50,000; smaller files keep database queries fast. */
export const PAGE_SIZE = Math.max(1, Number(process.env.SITEMAP_PAGE_SIZE) || 5000);

/** Every public marketing page. Add new pages here. */
export const MARKETING_PATHS = ["/", "/platform", "/women-in-esports", "/design-partner", "/pricing", "/teams", "/partnerships", "/about", "/contact", "/privacy", "/terms", "/refunds"];

export const marketingEntries = (): UrlEntry[] =>
  MARKETING_PATHS.map((p) => ({ loc: p === "/" ? MARKETING_URL : `${MARKETING_URL}${p}` }));

export const appBase = APP_URL;
