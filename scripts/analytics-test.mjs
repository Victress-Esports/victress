// Unit checks for the analytics privacy logic (no browser, no network): node scripts/analytics-test.mjs
import assert from "node:assert/strict";
import { register } from "node:module";
register("./ts-resolve-hooks.mjs", import.meta.url);
const { classifyPath, safeQuery, sanitizeUrl, sanitizeReferrer } = await import("../lib/analytics/sanitize.ts");
const { scrubParams, EVENT_NAMES } = await import("../lib/analytics/events.ts");
const { ANALYTICS, analyticsFor } = await import("../lib/analytics/config.ts");

let n = 0;
const t = (name, fn) => { fn(); n++; console.log(`PASS  ${name}`); };

t("containers and measurement ids are the approved, distinct pairs", () => {
  assert.equal(ANALYTICS.m.gtm, "GTM-N38XS3DR"); assert.equal(ANALYTICS.m.ga4, "G-GSMR43YQMP");
  assert.equal(ANALYTICS.a.gtm, "GTM-PXQKSWP2"); assert.equal(ANALYTICS.a.ga4, "G-ZBL5HGHG42");
  assert.notEqual(ANALYTICS.m.gtm, ANALYTICS.a.gtm); assert.notEqual(ANALYTICS.m.ga4, ANALYTICS.a.ga4);
});

const env = (v) => { if (v === undefined) delete process.env.ANALYTICS_MODE; else process.env.ANALYTICS_MODE = v; };
t("off by default, and for any other value", () => { env(undefined); assert.equal(analyticsFor("victress.gg"), null); env("on"); assert.equal(analyticsFor("victress.gg"), null); env("off"); assert.equal(analyticsFor("victressesports.com"), null); });
t("production mode: each real host gets only its own container", () => {
  env("production");
  assert.deepEqual(analyticsFor("victressesports.com"), { site: "m", gtmId: "GTM-N38XS3DR" });
  assert.deepEqual(analyticsFor("www.victressesports.com:443"), { site: "m", gtmId: "GTM-N38XS3DR" });
  assert.deepEqual(analyticsFor("victress.gg"), { site: "a", gtmId: "GTM-PXQKSWP2" });
  assert.deepEqual(analyticsFor("www.victress.gg"), { site: "a", gtmId: "GTM-PXQKSWP2" });
});
t("production mode: previews, localhost and unknown hosts never load a container", () => {
  env("production");
  for (const h of ["my-app-git-x.vercel.app", "marketing.localhost:3200", "app.localhost:3200", "localhost:3000", "evil.example", "", null, undefined]) assert.equal(analyticsFor(h), null, String(h));
});
t("debug mode (local only) still maps host to the right container", () => {
  env("debug");
  assert.equal(analyticsFor("marketing.localhost:3200").gtmId, "GTM-N38XS3DR");
  assert.equal(analyticsFor("app.localhost:3200").gtmId, "GTM-PXQKSWP2");
  env(undefined);
});

