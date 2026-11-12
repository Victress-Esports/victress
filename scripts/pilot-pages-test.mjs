// Browser checks for the Rocket League page and the Discord link page, using the local sign in stand-in. Test tooling only.
//   node scripts/pilot-pages-test.mjs <app-port-uploads-off> <app-port-uploads-on> [mock-port=4010]
// Needs: MOCK_AUTH=1 node scripts/mock-supabase.mjs <mock-port>, and apps built against it (the second started with SCRIM_UPLOADS_ENABLED=true).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [OFF, ON, MOCK = 4010] = process.argv.slice(2).map(Number);
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const browser = await chromium.launch();
async function session(persona, port) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://app.localhost:${MOCK}/dev/auth/login?persona=${persona}&to=${encodeURIComponent(`http://app.localhost:${port}`)}`);
  return { ctx, page, errors };
}
const text = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");
const CODE = "a".repeat(43);

// signed out
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(`http://app.localhost:${ON}/dashboard/scrims/rocket-league`);
  check(/\/login/.test(page.url()), "signed out: the Rocket League page sends visitors to sign in");
  await page.goto(`http://app.localhost:${ON}/dashboard/link/discord/${CODE}`);
  check(/\/login/.test(page.url()), "signed out: the Discord link page sends visitors to sign in");
  await ctx.close();
}
// signed in but not on the pilot roster
{
  const s = await session("rookie", ON);
  const r = await s.page.goto(`http://app.localhost:${ON}/dashboard/scrims/rocket-league`);
  check(r.status() === 404, "a player who is not on the pilot roster gets no Rocket League page");
  await s.ctx.close();
}
// pilot flag off, even for a roster player
{
  const s = await session("partner", OFF);
  const r = await s.page.goto(`http://app.localhost:${OFF}/dashboard/scrims/rocket-league`);
  check(r.status() === 404, "with the pilot flag off the Rocket League page does not exist");
  await s.ctx.close();
}
// pilot player
{
  const s = await session("partner", ON);
  await s.page.goto(`http://app.localhost:${ON}/dashboard/scrims`);
  check(/Rocket League/.test(await text(s.page)) && (await s.page.locator('a[href="/dashboard/scrims/rocket-league"]').count()) === 1, "the scrims page links to Rocket League for a pilot player");
  await s.page.goto(`http://app.localhost:${ON}/dashboard/scrims/rocket-league`);
  const t = await text(s.page);
  check(/Player-submitted Ballchasing replay/.test(t), "the page shows the approved data label");
  check(/Your Rocket League ID/.test(t) && /Victress does not verify that it is yours/.test(t), "the ID section says it is private and unverified");
  check(/Submit a replay/.test(t) && /Save your Rocket League ID above first|not configured/.test(t), "submitting needs a saved ID (or says it is not configured here)");
  check(/Nothing submitted yet/.test(t) && /Submit a replay to see your numbers here/.test(t), "empty states are plain");
  check(/not a judgment of how good you are|not a judgment/.test(t), "the page frames the numbers as context, not a verdict");
  check(await s.page.getByRole("button", { name: /Delete all my Rocket League data/ }).count() === 1, "deleting all Rocket League data is one click away");
  await s.page.fill("#id", "https://ballchasing.com/player/steam/76561198000000001");
  check((await s.page.locator("select#platform").count()) === 1, "the identity form offers the five platforms");
  // the link page with a code that does not exist
  await s.page.goto(`http://app.localhost:${ON}/dashboard/link/discord/${CODE}`);
  const l = await text(s.page);
  check(/not valid|expired/i.test(l) && /Run \/link in Discord again/.test(l) && !/Link my Discord account/.test(l), "an unknown link code shows no confirm button");
  const bad = await s.page.goto(`http://app.localhost:${ON}/dashboard/link/discord/short`);
  check(bad.status() === 404, "a malformed link code is a 404");
  const head = await s.page.goto(`http://app.localhost:${ON}/dashboard/link/discord/${CODE}`);
  const h = head.headers();
  check(/no-store/.test(h["cache-control"] ?? "") && h["referrer-policy"] === "no-referrer" && /noindex/.test(h["x-robots-tag"] ?? ""), "the link page is never cached, indexed or sent on as a referrer");
  await s.page.goto(`http://app.localhost:${ON}/dashboard/account`);
  check(/Discord/.test(await text(s.page)) && /Run \/link in Discord to start|linked/i.test(await text(s.page)), "the Account page shows the Discord link status");
  check(s.errors.length === 0, "no script errors on these pages");
  await s.ctx.close();
}
await browser.close();
console.log(failed ? `\n${failed} FAILED` : "\nAll pilot page checks passed.");
process.exit(failed ? 1 : 0);
