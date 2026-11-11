// Browser tests for the signed in dashboard pages, using the local sign in stand-in (scripts/mock-auth.mjs).
//   node scripts/signed-in-test.mjs <app-port-uploads-off> <app-port-uploads-on> [mock-port=4010]
// Needs: MOCK_AUTH=1 node scripts/mock-supabase.mjs <mock-port>, and an app built with NEXT_PUBLIC_SUPABASE_URL pointing at it.
// Test tooling only. Touches no real database.
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
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

// --- signed out
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`http://app.localhost:${OFF}/dashboard`);
  check(/\/login/.test(page.url()), "signed out: /dashboard redirects to /login");
  await page.goto(`http://app.localhost:${OFF}/dashboard/scrims`);
  check(/\/login/.test(page.url()), "signed out: /dashboard/scrims redirects to /login");
  await ctx.close();
}

// --- rookie, everything off
{
  const { ctx, page, errors } = await session("rookie", OFF);
  let t = await text(page);
  check(page.url().endsWith("/dashboard"), "rookie: lands on the hub");
  check(/Dashboard/.test(t) && /Plan\s*Rookie/.test(t), "hub: plan shows Rookie");
  check(!/Not open yet|In development|Available now|Planned|Self-reported/i.test(t), "hub: no status banners and no self-reported stats wording");
  check(/Scout Desk/.test(t) && (t.match(/Coming soon/g) || []).length === 1, "hub: Scout Desk carries exactly one Coming soon label");
  check((await page.locator('a[href="/dashboard/scout"]').count()) === 1, "hub: the Scout Desk card links to the locked page");
  for (const [href, label] of [["/dashboard/resume", "Player Resume"], ["/dashboard/scrims", "Scrim Intelligence"], ["/dashboard/privacy", "Privacy and sharing"]])
    check((await page.locator(`a[href="${href}"]`).count()) > 0, `hub: card links to ${label}`);
  check(!/Your profile is live/.test(t), "hub: no 'profile is live' claim");

  // privacy page
  await page.goto(`http://app.localhost:${OFF}/dashboard/privacy`);
  t = await text(page);
  check(/not available yet/i.test(t) && /Sharing links are not available yet/.test(t), "privacy: public profile and sharing say not available yet");
  check(await page.locator("#dir-l").count() > 0 && (await page.getByRole("switch", { name: /List my profile publicly/ }).isDisabled()), "privacy: the public listing switch is disabled while the directory is off");

  // resume
  await page.goto(`http://app.localhost:${OFF}/dashboard/resume`);
  t = await text(page);
  check(!/Self-reported|Add or update stats|Every stat/i.test(t), "resume: no self-reported stats section and no way to add stats");
  check(!/Tournament history/i.test(t) && (await page.locator("#t-name").count()) === 0, "resume: no tournament history entry");
  check((await page.locator("label:has-text('Rank') select").count()) === 0 && !/\brank\b/i.test(t), "resume: no manual rank entry");
  await page.fill("#h-title", "Clutch");
  await page.fill("#h-url", "http://insecure.example/clip");
  await page.getByRole("button", { name: "Add highlight" }).click();
  await page.waitForTimeout(800);
  check(!(await page.locator("text=Clutch").count()), "resume: an http highlight link is refused");
  await page.fill("#h-url", "https://example.com/clip");
  await page.getByRole("button", { name: "Add highlight" }).click();
  await page.waitForSelector("text=Clutch");
  check(true, "resume: an https highlight link is accepted");
  await page.getByRole("button", { name: "Remove Clutch" }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("Clutch"));
  check(true, "resume: a highlight can be removed");
  // visibility preview responds to ticks
  const before = await text(page);
  await page.getByLabel("Role", { exact: true }).check();
  check((await text(page)) !== before, "resume: the preview changes when a field is ticked");

  // resume: edit profile text and games in place
  await page.goto(`http://app.localhost:${OFF}/dashboard/resume`);
  await page.fill("#pf-bio", "x".repeat(300));
  check((await page.inputValue("#pf-bio")).length === 280, "resume: the bio is limited to 280 characters");
  await page.fill("#pf-bio", "Duelist main. Climbing one Act at a time.");
  await page.fill("#pf-name", "Mock Rookie");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForSelector("text=Saved.");
  await page.reload();
  check((await page.inputValue("#pf-bio")) === "Duelist main. Climbing one Act at a time." && (await page.inputValue("#pf-name")) === "Mock Rookie", "resume: bio and display name save and persist after a reload");
  await page.getByRole("button", { name: /^\+ Counter-Strike 2$/ }).click();
  await page.getByRole("button", { name: "Remove Counter-Strike 2" }).waitFor();
  check(true, "resume: a game can be added in place");
  await page.getByRole("button", { name: "Remove Counter-Strike 2" }).click();
  await page.waitForTimeout(600);
  check((await page.getByRole("button", { name: "Remove Counter-Strike 2" }).count()) === 0, "resume: a game can be removed");

  // stats are retired: the page redirects, nothing links to it
  await page.goto(`http://app.localhost:${OFF}/dashboard/stats`);
  check(/\/dashboard$/.test(page.url()), "stats: /dashboard/stats redirects to the dashboard");
  await page.goto(`http://app.localhost:${OFF}/dashboard`);
  check((await page.locator('a[href="/dashboard/stats"], a[href="/leaderboard"]').count()) === 0, "dashboard: no link to stats or leaderboards");
  // scrims, uploads off
  await page.goto(`http://app.localhost:${OFF}/dashboard/scrims`);
  t = await text(page);
  check(/Automated analysis\s*Coming soon/.test(t), "scrims: automated analysis is Coming soon");
  check(/Uploads are not open yet/.test(t) && (await page.locator('input[type="file"]').count()) === 0, "scrims: no uploader while the flag is off");
  check(!/Where every number comes from|Self-reported/i.test(t) && /Automated analysis\s*Coming soon/.test(t), "scrims: no provenance paragraph; analysis carries one Coming soon label");
  check(!/\d+(\.\d+)?\s*(ACS|K\/D)/i.test(t), "scrims: no stats are shown");
  // the manual match log is gone
  check(!/Match log|Log match/i.test(t) && (await page.locator("#m-opp").count()) === 0, "scrims: no manual match log");
  check((await page.locator('input[type="file"]').count()) === 0, "scrims: no file upload control while the flag is off");
  check(errors.length === 0, `rookie: no page errors ${errors.join(" | ")}`);
  await ctx.close();
}