t("app paths with secrets or names are replaced and never load the container", () => {
  for (const [p, want, kind] of [["/join/abc123def", "/join/:code", "join"], ["/auth/callback", "/auth", "auth"], ["/r/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "/r/:token", "token"], ["/mock_ace", "/:handle", "profile"], ["/SomePlayer/", "/:handle", "profile"]]) {
    const c = classifyPath("a", p); assert.equal(c.path, want, p); assert.equal(c.kind, kind); assert.equal(c.noLoad, true);
  }
});
t("app static pages, game boards and unknown deep paths", () => {
  for (const p of ["/", "/login", "/onboarding", "/dashboard", "/dashboard/team", "/leaderboard", "/leaderboard/valorant"]) { const c = classifyPath("a", p); assert.equal(c.path, p); assert.equal(c.noLoad, false); }
  assert.equal(classifyPath("a", "/leaderboard/notagame").path, "/other");
  assert.equal(classifyPath("a", "/dashboard/whatever/else").path, "/other");
});
t("marketing paths keep their path; unknown ones are /other", () => {
  assert.equal(classifyPath("m", "/pricing").path, "/pricing"); assert.equal(classifyPath("m", "/pricing/").path, "/pricing"); assert.equal(classifyPath("m", "/nope").path, "/other");
});

t("only campaign parameters survive in the query", () => {
  assert.equal(safeQuery("?utm_source=victressesports&utm_medium=website&email=a@b.com&claim=ace_main&next=/dashboard&code=SECRET&error=1"), "?utm_source=victressesports&utm_medium=website");
  assert.equal(safeQuery("?code=abc&access_token=xyz"), "");
  assert.equal(safeQuery("?utm_source=a%40b.com"), "");
  assert.equal(safeQuery("?utm_source=" + "x".repeat(101)), "");
});
t("sanitized location never contains query secrets, handles, or names", () => {
  const loc = { origin: "https://victress.gg", pathname: "/join/SECRETINVITE", search: "?code=abc&claim=handle&utm_source=victressesports" };
  const u = sanitizeUrl("a", loc, "Join Northwestern Esports | Victress");
  assert.equal(u.page_location, "https://victress.gg/join/:code?utm_source=victressesports"); assert.equal(u.page_title, "Victress");
  const p = sanitizeUrl("a", { origin: "https://victress.gg", pathname: "/jane_doe", search: "" }, "Jane Doe (@jane_doe) on Victress");
  assert.equal(p.page_location, "https://victress.gg/:handle"); assert.equal(p.page_title, "Victress");
  const d = sanitizeUrl("a", { origin: "https://victress.gg", pathname: "/dashboard", search: "" }, "Dashboard | Victress");
  assert.equal(d.page_title, "Dashboard | Victress");
  const m = sanitizeUrl("m", { origin: "https://victressesports.com", pathname: "/pricing", search: "?utm_campaign=spring&foo=bar" }, "Victress pricing: free to start");
  assert.equal(m.page_location, "https://victressesports.com/pricing?utm_campaign=spring");
});

t("referrers: same site keeps a clean path, other sites keep only the origin, junk is empty", () => {
  const own = "https://victress.gg";
  assert.equal(sanitizeReferrer("a", "https://victress.gg/join/SECRETCODE?x=1", own), "https://victress.gg/join/:code");
  assert.equal(sanitizeReferrer("a", "https://victress.gg/jane_doe", own), "https://victress.gg/:handle");
  assert.equal(sanitizeReferrer("a", "https://victress.gg/dashboard/team?claim=x", own), "https://victress.gg/dashboard/team");
  assert.equal(sanitizeReferrer("a", "https://victressesports.com/pricing?utm_source=x", own), "https://victressesports.com/");
  assert.equal(sanitizeReferrer("a", "https://www.google.com/search?q=victress+jane", own), "https://www.google.com/");
  assert.equal(sanitizeReferrer("a", "", own), ""); assert.equal(sanitizeReferrer("a", "not a url", own), "");
});
t("event guard: unknown events, wrong site and extra parameters are dropped", () => {
  assert.equal(scrubParams("a", "purchase", {}), null);
  assert.equal(scrubParams("m", "team_created"), null); assert.equal(scrubParams("a", "cta_click", { cta_text: "x" }), null);
  assert.deepEqual(scrubParams("a", "team_created", { team_name: "Secret", email: "a@b.com" }), {});
  assert.deepEqual(scrubParams("a", "login", { method: "google", email: "a@b.com", user_id: "u" }), { method: "google" });
});
t("event guard: emails and token-like values are removed even in allowed fields", () => {
  assert.deepEqual(scrubParams("m", "cta_click", { cta_text: "me@example.com", cta_location: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", destination: "app" }), { destination: "app" });
  assert.deepEqual(scrubParams("m", "generate_lead", { lead_type: "waitlist", interest: "pro", email: "a@b.com" }), { lead_type: "waitlist", interest: "pro" });
  assert.deepEqual(scrubParams("a", "player_resume_created", { game: "VALORANT", role_selected: true, rank_selected: false }), { game: "VALORANT", role_selected: true, rank_selected: false });
});
t("no event name or parameter name suggests personal data", () => {
  const bad = /email|name$|password|token|phone|address|handle|user_?id/;
  for (const e of EVENT_NAMES) assert.ok(!bad.test(e), e);
});
console.log(`\nALL ${n} ANALYTICS UNIT CHECKS PASSED`);
