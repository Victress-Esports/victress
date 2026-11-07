// Production: victressesports.com (marketing) and victress.gg (product).
// Vercel preview deployments have a single hostname, so both sites live on it and links hop between them
// through /__site/{app|marketing}, which sets a cookie that tells the middleware which site to serve.
const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;

/** True on Vercel preview deployments only. Production and local dev (*.localhost) are false. */
export const IS_PREVIEW = vercelEnv === "preview" && !!vercelUrl;
const previewOrigin = IS_PREVIEW ? `https://${vercelUrl}` : null;

export const MARKETING_URL = previewOrigin ?? process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://victressesports.com";
export const APP_URL = previewOrigin ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://victress.gg";

/**
 * Campaign tags for links from the marketing site to the application, so the application's own analytics can attribute
 * a visit to the marketing site. One convention everywhere: source victressesports, medium website, campaign site_cta,
 * content = where the link sits. The two sites are separate analytics properties and do not share sessions.
 */
const withUtm = (path: string, placement?: string) => {
  if (!placement) return path;
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("utm_source", "victressesports");
  params.set("utm_medium", "website");
  params.set("utm_campaign", "site_cta");
  params.set("utm_content", placement);
  return `${base}?${params.toString()}`;
};

/** Link to a page on the product site. All marketing CTAs use this; pass a placement id to tag the link. */
export const appUrl = (path = "/", placement?: string) => {
  const p = withUtm(path, placement);
  return IS_PREVIEW ? `${APP_URL}/__site/app?to=${encodeURIComponent(p)}` : `${APP_URL}${p}`;
};

/** Link to a page on the marketing site. */
export const marketingUrl = (path = "/") =>
  IS_PREVIEW ? `${MARKETING_URL}/__site/marketing?to=${encodeURIComponent(path)}` : `${MARKETING_URL}${path}`;

/**
 * For GET forms that submit to the product site (the claim input). On preview the hop endpoint needs a
 * `to` field, and it forwards every other field to the destination.
 */
export const appFormAction = (path: string) => (IS_PREVIEW ? `${APP_URL}/__site/app` : `${APP_URL}${path}`);
export const appFormHidden = (path: string) => (IS_PREVIEW ? { to: path } : null);
