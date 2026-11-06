export const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://victressesports.com";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://victress.gg";

/** All marketing CTAs link to the product domain. */
export const appUrl = (path = "/") => `${APP_URL}${path}`;
export const marketingUrl = (path = "/") => `${MARKETING_URL}${path}`;
