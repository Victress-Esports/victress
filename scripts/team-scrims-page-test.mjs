// Browser checks for the Team scrims page (victress.gg /dashboard/team/scrims) at phone width, using the local sign in stand-in. Test tooling only.
//   node scripts/team-scrims-page-test.mjs <app-port-uploads-off> <app-port-uploads-on> [mock-port=4010]
// Needs: MOCK_AUTH=1 node scripts/mock-supabase.mjs <mock-port>, and the app built against it; the second started with SCRIM_UPLOADS_ENABLED=true.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [OFF, ON, MOCK = 4010] = process.argv.slice(2).map(Number);
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const browser = await chromium.launch();
const PHONE = { width: 390, height: 844 };
async function session(persona, port) {
  const ctx = await browser.newContext({ viewport: PHONE });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://app.localhost:${MOCK}/dev/auth/login?persona=${persona}&to=${encodeURIComponent(`http://app.localhost:${port}`)}`);
  return { ctx, page, errors };
}
const text = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");
const URL_ON = `http://app.localhost:${ON}/dashboard/team/scrims`;

{
  const ctx = await browser.newContext({ viewport: PHONE }); const page = await ctx.newPage();
  await page.goto(URL_ON);
  check(/\/login/.test(page.url()), "signed out: the page sends visitors to sign in");
  await ctx.close();
}
{
  const s = await session("team", OFF);
  const r = await s.page.goto(`http://app.localhost:${OFF}/dashboard/team/scrims`);
  check(r.status() === 404, "with the pilot flag off the page does not exist");
  await s.page.goto(`http://app.localhost:${OFF}/dashboard/team`);
  check(!(await text(s.page)).includes("Team scrims"), "with the flag off the Team page does not link to it");
  await s.ctx.close();
}
{
  const s = await session("rookie", ON);
  await s.page.goto(URL_ON);
  const t = await text(s.page);
  check(/Join or create a team first/.test(t) && !/Northside/.test(t) && !/ to \d/.test(t), "a player on no roster sees no team scrims, only how to join a team");
  await s.ctx.close();
}
{
  const s = await session("team", ON);
  await s.page.goto(`http://app.localhost:${ON}/dashboard/team`);
  check(await s.page.getByRole("link", { name: /Team scrims/ }).count() === 1, "the Team page links to Team scrims");
  await s.page.goto(URL_ON);
  const t = await text(s.page);
  check(/2 scrims/.test(t) && /1 win, 1 loss/.test(t), "the list shows the count and the record");
  const cards = s.page.locator("main li, li").filter({ hasText: /to \d/ });
  check(await cards.count() === 2, "one card per scrim");
  const first = (await cards.nth(0).innerText()).replace(/\s+/g, " "), second = (await cards.nth(1).innerText()).replace(/\s+/g, " ");
  check(/\bW\b/.test(first) && /3 to 1/.test(first) && /Blue/.test(first) && /vs Northside/.test(first) && /Private match/.test(first) && /3v3/.test(first), "a card shows W, the score, the side, the opponent label, the match type and size");
  check(/\bL\b/.test(second) && /1 to 2/.test(second) && /Orange/.test(second) && /OT/.test(second) && /opponent not named/.test(second), "a loss in overtime with no label says the opponent is not named");
  check(/Team 3 2 4 9 1200/.test(first) && /Opponent 1 0 5 6 700/.test(first), "team totals and opponent totals are shown as rows of numbers");
  check(/mock_mate_one 2 0 1 4 500/.test(first) && /1 of 3 players share individual numbers/.test(first), "a teammate who shares has an individual line");
  check(!/mock_mate_one/.test(second) && /No individual numbers shown/.test(second), "in a 2v2 where one player would be left hidden, the sharing teammate's line is withheld");
  check(!/mock_mate_two \d/.test(t) && !/mock_team \d/.test(t) && !/\bYou \d/.test(t), "players who do not share have no line");
  check(/Player-submitted Ballchasing replay/.test(t) && /Opponents are shown as totals only/.test(t), "the page carries the data label and says opponents are totals only");
  check(/Off\. Your team sees results and side totals/.test(t), "sharing starts off for the viewer");
  const overflow = await s.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `no horizontal scroll at 390px (overflow ${overflow}px)`);
  check(await s.page.locator("canvas, svg[role='img'], [class*='chart']").count() === 0, "no charts");
  check(await s.page.getByRole("button", { name: /Remove from team/ }).count() === 2, "the owner can remove a team scrim");
  await s.page.getByRole("button", { name: /Share my numbers with my team/ }).click();
  await s.page.getByText(/Sharing is on/).first().waitFor({ timeout: 10000 });
  await s.page.reload();
  check(/You share your numbers with your team/.test(await text(s.page)), "turning sharing on is saved");
  await s.page.getByRole("button", { name: /Stop sharing my numbers/ }).click();
  await s.page.getByText(/Sharing is off/).first().waitFor({ timeout: 10000 });
  check(s.errors.length === 0, "no page errors");
  await s.page.screenshot({ path: process.env.SHOT ?? "/dev/null", fullPage: true }).catch(() => {});
  await s.ctx.close();
}
await browser.close();
console.log(failed ? `\n${failed} FAILED` : "\nAll team scrims page checks passed.");
process.exit(failed ? 1 : 0);
