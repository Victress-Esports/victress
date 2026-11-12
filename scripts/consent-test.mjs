// Browser tests for the age gate and Terms/Privacy acceptance, using the local sign in stand-in (scripts/mock-auth.mjs).
//   node scripts/consent-test.mjs <app-port> [mock-port=4010]
// Needs: MOCK_AUTH=1 node scripts/mock-supabase.mjs <mock-port>, and an app built with NEXT_PUBLIC_SUPABASE_URL pointing at it.
// Test tooling only. Touches no real database.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [APP, MOCK = 4010] = process.argv.slice(2).map(Number);
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const browser = await chromium.launch();
const state = async () => (await fetch(`http://127.0.0.1:${MOCK}/dev/state`)).json();
const text = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");
async function session(persona) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://app.localhost:${MOCK}/dev/auth/login?persona=${persona}&to=${encodeURIComponent(`http://app.localhost:${APP}`)}`);
  return { ctx, page, errors };
}
const iso = (d) => d.toISOString().slice(0, 10);
const yearsAgo = (n, plusDays = 0) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - n); d.setUTCDate(d.getUTCDate() + plusDays); return iso(d); };
const submit = async (page, birth) => {
  if (birth) await page.fill("#consent-birth", birth);
  await page.check("#consent-accept");
  await page.getByRole("button", { name: "Continue" }).click();
};

// --- a new user is stopped at the consent page, before onboarding and the dashboard
{
  const { ctx, page, errors } = await session("new");
  await page.waitForURL(/\/consent/, { timeout: 15000 });
  check(/\/consent/.test(page.url()), "new user: sent to /consent before onboarding");
  const t = await text(page);
  check(/Before you start/.test(t) && (await page.locator("#consent-birth").count()) === 1, "consent: first sign in asks for a date of birth");
  check(await page.getByRole("button", { name: "Continue" }).isDisabled(), "consent: Continue is disabled until the date and acceptance are given");
  check((await page.locator('a[href$="/terms"]').count()) >= 1 && (await page.locator('a[href$="/privacy"]').count()) >= 1, "consent: links to the Terms and Privacy Policy");
  for (const path of ["/dashboard", "/dashboard/resume", "/dashboard/scrims", "/onboarding"]) {
    await page.goto(`http://app.localhost:${APP}${path}`);
    check(/\/consent/.test(page.url()), `gate: ${path} redirects to /consent until accepted`);
  }
  check((await state()).ages === 0, "nothing recorded before the player submits");

  // under 13: refused, account deleted
  await page.goto(`http://app.localhost:${APP}/consent`);
  await submit(page, yearsAgo(12, -200)); // 12 years and 200 days old
  await page.waitForSelector("text=You must be 13 or older");
  const s = await state();
  check(s.deletedUsers.length === 1 && s.ages === 0 && s.acceptances.length === 0, "under 13: the account is deleted and no date of birth or acceptance is kept");
  check(errors.length === 0, `consent: no page errors ${errors.join(" | ")}`);
  await ctx.close();
}

// --- the day before the 13th birthday is refused; the 13th birthday is accepted
{
  const { ctx, page } = await session("new");
  await page.waitForURL(/\/consent/);
  await submit(page, yearsAgo(13, 1)); // turns 13 tomorrow
  await page.waitForSelector("text=You must be 13 or older");
  check((await state()).deletedUsers.length === 1 && (await state()).ages === 0, "age 12, turning 13 tomorrow: refused");
  await ctx.close();
}
{
  const { ctx, page } = await session("new");
  await page.waitForURL(/\/consent/);
  await submit(page, yearsAgo(13)); // turns 13 today
  await page.waitForURL(/\/onboarding/, { timeout: 15000 });
  const s = await state();
  check(s.ages === 1, "age 13 today: accepted, age confirmation recorded once");
  check(s.acceptances.length === 2 && s.acceptances.every((a) => a.version === (a.document === "privacy" ? "2026-11-12" : "2026-11-10") && !!a.accepted_at) && new Set(s.acceptances.map((a) => a.document)).size === 2, "acceptance: Terms and Privacy recorded with the version and a timestamp");
  check(/\/onboarding/.test(page.url()), "after accepting, a new user continues to onboarding");
  await page.goto(`http://app.localhost:${APP}/consent`);
  check(/\/onboarding|\/dashboard/.test(page.url()) && !/\/consent$/.test(page.url()), "an accepted player is not shown the consent page again");
  await ctx.close();
}

// --- an adult path with the typical date
{
  const { ctx, page } = await session("new");
  await page.waitForURL(/\/consent/);
  await submit(page, "2000-01-01");
  await page.waitForURL(/\/onboarding/, { timeout: 15000 });
  check(true, "adult: date of birth and acceptance lead to onboarding");
  await ctx.close();
}

// --- existing players are not asked for their age again, and are not blocked
{
  const { ctx, page } = await session("rookie");
  await page.waitForURL(/\/dashboard/);
  check(!/\/consent/.test(page.url()), "an existing, accepted player goes straight to the dashboard");
  await page.goto(`http://app.localhost:${APP}/consent`);
  check(/\/dashboard/.test(page.url()), "/consent sends an accepted player to the dashboard");
  await ctx.close();
}

// --- terms changed: reacceptance, with the history kept
{
  const { ctx, page } = await session("oldterms");
  await page.goto(`http://app.localhost:${APP}/dashboard`);
  check(/\/consent/.test(page.url()), "terms changed: a player on an older version is sent to /consent");
  const t = await text(page);
  check(/changed/.test(t) && (await page.locator("#consent-birth").count()) === 0, "terms changed: says the documents changed and does not ask for the date of birth again");
  for (const path of ["/dashboard/resume", "/dashboard/team"]) {
    await page.goto(`http://app.localhost:${APP}${path}`);
    check(/\/consent/.test(page.url()), `terms changed: ${path} is blocked until accepted`);
  }
  await page.goto(`http://app.localhost:${APP}/consent`);
  await submit(page, null);
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  const s = await state();
  const versions = s.acceptances.map((a) => `${a.document}:${a.version}`).sort();
  check(JSON.stringify(versions) === JSON.stringify(["privacy:2026-01-01", "privacy:2026-11-12", "terms:2026-01-01", "terms:2026-11-10"]), "reacceptance: new version rows added, the older acceptances are kept");
  await page.goto(`http://app.localhost:${APP}/dashboard/resume`);
  check(!/\/consent/.test(page.url()), "reacceptance: the dashboard is open again");
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} CONSENT CHECK(S) FAILED` : "\nALL CONSENT CHECKS PASSED");
process.exit(failed ? 1 : 0);