// --- uploads on, but the account is not an approved design partner: closed in the interface AND at Storage
{
  const { ctx, page } = await session("rookie", ON);
  await page.goto(`http://app.localhost:${ON}/dashboard/scrims`);
  const t0 = await text(page);
  check(/approved design partners only/i.test(t0) && (await page.locator('input[type="file"]').count()) === 0, "scrims (flag on, not approved): no uploader; says approved design partners only");
  await page.goto(`http://app.localhost:${ON}/dashboard`);
  check(!/Uploads open/.test(await text(page)), "hub (flag on, not approved): does not claim uploads are open");
  // Calling Storage and the table directly with this user's own session token (what a determined user could do).
  const cookie = (await ctx.cookies()).find((c) => c.name.startsWith("sb-"));
  const token = JSON.parse(Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString()).access_token;
  const uid = "00000000-0000-4000-9000-000000000001";
  const hdr = { apikey: "mock", authorization: `Bearer ${token}` };
  const direct = await fetch(`http://127.0.0.1:${MOCK}/storage/v1/object/scrim-uploads/${uid}/direct.dem`, { method: "POST", headers: { ...hdr, "content-type": "application/octet-stream" }, body: Buffer.alloc(64) });
  check(direct.status === 403, "a user not on the allowlist cannot write to Storage directly");
  const rec = await fetch(`http://127.0.0.1:${MOCK}/rest/v1/scrim_uploads`, { method: "POST", headers: { ...hdr, "content-type": "application/json" }, body: JSON.stringify({ profile_id: uid, game: "CS2", storage_path: `${uid}/direct.dem`, original_name: "direct.dem", size_bytes: 1 }) });
  check(rec.status === 403, "a user cannot record an upload row directly");
  await ctx.close();
}

