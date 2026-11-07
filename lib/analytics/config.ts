// Which Google Tag Manager container belongs to which site. These identifiers are public (they appear in page source),
// so they are committed. Each site has its own container and its own GA4 property; they must never be mixed.
// The GA4 measurement id is configured inside the container, not in this code (no second gtag.js install).
import { APP_HOST, MARKETING_HOST, isProdHost, siteFor, type Site } from "../hosts";

export const ANALYTICS = {
  m: { label: "marketing", gtm: "GTM-N38XS3DR", ga4: "G-GSMR43YQMP", stream: "16289690393", url: `https://${MARKETING_HOST}` },
  a: { label: "app", gtm: "GTM-PXQKSWP2", ga4: "G-ZBL5HGHG42", stream: "16289720897", url: `https://${APP_HOST}` },
} as const;

/**
 * ANALYTICS_MODE (server environment variable):
 *   unset or "off"  analytics never loads (default).
 *   "production"    loads only on the real production hosts, each with its own container.
 *   "debug"         loads on any host, for local verification only. Never set it on a deployment.
 * Even when enabled, nothing loads for a visitor until analytics consent is granted (lib/analytics/consent.ts).
 */
export function analyticsFor(host: string | null | undefined): { site: Site; gtmId: string } | null {
  const mode = (process.env.ANALYTICS_MODE ?? "off").toLowerCase();
  if (mode !== "production" && mode !== "debug") return null;
  if (mode === "production" && !isProdHost(host)) return null;
  const site = siteFor(host);
  return { site, gtmId: ANALYTICS[site].gtm };
}
