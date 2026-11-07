// Turns the real URL and title into values that are safe to send to Google Analytics.
// Pure functions with relative imports only, so scripts/analytics-test.mjs can run them directly.
import { GAME_LIST } from "../../content/games";

export type SiteKey = "m" | "a";
export type PathKind = "static" | "game" | "profile" | "join" | "auth" | "token" | "other";

export interface Classified {
  /** The path as it may appear in analytics. Anything with a secret or a name in it is replaced by a placeholder. */
  path: string;
  kind: PathKind;
  /** True when the tag container must not load on this page: the URL holds a secret, or the title can hold a person's name. */
  noLoad: boolean;
}

const MARKETING_PAGES = new Set([
  "/", "/pricing", "/teams", "/partnerships", "/about", "/contact", "/privacy", "/terms", "/platform", "/women-in-esports", "/design-partner",
]);
const APP_PAGES = new Set([
  "/", "/login", "/onboarding", "/dashboard", "/dashboard/profile", "/dashboard/stats", "/dashboard/team", "/dashboard/resume", "/dashboard/scrims",
  "/dashboard/privacy", "/dashboard/scout", "/leaderboard",
]);
const GAME_SLUGS = new Set(GAME_LIST.map((g) => g.slug));

/** The only query parameters ever sent: campaign attribution. Everything else (next, claim, code, error, tokens) is dropped. */
export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id"] as const;
const UTM_VALUE = /^[A-Za-z0-9._~+\- ]{1,100}$/;

export function classifyPath(site: SiteKey, rawPath: string): Classified {
  let path = rawPath.split(/[?#]/)[0] || "/";
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (site === "m") {
    return MARKETING_PAGES.has(path) ? { path, kind: "static", noLoad: false } : { path: "/other", kind: "other", noLoad: false };
  }
  if (APP_PAGES.has(path)) return { path, kind: "static", noLoad: false };
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "auth") return { path: "/auth", kind: "auth", noLoad: true };
  if (parts[0] === "join") return { path: "/join/:code", kind: "join", noLoad: true };
  if (parts[0] === "r") return { path: "/r/:token", kind: "token", noLoad: true };
  if (parts[0] === "leaderboard" && parts.length === 2 && GAME_SLUGS.has(parts[1])) return { path, kind: "game", noLoad: false };
  // One unknown segment is a player handle. The handle and the title (which holds a display name) are never sent.
  if (parts.length === 1) return { path: "/:handle", kind: "profile", noLoad: true };
  return { path: "/other", kind: "other", noLoad: false };
}

/** Allow-listed campaign parameters only, in a fixed order. */
export function safeQuery(search: string): string {
  const src = new URLSearchParams(search);
  const out = new URLSearchParams();
  for (const k of UTM_KEYS) {
    const v = src.get(k);
    if (v && UTM_VALUE.test(v)) out.set(k, v);
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

/**
 * The referrer the tag container would otherwise send as-is. A plain link from /join/{code} to /login makes the invite
 * code part of the next page's referrer. Same site referrers keep only a clean path; other sites keep only their origin
 * (enough for acquisition reports, never a path or query).
 */
export function sanitizeReferrer(site: SiteKey, referrer: string, ownOrigin: string): string {
  if (!referrer) return "";
  try {
    const r = new URL(referrer);
    if (r.origin === ownOrigin) return `${r.origin}${classifyPath(site, r.pathname).path}`;
    return `${r.origin}/`;
  } catch {
    return "";
  }
}

export interface SanitizedPage {
  page_location: string;
  page_path: string;
  page_title: string;
  kind: PathKind;
  noLoad: boolean;
}

export function sanitizeUrl(site: SiteKey, loc: { origin: string; pathname: string; search: string }, title: string): SanitizedPage {
  const c = classifyPath(site, loc.pathname);
  const query = safeQuery(loc.search);
  // Titles of static pages are fixed copy. Anything dynamic, or anything that looks like it holds an address or name marker, is generic.
  const titleOk = (c.kind === "static" || c.kind === "game" || (site === "m" && c.kind === "other")) && !title.includes("@");
  return {
    page_location: `${loc.origin}${c.path}${query}`,
    page_path: c.path,
    page_title: titleOk && title ? title.slice(0, 120) : "Victress",
    kind: c.kind,
    noLoad: c.noLoad,
  };
}
