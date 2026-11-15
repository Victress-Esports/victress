// Browser checks for Epic verification on the Rocket League page, using the local sign in stand-in. Test tooling only; Epic is never contacted.
//   node scripts/epic-page-test.mjs <app-port-epic-on> <app-port-epic-off> [mock-port=4010]
// Needs: MOCK_AUTH=1 node scripts/mock-supabase.mjs <mock-port>; both apps with SCRIM_UPLOADS_ENABLED=true; the first also with
// VICTRESS_EPIC_SIGNIN_ENABLED=true, VICTRESS_EPIC_CLIENT_ID=testclient, VICTRESS_EPIC_CLIENT_SECRET=testsecret and
// VICTRESS_EPIC_REDIRECT_URI=http://localhost:<port>/dashboard/link/epic/callback.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [ON, OFF, MOCK = 4010] = process.argv.slice(2).map(Number);
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const browser = await chromium.launch();
async function session(persona, port) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://app.localhost:${MOCK}/dev/auth/login?persona=${persona}&to=${encodeURIComponent(`http://app.localhost:${port}`)}`);
  return { ctx, page, errors };
}
const text = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");
// Navigates in the browser (which resolves app.localhost) and returns the first response for the URL, redirect hops included.
// Epic is never contacted: its authorize page is answered locally.
// goto that tolerates a navigation interrupted by the same page loading (the app is already arriving there).
async function go(page, url) {
  try { await page.goto(url); } catch (e) { if (!/interrupted by another navigation/.test(String(e))) throw e; await page.waitForLoadState("load"); }
}
async function hop(page, url) {
  await page.route("https://www.epicgames.com/**", (r) => r.fulfill({ status: 200, body: "stub" }));
  const seen = page.waitForResponse((r) => r.url() === url);
  await page.goto(url).catch(() => {});
  const r = await seen;
  await page.waitForLoadState("load").catch(() => {});
  return { status: () => r.status(), headers: () => r.headers(), all: () => r.allHeaders() };
}

{ // Epic off: nothing Epic anywhere, and the routes do not exist
  const s = await session("partner", OFF);
  await s.page.goto(`http://app.localhost:${OFF}/dashboard/scrims/rocket-league`);
  const t = await text(s.page);
  check(!/Epic Games\?|Verify with Epic/.test(t) && /Victress does not verify/.test(t), "flag off: the page is unchanged, no Epic button, typed IDs (Steam included) work as before");
  const r = await hop(s.page, `http://app.localhost:${OFF}/dashboard/link/epic/start`);
  check(r.status() === 404, "flag off: the start route is a 404");
  const c = await hop(s.page, `http://app.localhost:${OFF}/dashboard/link/epic/callback?code=abc&state=x`);
  check(c.status() === 404, "flag off: the callback route is a 404");
  await s.ctx.close();
}
{ // Epic on
  const s = await session("partner", ON);
  await s.page.goto(`http://app.localhost:${ON}/dashboard/scrims/rocket-league`);
  const t = await text(s.page);
  check(/Verify with Epic Games/.test(t), "flag on: a pilot player sees Verify with Epic Games");
  check(/does not sign you in to Victress/.test(t) && /by that ID only/.test(t), "the button explains it verifies an Epic account and matches by ID only");
  check(/Steam/.test(t) && (await s.page.locator("form").count()) > 0, "the typed ID form (Steam and every other platform) is still there");
  const r = await hop(s.page, `http://app.localhost:${ON}/dashboard/link/epic/start`);
  const loc = new URL(r.headers()["location"] ?? "http://x");
  const set = (await r.all())["set-cookie"] ?? "";
  check(r.status() === 307 && loc.origin === "https://www.epicgames.com" && loc.pathname === "/id/authorize" && loc.searchParams.get("client_id") === "testclient"
    && loc.searchParams.get("scope") === "basic_profile" && /^[0-9a-f]{64}$/.test(loc.searchParams.get("state") ?? ""), "start: redirects to Epic's authorize page with a fresh state");
  check(!String(r.headers()["location"]).includes("testsecret"), "start: the client secret is not in the redirect");
  check(/v_epic_state=/.test(set) && /HttpOnly/i.test(set) && /Secure/i.test(set) && /SameSite=lax/i.test(set) && /Path=\/dashboard\/link\/epic/.test(set), "start: the state cookie is HttpOnly, Secure, SameSite Lax and scoped to the Epic routes");
  check(/no-store/.test(r.headers()["cache-control"] ?? ""), "start: never cached");
  const c = await hop(s.page, `http://app.localhost:${ON}/dashboard/link/epic/callback?code=goodcode123&state=${"b".repeat(64)}`);
  const back = new URL(c.headers()["location"] ?? "http://x");
  check(c.status() === 307 && back.pathname === "/dashboard/scrims/rocket-league" && back.searchParams.get("epic") === "state", "callback with a forged state: back to the page, nothing contacted, nothing saved");
  await go(s.page, `http://app.localhost:${ON}/dashboard/scrims/rocket-league?epic=state`);
  check(/expired or was opened in a different session/.test(await text(s.page)), "the page shows the fixed message for that outcome");
  await go(s.page, `http://app.localhost:${ON}/dashboard/scrims/rocket-league?epic=%3Cscript%3E`);
  check(!/<script>/.test(await text(s.page)), "an unknown outcome in the URL is ignored, never echoed");
  const w = await s.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  check(w, "no horizontal scrolling at 390px");
  check(s.errors.length === 0, "no script errors");
  await s.page.goto(`http://app.localhost:${ON}/dashboard/scrims/rocket-league`);
  await s.ctx.close();
  const o = await session("rookie", ON);
  const r2 = await hop(o.page, `http://app.localhost:${ON}/dashboard/link/epic/start`);
  check(r2.status() === 404, "a player not on the pilot roster cannot start Epic verification");
  await o.ctx.close();
}
{ // signed out
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  const r = await hop(page, `http://app.localhost:${ON}/dashboard/link/epic/start`);
  check(r.status() >= 300 && r.status() < 400 && /\/login/.test(r.headers()["location"] ?? ""), "signed out: start sends visitors to sign in");
  await ctx.close();
}
await browser.close();
console.log(failed ? `\n${failed} FAILED` : "\nAll Epic page checks passed.");
process.exit(failed ? 1 : 0);
