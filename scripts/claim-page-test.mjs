// Browser checks for victress.gg/claim and the Steam verification start, using the local sign in stand-in. Test tooling only; Steam and
// Epic are never contacted.
//   node scripts/claim-page-test.mjs <port-pilot-with-steam-and-epic> <port-pilot-no-verification> <port-pilot-off> [mock-port=4010]
// Needs: MOCK_AUTH=1 node scripts/mock-supabase.mjs <mock-port>; the first app with SCRIM_UPLOADS_ENABLED=true, VICTRESS_STEAM_SIGNIN_ENABLED=true,
// VICTRESS_STEAM_RETURN_URL=http://app.localhost:<port>/dashboard/link/steam/callback and the Epic variables; the second with
// SCRIM_UPLOADS_ENABLED=true only; the third with nothing.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [ON, PLAIN, OFF, MOCK = 4010] = process.argv.slice(2).map(Number);
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const browser = await chromium.launch();
const text = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");
async function session(persona, port, width = 390) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
  for (const g of ["https://steamcommunity.com/**", "https://www.epicgames.com/**"]) await page.route(g, (r) => r.fulfill({ status: 200, body: "stub" }));
  if (persona) await page.goto(`http://app.localhost:${MOCK}/dev/auth/login?persona=${persona}&to=${encodeURIComponent(`http://app.localhost:${port}`)}`);
  return { ctx, page, errors };
}
async function go(page, url) { try { return await page.goto(url); } catch (e) { if (!/interrupted by another navigation/.test(String(e))) throw e; await page.waitForLoadState("load"); return null; } }

{ const s = await session(null, ON);
  await go(s.page, `http://app.localhost:${ON}/claim`);
  check(/\/login\?next=%2Fclaim/.test(s.page.url()), "signed out: /claim sends the visitor to sign up or sign in, and back to /claim after");
  await s.ctx.close(); }
{ const s = await session("oldterms", ON);
  await go(s.page, `http://app.localhost:${ON}/claim`);
  check(/\/consent/.test(s.page.url()), "a player who has not accepted the current Terms and Privacy Policy is sent to /consent first");
  await s.ctx.close(); }
{ const s = await session("rookie", ON);
  await go(s.page, `http://app.localhost:${ON}/claim`);
  const t = await text(s.page);
  check(/Not open yet/.test(t) && !/Verify with Steam/.test(t), "a player outside the pilot sees that claiming is not open, and no verification buttons");
  await s.ctx.close(); }
{ const s = await session("partner", ON);
  await go(s.page, `http://app.localhost:${ON}/claim`);
  const t = await text(s.page);
  check(/Claim your snapshot/.test(t) && /only by your verified platform ID, never by name/.test(t), "the claim page explains matching by verified platform ID only");
  const steam = await s.page.getAttribute('a:has-text("Verify with Steam")', "href");
  const epic = await s.page.getAttribute('a:has-text("Verify with Epic Games")', "href");
  check(steam === "/dashboard/link/steam/start?next=claim" && epic === "/dashboard/link/epic/start?next=claim", "an unverified pilot player is offered Steam and Epic verification, returning to /claim");
  check(!/snapshots found|goals,/.test(t), "no snapshot is shown before verification");
  check(await s.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no horizontal scrolling at 390px");
  // Steam start: redirect to Steam's OpenID endpoint with our return URL and state; cookies scoped and HttpOnly
  const seen = s.page.waitForResponse((r) => r.url() === `http://app.localhost:${ON}/dashboard/link/steam/start?next=claim`);
  await s.page.goto(`http://app.localhost:${ON}/dashboard/link/steam/start?next=claim`).catch(() => {}); // the hop to Steam itself is not loaded
  const r = await seen;
  const loc = new URL(r.headers()["location"] ?? "http://x");
  const rt = new URL(loc.searchParams.get("openid.return_to") ?? "http://x");
  check(r.status() === 307 && loc.origin + loc.pathname === "https://steamcommunity.com/openid/login" && loc.searchParams.get("openid.mode") === "checkid_setup", "Steam start redirects to Steam's OpenID sign in");
  check(rt.origin + rt.pathname === `http://app.localhost:${ON}/dashboard/link/steam/callback` && /^[0-9a-f]{64}$/.test(rt.searchParams.get("state") ?? ""), "the return URL is our callback with a fresh state");
  const set = (await r.allHeaders())["set-cookie"] ?? "";
  check(/v_steam_state=/.test(set) && /HttpOnly/i.test(set) && /Path=\/dashboard\/link\/steam/.test(set) && /v_verify_next=claim/.test(set), "state and return cookies are HttpOnly and scoped; the return is /claim");
  check(s.errors.length === 0, "no script errors");
  await s.ctx.close(); }
{ const s = await session("partner", ON);
  await go(s.page, `http://app.localhost:${ON}/dashboard/link/steam/callback?state=${"b".repeat(64)}&openid.mode=id_res`);
  check(/\/dashboard\/scrims\/rocket-league\?steam=state/.test(s.page.url()) || /\/claim\?steam=state/.test(s.page.url()), "a Steam callback with a forged state changes nothing and says so");
  await s.ctx.close(); }
{ const s = await session("partner", PLAIN);
  await go(s.page, `http://app.localhost:${PLAIN}/claim`);
  check(/Account verification is not open yet/.test(await text(s.page)), "with Steam and Epic both off, the claim page says verification is not open (no broken buttons)");
  const r = await go(s.page, `http://app.localhost:${PLAIN}/dashboard/link/steam/start`);
  check(r && r.status() === 404, "with the Steam flag off, the Steam route is a 404");
  await s.ctx.close(); }
{ const s = await session("partner", OFF);
  const r = await go(s.page, `http://app.localhost:${OFF}/claim`);
  check(r && r.status() === 404, "with the pilot off, /claim does not exist");
  await s.ctx.close(); }
await browser.close();
console.log(failed ? `\n${failed} FAILED` : "\nAll claim page checks passed.");
process.exit(failed ? 1 : 0);
