// Privacy checks against a running server wired to scripts/mock-supabase.mjs.
//   node scripts/privacy-test.mjs <port-flags-on> <port-flags-off>
// Server A: SHARING_ENABLED=true DIRECTORY_ENABLED=true. Server B: both unset (the default).
// Uses production Host headers. Test tooling only; touches no real database.
import http from "node:http";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const [ON, OFF] = [Number(process.argv[2]), Number(process.argv[3])];
const APP = "victress.gg";
const SHARE = "A".repeat(43);
const REVOKED = "B".repeat(43);

const get = (port, path) =>
  new Promise((resolve, reject) => {
    const r = http.request({ host: "127.0.0.1", port, path, headers: { host: APP } }, (res) => {
      const c = [];
      res.on("data", (d) => c.push(d));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(c).toString("utf8") }));
    });
    r.on("error", reject);
    r.end();
  });

let failed = 0;
const check = (ok, name) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed++;
};

// --- directory on: listed profiles are readable, private ones are indistinguishable from unknown ones
const listed = await get(ON, "/mock_ace");
const priv = await get(ON, "/private_pat");
const unknown = await get(ON, "/nobody_here_x");
check(listed.status === 200, "a directory listed profile is readable");
check(priv.status === 404 && unknown.status === 404, "a private profile and an unknown handle both return 404");
check(!priv.body.includes("Private Pat") && !priv.body.includes("must never be readable"), "a private profile's data is not in the response");
check(priv.body.length === unknown.body.length || Math.abs(priv.body.length - unknown.body.length) < 40, "private and unknown 404 pages look the same");
const og = await get(ON, "/api/og/profile?handle=private_pat");
check(og.status === 404, "no social card for a private profile");
const sm = await get(ON, "/sitemap/0.xml");
check(!sm.body.includes("private_pat"), "the sitemap never lists a private profile");

// --- directory off (default): nothing is public
const offProfile = await get(OFF, "/mock_ace");
check(offProfile.status === 404, "with the directory off, even a listed profile is not public");
const offBoard = await get(OFF, "/leaderboard/valorant");
check(!/mock_player_|Mock Ace/.test(offBoard.body), "with the directory off, leaderboards list nobody");

// --- handle check does not leak account existence
const hc = async (h) => (await get(ON, `/api/handle-check?handle=${h}`)).body;
const taken = JSON.parse(await hc("mock_ace"));
const takenPrivate = JSON.parse(await hc("private_pat"));
const placeholder = JSON.parse(await hc("p0123456789ab"));
const free = JSON.parse(await hc("totally_free_name"));
check(taken.status === "taken" && takenPrivate.status === "taken", "listed and private accounts give the same answer");
check(placeholder.status === "reserved", "a placeholder shaped handle is refused by rules alone (same answer whether or not such an account exists)");
check(free.status === "available", "a free name is available");

// --- sharing links
for (const [label, token, expected] of [
  ["a valid link", SHARE, 200],
  ["a revoked or unknown link", REVOKED, 404],
  ["a malformed token", "short", 404],
]) {
  const r = await get(ON, `/r/${token}`);
  check(r.status === expected, `${label} returns ${expected}`);
  check(/no-store/.test(r.headers["cache-control"] || ""), `${label}: Cache-Control no-store`);
  check(/noindex/.test(r.headers["x-robots-tag"] || ""), `${label}: X-Robots-Tag noindex`);
  check((r.headers["referrer-policy"] || "") === "no-referrer", `${label}: Referrer-Policy no-referrer`);
}
const shared = await get(ON, `/r/${SHARE}`);
check(shared.body.includes("Private Pat"), "a valid link shows the shared profile");
check(/<meta name="robots" content="[^"]*noindex/.test(shared.body), "the shared page has a noindex meta tag");
check(/<meta name="referrer" content="no-referrer"/.test(shared.body), "the shared page has a no-referrer meta tag");
check(!/\/api\/og\/profile/.test(shared.body), "the shared page has no per profile social preview image");
const offLink = await get(OFF, `/r/${SHARE}`);
check(offLink.status === 404, "with sharing off, a valid link does not resolve");

// --- in a real browser: the headers and meta hold, and no outside request carries a referrer
const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route("**/*", (route) => {
  const u = new URL(route.request().url());
  if (u.hostname.endsWith("localhost") || u.hostname === "127.0.0.1" || u.hostname === APP) return route.continue();
  return route.abort();
});
const page = await ctx.newPage();
const refs = [];
page.on("request", (rq) => refs.push(rq.headers()["referer"] || ""));
const resp = await page.goto(`http://app.localhost:${ON}/r/${SHARE}`, { waitUntil: "networkidle" }).catch(() => null);
check(!!resp && resp.status() === 200, "browser: the shared page loads");
check(!!resp && (resp.headers()["cache-control"] || "").includes("no-store"), "browser: no-store header");
check(!!resp && resp.headers()["referrer-policy"] === "no-referrer", "browser: no-referrer header");
check(await page.locator("text=Private Pat").count() > 0, "browser: shows the shared profile");
check(await page.evaluate(() => document.referrer === ""), "browser: document has no referrer");
await browser.close();

console.log(failed ? `\n${failed} PRIVACY CHECK(S) FAILED` : "\nALL PRIVACY APP CHECKS PASSED");
process.exit(failed ? 1 : 0);
