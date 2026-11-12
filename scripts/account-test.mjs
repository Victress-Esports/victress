// Account export and deletion, in a browser, using the local sign in stand-in (scripts/mock-auth.mjs).
//   node scripts/account-test.mjs <app-port> [mock-port=4010]
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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(`http://app.localhost:${MOCK}/dev/auth/login?persona=${persona}&to=${encodeURIComponent(`http://app.localhost:${APP}`)}`);
  return { ctx, page };
}

// --- export: only the player's own data
{
  const { ctx, page } = await session("team");
  await page.goto(`http://app.localhost:${APP}/dashboard/account`);
  check(/Download your data/.test(await text(page)) && /Delete your account/.test(await text(page)), "account: the page offers export and deletion");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download my data" }).click()]);
  check(dl.suggestedFilename() === "victress-data-export.json", "export: downloads victress-data-export.json");
  const body = JSON.parse(await (await import("node:fs")).promises.readFile(await dl.path(), "utf8"));
  check(body.profile?.handle === "mock_team" && body.account?.email === "team@example.invalid", "export: contains the player's own profile and email");
  check(Array.isArray(body.games) && body.games.length === 1 && Array.isArray(body.consents.legal_acceptances) && body.consents.legal_acceptances.length === 2, "export: games and consent records are included");
  const raw = JSON.stringify(body);
  check(!/mock_mate_one|mock_mate_two/.test(raw), "export: nothing about teammates (a team shows its name and your own role only)");
  check(body.team?.name === "Mock Squad" && body.team?.your_role === "owner", "export: the team is the name and the player's own role");
  check(!/token_hash/.test(raw), "export: share link tokens are never included");
  check(Array.isArray(body.retired.stat_entries) && body.retired.stat_entries.length === 1, "export: retired self reported entries still held are disclosed");
  // limit: 5 per hour
  let last = 200;
  for (let i = 0; i < 6; i++) last = await page.evaluate(async () => (await fetch("/dashboard/account/export")).status);
  check(last === 429, "export: limited to 5 an hour per player");
  await ctx.close();
}
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`http://app.localhost:${APP}/dashboard/account/export`).catch(() => {});
  check(/\/login/.test(page.url()), "export: signed out visitors are sent to sign in, not given data");
  await ctx.close();
}

// --- deletion refused: wrong confirmation, and a team owner with players
{
  const { ctx, page } = await session("team");
  await page.goto(`http://app.localhost:${APP}/dashboard/account`);
  check(await page.getByRole("button", { name: "Delete my account" }).isDisabled(), "delete: the button is disabled until the name is typed");
  await page.fill("#delete-confirm", "mock_team");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.waitForSelector("text=You own a team with other players");
  const s = await state();
  check(s.deletedUsers.length === 0, "delete: a team owner with players is refused and nothing is deleted");
  check(s.tables.teams === 1 && s.tables.team_members === 3 && s.tables.profiles === 3, "delete: the refusal changed nothing (the team, its members and profiles are all still there)");
  await ctx.close();
}

// --- deletion works: files, waitlist signup, account; session ends
{
  const { ctx, page } = await session("rookie");
  await page.goto(`http://app.localhost:${APP}/dashboard/account`);
  await page.fill("#delete-confirm", "mock_rookie");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.waitForURL(/\/login\?deleted=1/, { timeout: 15000 });
  check(/Your account and data were deleted/.test(await text(page)), "delete: confirms on the sign in page");
  const s = await state();
  check(s.deletedUsers.length === 1 && s.deletedUsers[0] === "00000000-0000-4000-9000-000000000001", "delete: the account was deleted");
  check(s.waitlistDeletes.includes("rookie@example.invalid"), "delete: the email list signup was removed");
  check(Object.values(s.tables).every((n) => n === 0), "delete: no rows remain for the player");
  await page.goto(`http://app.localhost:${APP}/dashboard`);
  check(/\/login/.test(page.url()), "delete: the session is gone");
  await ctx.close();
}

// --- a sole team owner: the team goes with the account, in the one final step
{
  const { ctx, page } = await session("soloteam");
  await page.goto(`http://app.localhost:${APP}/dashboard/account`);
  check(true, "solo owner: reaches the account page");
  await page.fill("#delete-confirm", "mock_soloteam");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.waitForURL(/\/login\?deleted=1/, { timeout: 15000 });
  const s = await state();
  check(s.deletedUsers.includes("00000000-0000-4000-9000-000000000007") && s.tables.teams === 0, "solo owner: the account and the team it owned alone are gone");
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} ACCOUNT CHECK(S) FAILED` : "\nALL ACCOUNT CHECKS PASSED");
process.exit(failed ? 1 : 0);
