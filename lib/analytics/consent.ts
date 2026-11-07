// Consent state for analytics. The state lives in one first party cookie. No banner exists yet: until a consent
// control calls setConsent("granted"), no analytics tag loads. See docs/analytics/README.md.
export const CONSENT_COOKIE = "v_consent";
export const CONSENT_EVENT = "victress:consent";
export type ConsentValue = "granted" | "denied";

// A proposal pending counsel review, not a settled retention period.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export function getConsent(): ConsentValue | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=(granted|denied)`));
  return m ? (m[1] as ConsentValue) : null;
}

export function setConsent(value: ConsentValue) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

/** Best effort removal of Google Analytics cookies (_ga, _ga_<id>) on this host and its parent domain. */
export function clearGaCookies() {
  const names = document.cookie.split("; ").map((c) => c.split("=")[0]).filter((n) => n === "_ga" || n.startsWith("_ga_") || n === "_gid" || n.startsWith("_gat"));
  const parts = location.hostname.split(".");
  const domains = ["", location.hostname, parts.length > 2 ? `.${parts.slice(-2).join(".")}` : `.${location.hostname}`];
  for (const n of names) for (const d of domains) document.cookie = `${n}=; path=/; max-age=0${d ? `; domain=${d}` : ""}`;
}
