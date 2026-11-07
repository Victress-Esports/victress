// One place that knows which hostnames are real production hosts.
// victressesports.com -> marketing site, victress.gg -> product site. www redirects to the bare host (next.config.ts).
export const MARKETING_HOST = "victressesports.com";
export const APP_HOST = "victress.gg";
export const PROD_HOSTS = new Set([MARKETING_HOST, `www.${MARKETING_HOST}`, APP_HOST, `www.${APP_HOST}`]);

export type Site = "m" | "a";

/** Host header (with or without a port) -> bare lowercase hostname. */
export const bareHost = (host: string | null | undefined) => (host ?? "").toLowerCase().split(":")[0];

export const isProdHost = (host: string | null | undefined) => PROD_HOSTS.has(bareHost(host));
export const isLocalHost = (host: string | null | undefined) => bareHost(host).endsWith("localhost");

/** Which site a host serves. `cookie` is the preview-only v_site switch; production hosts ignore it. */
export function siteFor(host: string | null | undefined, cookie?: string): Site {
  const h = bareHost(host);
  if (h.startsWith("app.") || h === APP_HOST || h.endsWith(`.${APP_HOST}`)) return "a";
  if (h.startsWith("marketing.") || PROD_HOSTS.has(h)) return "m";
  return cookie === "a" ? "a" : "m";
}
