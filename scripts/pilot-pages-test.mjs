// Browser checks for the Rocket League page and the Discord link page, using the local sign in stand-in. Test tooling only.
//   node scripts/pilot-pages-test.mjs <app-port-uploads-off> <app-port-uploads-on> <app-port-uploads-and-lol-on> [mock-port=4010]
// Needs: MOCK_AUTH=1 node scripts/mock-supabase.mjs <mock-port>, and apps built against it: the second started with SCRIM_UPLOADS_ENABLED=true, the third
// with SCRIM_UPLOADS_ENABLED=true and LOL_IMPORT_ENABLED=true.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [OFF, ON, LOL, MOCK = 4010] = process.argv.slice(2).map(Number);
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
  const scrims = await text(s.page);
  check(/Rocket League/.test(scrims) && (await s.page.locator('a[href="/dashboard/scrims/rocket-league"]').count()) === 1, "the scrims page links to Rocket League for a pilot player");
  check(!/League of Legends/.test(scrims) && (await s.page.locator('a[href="/dashboard/scrims/lol"]').count()) === 0, "the League of Legends card is not offered while LOL_IMPORT_ENABLED is off, even for a pilot player");
  check(!/Riot Games|Riot/.test(scrims), "the Riot legal notice is not shown while the League experience is off");
  const lolOff = await s.page.goto(`http://app.localhost:${ON}/dashboard/scrims/lol`);
  check(lolOff.status() === 404, "the League of Legends page is a 404 while it is switched off");
  await s.page.goto(`http://app.localhost:${ON}/dashboard/scrims/rocket-league`);
  const t = await text(s.page);
  check(/Player-submitted Ballchasing replay/.test(t), "the page shows the approved data label");
  check(/Your Rocket League ID/.test(t) && /Victress does not verify that it is yours/.test(t), "the ID section says it is private and unverified");
  // onboarding: neutral platform, link first, plain explanations
  const sel = s.page.locator("select#platform");
  check((await sel.inputValue()) === "" && (await sel.locator("option").first().textContent()) === "Choose a platform", "the platform starts neutral: nothing is preselected (no Steam default)");
  const optionValues = await sel.locator("option").evaluateAll((os) => os.map((o) => o.value));
  check(["steam", "epic", "xbox", "ps4", "psynet", "switch"].every((v) => optionValues.includes(v)), "the manual form offers Steam, Epic, Xbox, both PlayStation kinds and Switch");
  check(await s.page.locator("#link").count() === 1 && /Your Ballchasing player link \(easiest\)/.test(t) && /click your own name/.test(t), "the player link is the first and easiest way to save an identity, with how to find it");
  check(/Any platform works/.test(t), "the page says any platform works, not only Steam");
  check(/If a replay is not accepted or not matched/.test(t), "a help section explains why a replay may not be accepted or matched");
  await s.page.locator("summary", { hasText: "If a replay is not accepted or not matched" }).click();
  const help = await text(s.page);
  check(/Unlisted or Public/.test(help) && /Some players have no ID/.test(help) && /never guess/.test(help) && /Group and player links do not work/.test(help), "the help covers private replays, missing ids (never guessed) and wrong link types");
  check(/Submit a replay/.test(t) && /Save your Rocket League ID above first|not configured/.test(t), "submitting needs a saved ID (or says it is not configured here)");
  check(/Nothing submitted yet/.test(t) && /Submit a replay to see your numbers here/.test(t), "empty states are plain");
  check(/not a judgment of how good you are|not a judgment/.test(t), "the page frames the numbers as context, not a verdict");
  check(await s.page.getByRole("button", { name: /Delete all my Rocket League data/ }).count() === 1, "deleting all Rocket League data is one click away");
  await s.page.fill("#link", "https://ballchasing.com/player/steam/76561198000000001"); // the player link has its own field (#id is the manual fallback)
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
// League of Legends only when explicitly switched on
{
  const s = await session("partner", LOL);
  await s.page.goto(`http://app.localhost:${LOL}/dashboard/scrims`);
  check((await s.page.locator('a[href="/dashboard/scrims/lol"]').count()) === 1 && /League of Legends/.test(await text(s.page)), "with LOL_IMPORT_ENABLED the League of Legends card appears for a pilot player");
  const r = await s.page.goto(`http://app.localhost:${LOL}/dashboard/scrims/lol`);
  check(r.status() === 200, "with LOL_IMPORT_ENABLED the League of Legends page opens");
  check(/Riot Games/.test(await text(s.page)), "with LOL_IMPORT_ENABLED the Riot legal notice is shown");
  await s.ctx.close();
  const o = await session("rookie", LOL);
  const nr = await o.page.goto(`http://app.localhost:${LOL}/dashboard/scrims/lol`);
  check(nr.status() === 404, "even with the switch on, a player who is not on the pilot roster gets no League page");
  await o.ctx.close();
}
await browser.close();
console.log(failed ? `\n${failed} FAILED` : "\nAll pilot page checks passed.");
process.exit(failed ? 1 : 0);
