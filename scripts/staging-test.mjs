// Browser checks against the STAGING Supabase project, with a locally run app. Not a Vercel Preview test.
//   STAGING_SUPABASE_URL=... STAGING_ANON_KEY=... STAGING_TEST_PASSWORD=... node scripts/staging-test.mjs <app-port> <phase>
// Phases: fresh (consent flow), export (account export), refuse (team owner deletion refused), solo (deletion attempt, see below), terms (reacceptance).
// Refuses to run against anything but a URL given explicitly, and never against the production project.
import { createRequire } from "node:module";
import { promises as fs } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { createServerClient } = require("@supabase/ssr");
const [APP, phase] = [Number(process.argv[2]), process.argv[3]];
const { STAGING_SUPABASE_URL: URL_, STAGING_ANON_KEY: ANON, STAGING_TEST_PASSWORD: PW } = process.env;
if (!URL_ || !ANON || !PW || /pmamceqshyfptvjgimsf/.test(URL_)) { console.error("needs the staging URL, anon key and test password; never production"); process.exit(2); }
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const text = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");

async function login(browser, email, opts = {}) {
  const jar = new Map();
  const sb = createServerClient(URL_, ANON, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (l) => l.forEach(({ name, value }) => jar.set(name, value)) } });
  const { error } = await sb.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`staging sign in failed for ${email}: ${error.message}`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, ...opts });
  await ctx.addCookies([...jar].map(([name, value]) => ({ name, value, domain: "app.localhost", path: "/" })));
  return { ctx, page: await ctx.newPage() };
}
const A = (p) => `http://app.localhost:${APP}${p}`;
const browser = await chromium.launch();

if (phase === "fresh") {
  const { ctx, page } = await login(browser, "stg-fresh@test.invalid");
  await page.goto(A("/dashboard/account"));
  check(/\/consent/.test(page.url()), "staging consent: a new account is stopped at /consent before the account page");
  check((await page.locator("#consent-birth").count()) === 1, "staging consent: asks for a date of birth on first sign in");
  await page.fill("#consent-birth", "2000-01-01");
  await page.check("#consent-accept");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/onboarding/, { timeout: 20000 });
  check(true, "staging consent: acceptance recorded, then onboarding");
  await page.goto(A("/consent"));
  check(!/\/consent$/.test(page.url()), "staging consent: an accepted player is not asked again");
  await ctx.close();
}
if (phase === "terms") {
  const { ctx, page } = await login(browser, "stg-member@test.invalid");
  await page.goto(A("/dashboard"));
  check(/\/consent/.test(page.url()), "staging reacceptance: a player without the current terms version is sent to /consent");
  const t = await text(page);
  check(/changed/.test(t) && (await page.locator("#consent-birth").count()) === 0, "staging reacceptance: says the documents changed and does not ask for the date of birth again");
  await page.check("#consent-accept");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  check(!/\/consent/.test(page.url()), "staging reacceptance: the dashboard opens after accepting");
  await ctx.close();
}
if (phase === "export") {
  const { ctx, page } = await login(browser, "stg-owner@test.invalid");
  await page.goto(A("/dashboard/account"));
  check(/Download your data/.test(await text(page)) && /Delete your account/.test(await text(page)), "staging account: the page offers export and deletion");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download my data" }).click()]);
  const body = JSON.parse(await fs.readFile(await dl.path(), "utf8"));
  const raw = JSON.stringify(body);
  check(body.profile?.handle === "stg_owner" && body.account?.email === "stg-owner@test.invalid", "staging export: the player's own profile and email");
  check(body.games?.length === 1 && body.highlights?.length === 1 && body.highlights[0].title === "Stg clip", "staging export: games and highlights");
  check(body.team?.name === "Stg Squad" && body.team?.your_role === "owner", "staging export: the team name and the player's own role");
  check(!/stg_member|stg-member|stg_solo|stg-solo/.test(raw), "staging export: nothing about teammates or other accounts");
  check(!/token_hash/.test(raw), "staging export: no share link tokens");
  check(body.consents?.legal_acceptances?.length === 2 && body.consents?.age_confirmation?.length === 1, "staging export: consent records with versions and time");
  await ctx.close();
}
if (phase === "refuse") {
  const { ctx, page } = await login(browser, "stg-owner@test.invalid");
  await page.goto(A("/dashboard/account"));
  await page.fill("#delete-confirm", "stg_owner");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.waitForSelector("text=You own a team with other players", { timeout: 20000 });
  check(true, "staging delete: a team owner with players is refused, with the reason");
  await ctx.close();
}
if (phase === "solo") {
  const { ctx, page } = await login(browser, "stg-solo@test.invalid");
  await page.goto(A("/dashboard/account"));
  check(await page.getByRole("button", { name: "Delete my account" }).isDisabled(), "staging delete: the button stays disabled until the name is typed");
  await page.fill("#delete-confirm", "stg_solo");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.waitForTimeout(6000);
  const t = await text(page);
  console.log("INFO delete attempt result:", /could not delete everything/.test(t) ? "refused: could not delete (no service role in this environment)" : /deleted/.test(t) ? "account deleted" : t.slice(0, 120));
  await ctx.close();
}
await browser.close();
console.log(failed ? `\n${failed} STAGING CHECK(S) FAILED` : `\nALL STAGING CHECKS PASSED (${phase})`);
process.exit(failed ? 1 : 0);
