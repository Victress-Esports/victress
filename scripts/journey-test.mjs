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

// College programs run rosters: the card opens the coach or team registration. Partner organizations go to Partnerships.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${MKT}/`);
  await page.getByRole("link", { name: /^College program/ }).click();
  await page.waitForURL(/\/login/);
  check(/role=team/.test(page.url()) && /Coach or team/.test(await text(page)), "college program: the card opens the coach or team registration");
  await page.goto(`${MKT}/`);
  await page.getByRole("link", { name: /^Partner organization/ }).click();
  await page.waitForURL(/\/partnerships/);
  check(true, "partner organization: the card opens Partnerships, not a personal sign up");
  await ctx.close();
}

// Partnerships: one next step. Partner registration is not open, and says so: no account, no form, no role label.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${MKT}/partnerships`);
  const links = await page.getByRole("link", { name: "Become a Partner" }).count();
  check(links === 2, "partnerships: Become a Partner at the top and the end, nothing else competing");
  check((await page.locator('a[href*="/contact"]').count()) <= 1, "partnerships: no contact path except the footer");
  await page.getByRole("link", { name: "Become a Partner" }).first().click();
  await page.waitForURL(/\/partner$/, { timeout: 15000 });
  const t = await text(page);
  check(/Partner registration is not open yet/.test(t), "partner: Become a Partner says plainly that registration is not open");
  check((await page.locator("input, form, textarea, select").count()) === 0, "partner: nothing is collected and no account is created");
  check(!(await ctx.cookies()).some((c) => c.name === "v_role" || c.name.startsWith("sb-")), "partner: no role or session is stored");
  check(!/dashboard|workspace|your account is saved/i.test(t), "partner: no workspace or dashboard is promised");
  await ctx.close();
}

// Women in Esports: what it is, and a clear way in for each group, without a contact form.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${MKT}/women-in-esports`);
  const t = await text(page);
  check(/How to take part/.test(t) && /Organizations/.test(t) && /Teams and programs/.test(t) && /Players/.test(t), "women in esports: organizations, teams and programs, and players each have a way in");
  check((await page.locator('a[href*="/contact"]').count()) <= 1 && !/mailto:/.test(await page.content()), "women in esports: no contact form path (footer link only)");
  await page.getByRole("link", { name: /Start your team/ }).click();
  await page.waitForURL(/\/login/);
  check(/role=team/.test(page.url()), "women in esports: Start your team opens the team registration");
  await page.goto(`${MKT}/women-in-esports`);
  await page.getByRole("link", { name: /Learn about partnering/ }).click();
  await page.waitForURL(/\/partnerships/);
  check(true, "women in esports: organizations go to Partnerships");
  for (const path of ["/", "/platform", "/pricing", "/teams", "/about", "/partnerships"]) {
    await page.goto(`${MKT}${path}`);
    check((await page.locator('a[href="/women-in-esports"]').count()) >= 2, `women in esports: reachable from the menu and from the page itself on ${path}`);
  }
  await ctx.close();
}

// A scout account sees only the Scout Desk shell: no player data, and the Partner workspace does not exist.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`http://app.localhost:${MOCK}/dev/auth/login?persona=scout&to=${encodeURIComponent(APPH)}`);
  await page.goto(`${APPH}/dashboard/scout`);
  const t = await text(page);
  check(/Coming soon/.test(t) && !/@[a-z0-9_]{3,}/i.test(t), "scout: Scout Desk is a Coming soon shell and lists no players");
  for (const path of ["/dashboard/partner", "/dashboard/admin", "/dashboard/college", "/dashboard/search"]) {
    const r = await page.goto(`${APPH}${path}`);
    check(r.status() === 404, `scout: ${path} does not exist (404)`);
  }
  await ctx.close();
}

// The role label is never used to authorize anything: it appears only where it is chosen, remembered and explained.
{
  const { execSync } = await import("node:child_process");
  const files = execSync("grep -rl account_type app lib components --include=*.ts --include=*.tsx || true", { encoding: "utf8" }).split("\n").filter(Boolean).sort();
  const allowed = ["app/a/dashboard/page.tsx", "app/a/onboarding/actions.ts", "components/app/OnboardingWizard.tsx", "lib/roles.ts"];
  check(files.every((f) => allowed.includes(f)), `account_type is read only for onboarding and a dashboard note (found ${files.join(", ")})`);
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
