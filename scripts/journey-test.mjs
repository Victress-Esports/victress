// User journeys from the marketing site into the app, using the local sign in stand-in (scripts/mock-auth.mjs).
//   node scripts/journey-test.mjs <app-port> [mock-port=4010]
// Build with NEXT_PUBLIC_APP_URL=http://app.localhost:<port> NEXT_PUBLIC_MARKETING_URL=http://localhost:<port> so links stay local.
// The marketing site and the app are the same server here, told apart by the host (localhost / app.localhost).
// Test tooling only. Touches no real database.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [APP, MOCK = 4010] = process.argv.slice(2).map(Number);
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const browser = await chromium.launch();
const text = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");
const MKT = `http://localhost:${APP}`;
const APPH = `http://app.localhost:${APP}`;

// Marketing home -> a role card -> registration with that role -> (sign in) -> onboarding for that role -> destination.
async function journey({ role, cardName, expectHeading, expectUrl, steps, expectText }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // phone first
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${MKT}/`);
  await page.getByRole("link", { name: new RegExp(`^${cardName}`) }).first().click();
  await page.waitForURL(/\/login/, { timeout: 15000 });
  check(new RegExp(`role=${role}`).test(page.url()), `${role}: the card opens registration with the role in the link`);
  check(new RegExp(expectHeading).test(await text(page)), `${role}: registration says which account is being created`);
  await page.waitForTimeout(400);
  const cookies = await ctx.cookies();
  check(cookies.some((c) => c.name === "v_role" && decodeURIComponent(c.value) === role), `${role}: the role is remembered for onboarding`);
  // sign in with the stand-in (a new user), then land in onboarding
  await page.goto(`http://app.localhost:${MOCK}/dev/auth/login?persona=new&to=${encodeURIComponent(APPH)}`);
  await page.waitForURL(/\/onboarding/, { timeout: 15000 });
  const t = await text(page);
  check(!/How will you use Victress/.test(t), `${role}: onboarding does not ask who you are again`);
  await page.getByRole("textbox").first().fill(`jr_${role}`);
  await page.getByRole("button", { name: "Claim it" }).click();
  for (const s of steps) {
    await page.getByRole("button", { name: s, exact: true }).click();
  }
  await page.waitForURL(expectUrl, { timeout: 15000 });
  check(true, `${role}: onboarding ends at ${page.url().replace(APPH, "")}`);
  if (expectText) check(expectText.test(await text(page)), `${role}: the destination says what is and is not open`);
  check(errors.length === 0, `${role}: no page errors ${errors.join(" | ")}`);
  await ctx.close();
}

await journey({ role: "player", cardName: "Player", expectHeading: "Player", expectUrl: /\/dashboard$/, steps: ["VALORANT", "Duelist"], expectText: null }).catch((e) => { check(false, `player journey: ${e.message.split("\n")[0]}`); });
await journey({ role: "team", cardName: "Coach or team", expectHeading: "Coach or team", expectUrl: /\/dashboard\/team/, steps: ["VALORANT", "Duelist"] }).catch((e) => { check(false, `team journey: ${e.message.split("\n")[0]}`); });
await journey({ role: "recruiter", cardName: "Scout or recruiter", expectHeading: "Scout or recruiter", expectUrl: /\/dashboard\/scout/, steps: [] }).catch((e) => { check(false, `recruiter journey: ${e.message.split("\n")[0]}`); });
await journey({ role: "college", cardName: "College program", expectHeading: "College program", expectUrl: /\/dashboard$/, steps: [], expectText: /Your account is saved/ }).catch((e) => { check(false, `college journey: ${e.message.split("\n")[0]}`); });
await journey({ role: "partner", cardName: "Partner organization", expectHeading: "Partner organization", expectUrl: /\/dashboard$/, steps: [], expectText: /Your account is saved/ }).catch((e) => { check(false, `partner journey: ${e.message.split("\n")[0]}`); });

// Partnerships: one next step, straight to partner registration (no contact form)
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${MKT}/partnerships`);
  const links = await page.getByRole("link", { name: "Become a Partner" }).count();
  check(links === 2, "partnerships: Become a Partner at the top and the end, nothing else competing");
  check((await page.locator('a[href*="/contact"]').count()) <= 1, "partnerships: no contact path except the footer");
  await page.getByRole("link", { name: "Become a Partner" }).first().click();
  await page.waitForURL(/\/login/, { timeout: 15000 });
  check(/Partner organization/.test(await text(page)), "partnerships: Become a Partner opens partner registration");
  await ctx.close();
}

// Navigation: the same short menu everywhere, one action
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  for (const path of ["/", "/platform", "/pricing", "/partnerships", "/women-in-esports", "/about", "/teams"]) {
    await page.goto(`${MKT}${path}`);
    const nav = await page.locator('header nav[aria-label="Main"] a').allInnerTexts();
    check(JSON.stringify(nav) === JSON.stringify(["Platform", "Partners", "Women in Esports", "Pricing", "Log in"]), `nav on ${path}: Platform, Partners, Women in Esports, Pricing, Log in`);
    check((await page.locator('header a:has-text("Get started")').count()) === 1, `nav on ${path}: one Get started action`);
  }
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} JOURNEY CHECK(S) FAILED` : "\nALL JOURNEY CHECKS PASSED");
process.exit(failed ? 1 : 0);