// --- uploads on, approved design partner
{
  const { ctx, page } = await session("partner", ON);
  await page.goto(`http://app.localhost:${ON}/dashboard/scrims`);
  const file = page.locator('input[type="file"]');
  check((await file.count()) === 1 && (await file.isDisabled()), "scrims (flag on): the picker is locked until the player confirms");
  await page.getByLabel(/I took part in this practice/).check();
  writeFileSync("/tmp/claude-0/bad.exe", "x");
  await file.setInputFiles("/tmp/claude-0/bad.exe");
  await page.waitForSelector("text=Supported file types");
  check(true, "scrims: an unsupported file type is refused");
  writeFileSync("/tmp/claude-0/practice.dem", Buffer.alloc(2048, 1));
  await file.setInputFiles("/tmp/claude-0/practice.dem");
  await page.waitForSelector("text=practice.dem");
  check(/stored privately/.test(await text(page)) && /not analyzed/.test(await text(page)), "scrims: an upload is listed as stored privately and not analyzed");
  await page.getByRole("button", { name: "Delete practice.dem" }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("practice.dem"));
  check(true, "scrims: a file can be deleted");
  await page.goto(`http://app.localhost:${ON}/dashboard`);
  check(/Scrims/.test(await text(page)), "hub (flag on, approved partner): the Scrims card is there");
  // Even an approved partner cannot write the row (or size_bytes) themselves: only the server action records uploads.
  const cookie = (await ctx.cookies()).find((c) => c.name.startsWith("sb-"));
  const token = JSON.parse(Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString()).access_token;
  const uid = "00000000-0000-4000-9000-000000000005";
  const rec = await fetch(`http://127.0.0.1:${MOCK}/rest/v1/scrim_uploads`, { method: "POST", headers: { apikey: "mock", authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ profile_id: uid, game: "CS2", storage_path: `${uid}/x.dem`, original_name: "x.dem", size_bytes: 1 }) });
  check(rec.status === 403, "an approved partner cannot write scrim_uploads (or size_bytes) directly");
  await ctx.close();
}

// --- team member
{
  const { ctx, page } = await session("team", OFF);
  await page.goto(`http://app.localhost:${OFF}/dashboard/team`);
  const t = await text(page);
  check(/Mock Squad/.test(t) && /mock_mate_one/.test(t) && /mock_mate_two/.test(t), "team: the roster shows all three members");
  check(/Roster \(3 of 10\)/.test(t), "team: roster count");
  await ctx.close();
}

// --- recruiter or scout
{
  const { ctx, page } = await session("scout", OFF);
  const t = await text(page);
  check(/Plan\s*Rookie/.test(t) && /Scout Desk/.test(t) && /Coming soon/.test(t), "scout persona: still Rookie; Scout Desk shows Coming soon (no entitlement source exists)");
  await page.goto(`http://app.localhost:${OFF}/dashboard/scout`);
  const sd = await text(page);
  check(/Scout Desk/.test(sd) && /Scout plan only/.test(sd) && /Coming soon/.test(sd), "scout persona: Scout Desk is Scout plan only and Coming soon");
  check(!/Planned|In development|Not built/i.test(sd), "scout persona: no status wording on the Scout Desk page");
  check(!/mock_|Mock Ace|Private Pat|@example/.test(sd), "scout persona: the page shows no player data or contact details");
  check(/never says how good a player is/.test(sd), "scout persona: the verification limit is stated");
  check((await page.locator("main input, main textarea, main form, main select").count()) === 0, "scout persona: no search, filter or contact controls exist");
  await ctx.close();
}

// --- new user: onboarding starts at the account type step
{
  const { ctx, page } = await session("new", OFF);
  check(/\/onboarding/.test(page.url()), "new user: sent to onboarding");
  check(/How will you use Victress\?/.test(await text(page)), "onboarding: starts with the account type step");
  for (const r of ["Player", "Coach or team", "Scout or recruiter"]) check((await page.getByRole("button", { name: new RegExp(`^${r}`) }).count()) === 1, `onboarding: ${r} is a choice when no role came from the website`);
  check((await page.getByRole("button", { name: /^(College program|Partner organization)/ }).count()) === 0, `onboarding: no personal account is offered for a college program or a partner organization`);
  await page.getByRole("button", { name: /Scout or recruiter/ }).click();
  check(/Pick your name/.test(await text(page)), "onboarding: account type leads to the name step");
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} SIGNED IN CHECK(S) FAILED` : "\nALL SIGNED IN CHECKS PASSED");
process.exit(failed ? 1 : 0);
