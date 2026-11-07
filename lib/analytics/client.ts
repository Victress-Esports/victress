"use client";

// Browser side analytics runtime: loads the tag container only after consent, keeps page URLs and titles clean,
// reports client side navigation once, and is the single place that writes to the data layer.
import { clearGaCookies, getConsent } from "./consent";
import { scrubParams } from "./events";
import { sanitizeReferrer, sanitizeUrl, type SiteKey } from "./sanitize";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

interface State {
  site: SiteKey | null;
  gtmId: string | null;
  started: boolean;
  lastPath: string | null;
  queue: Array<[string, Record<string, unknown>]>;
}

const st: State = { site: null, gtmId: null, started: false, lastPath: null, queue: [] };
const MAX_QUEUE = 20;

function dl(): unknown[] {
  return (window.dataLayer = window.dataLayer ?? []);
}

// Consent commands must be pushed as an Arguments object, which is why this is a function declaration.
function gtag(..._args: unknown[]) {
  dl().push(arguments);
}

const DENIED = { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" } as const;

export function initAnalytics(site: SiteKey, gtmId: string) {
  st.site = site;
  st.gtmId = gtmId;
}

function current() {
  return sanitizeUrl(st.site!, { origin: location.origin, pathname: location.pathname, search: location.search }, document.title);
}

function push(event: string, params: Record<string, unknown>) {
  const clean = scrubParams(st.site!, event, params);
  if (clean) dl().push({ event, ...clean });
}

function pageEvents(path: string) {
  if (st.site === "m" && path === "/pricing") push("pricing_page_view", {});
}

function start() {
  if (st.started || !st.site || !st.gtmId) return;
  const page = current();
  // Everything denied by default; only analytics storage is granted, because only analytics consent was given.
  gtag("consent", "default", { ...DENIED, wait_for_update: 500 });
  gtag("consent", "update", { analytics_storage: "granted" });
  dl().push({
    victress_site: st.site === "m" ? "marketing" : "app",
    analytics_page_location: page.page_location,
    analytics_page_path: page.page_path,
    analytics_page_title: page.page_title,
    analytics_page_referrer: sanitizeReferrer(st.site, document.referrer, location.origin),
  });
  dl().push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(st.gtmId)}`;
  document.head.appendChild(s);
  st.started = true;
  st.lastPath = location.pathname;
  for (const [name, params] of st.queue.splice(0)) push(name, params);
  pageEvents(page.page_path);
}

/** Call after every route change (and once on load). The first page view is sent by the container's Google tag itself. */
export function onRoute() {
  if (!st.site || getConsent() !== "granted") return;
  const path = location.pathname;
  if (!st.started) {
    if (!sanitizeUrl(st.site, { origin: location.origin, pathname: path, search: "" }, "").noLoad) start();
    st.lastPath = path;
    return;
  }
  if (path === st.lastPath) return;
  st.lastPath = path;
  // Next.js updates the title just after the route commits.
  setTimeout(() => {
    if (!st.site || getConsent() !== "granted") return;
    const page = current();
    dl().push({ analytics_page_location: page.page_location, analytics_page_path: page.page_path, analytics_page_title: page.page_title });
    push("spa_page_view", { page_location: page.page_location, page_path: page.page_path, page_title: page.page_title });
    pageEvents(page.page_path);
  }, 100);
}

export function onConsentChange(value: "granted" | "denied") {
  if (!st.site) return;
  if (value === "denied") {
    st.queue = [];
    if (st.started) gtag("consent", "update", DENIED);
    clearGaCookies();
    return;
  }
  if (st.started) gtag("consent", "update", { analytics_storage: "granted" });
  else onRoute();
}

const PENDING = "v_pending_event";

/**
 * For an action that redirects on success (nothing runs after it in the browser): remember the event and send it on the next
 * page, only once the action did not come back with a failure. Held in sessionStorage only when consent is already granted.
 */
export function trackOnNextPage(name: string, params: Record<string, unknown> = {}) {
  if (!st.site || getConsent() !== "granted" || !scrubParams(st.site, name, params)) return;
  try {
    sessionStorage.setItem(PENDING, JSON.stringify({ name, params }));
  } catch {
    /* storage unavailable: the event is simply not sent */
  }
}

/** The action came back (it failed, or did not redirect): do not count it. */
export function cancelPendingEvent() {
  try {
    sessionStorage.removeItem(PENDING);
  } catch {
    /* ignore */
  }
}

/** Sends the remembered event, once, on the page after the action. */
export function flushPendingEvent() {
  try {
    const raw = sessionStorage.getItem(PENDING);
    if (!raw) return;
    sessionStorage.removeItem(PENDING);
    const e = JSON.parse(raw) as { name: string; params: Record<string, unknown> };
    track(e.name, e.params);
  } catch {
    /* ignore */
  }
}

/** Sends an allowed event. Dropped without consent. Held (up to 20) until the container loads. */
export function track(name: string, params: Record<string, unknown> = {}) {
  if (!st.site || getConsent() !== "granted") return;
  if (!scrubParams(st.site, name, params)) return;
  if (st.started) push(name, params);
  else if (st.queue.length < MAX_QUEUE) st.queue.push([name, params]);
}
