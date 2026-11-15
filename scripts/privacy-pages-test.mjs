// Browser checks: the Privacy Policy on victress.gg and victressesports.com is the same document, public, readable on phone and desktop,
// and reachable from the footers. Test tooling only; uses the local sign in stand-in for the dashboard footer.
//   node scripts/privacy-pages-test.mjs <app-port> [mock-port=4010] [screenshot-dir]
// Needs: MOCK_AUTH=1 node scripts/mock-supabase.mjs <mock-port>, and the app built against it. On a local server, http://localhost:<port>
// is the marketing site and http://app.localhost:<port> is the application.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [PORT, MOCK = 4010, SHOTS] = [Number(process.argv[2]), Number(process.argv[3] ?? 4010), process.argv[4]];
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const browser = await chromium.launch();
const APP = `http://app.localhost:${PORT}`;
const MKT = `http://localhost:${PORT}`;

async function read(url, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
  const res = await page.goto(`${url}/privacy`);
  const doc = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const root = h1?.parentElement;
    return {
      h1: h1?.textContent ?? "",
      headings: [...(root?.querySelectorAll("h2") ?? [])].map((h) => h.textContent),
      text: (root?.innerText ?? "").replace(/\s+/g, " "),
      wide: document.documentElement.scrollWidth > window.innerWidth,
      fontPx: parseFloat(getComputedStyle(root?.querySelector("li") ?? document.body).fontSize),
    };
  });
  return { ctx, page, res, doc, errors };
}

for (const width of [1280, 390]) {
  const a = await read(APP, width);
  const m = await read(MKT, width);
  const tag = width === 1280 ? "desktop" : "phone";
  check(a.res.status() === 200 && m.res.status() === 200, `${tag}: both privacy pages load signed out (200)`);
  check(a.doc.h1 === "Privacy" && a.doc.headings.length === 10, `${tag}: victress.gg shows the policy with all 10 sections`);
  check(JSON.stringify(a.doc.headings) === JSON.stringify(m.doc.headings) && a.doc.text === m.doc.text && a.doc.text.length > 5000, `${tag}: the policy text is identical on both sites`);
  check(!a.doc.wide && !m.doc.wide, `${tag}: no horizontal scrolling on either site`);
  check(a.doc.fontPx >= 16, `${tag}: body text is at least 16px (${a.doc.fontPx}px)`);
  check(a.errors.length === 0 && m.errors.length === 0, `${tag}: no script errors`);
  if (SHOTS) { await a.page.screenshot({ path: `${SHOTS}/privacy-app-${tag}.png`, fullPage: false }); await m.page.screenshot({ path: `${SHOTS}/privacy-marketing-${tag}.png`, fullPage: false }); }
  if (width === 1280) {
    const links = await a.page.evaluate(() => [...document.querySelectorAll("footer a")].map((x) => [x.textContent, x.getAttribute("href")]));
    check(links.some(([t, h]) => t === "Privacy" && h === "/privacy") && links.some(([t]) => t === "Terms") && links.some(([t]) => t === "Cancellation and Refunds"), "victress.gg privacy footer: Terms, Privacy and Cancellation and Refunds");
    const terms = links.find(([t]) => t === "Terms")?.[1] ?? "";
    check(/\/terms$/.test(terms) && !terms.startsWith(APP), "the Terms link goes to the marketing site's Terms page");
    await a.page.click('footer a:has-text("Privacy")');
    check(a.page.url() === `${APP}/privacy`, "the footer Privacy link works");
    const canon = await a.page.getAttribute('link[rel="canonical"]', "href");
    check(canon === "https://victressesports.com/privacy", `the canonical is the marketing page (${canon})`);
    const t = a.doc.text;
    check(/Epic Account ID/.test(t) && /does not read or keep it/.test(t) && /does not access your Epic friends list, online presence, country or game activity/.test(t) && /does not sign you in to Victress/.test(t), "the Epic Games disclosure says what is received, kept and not accessed");
    check(/Epic Games processes information under its own terms and privacy policy/.test(t) && t.indexOf("Epic Games: only if") > t.indexOf("Google: only if"), "Epic Games is listed with the other services, after Discord and Google");
    check(!/legal review/i.test(t) && !/legal review/i.test(m.doc.text), "neither page shows a legal review notice (final text)");
    check(/Discord integration/.test(t) && /Team level processing and individual consent are separate/.test(t) && /no later than 30 days/.test(t) && /No system is perfectly secure/.test(t), "existing Discord, consent, deletion and security text is intact");
  }
  await a.ctx.close(); await m.ctx.close();
}

{ // the dashboard footer links to the policy on victress.gg
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(`http://app.localhost:${MOCK}/dev/auth/login?persona=partner&to=${encodeURIComponent(APP)}`);
  await page.goto(`${APP}/dashboard`);
  const href = await page.getAttribute('footer a:has-text("Privacy")', "href");
  await page.click('footer a:has-text("Privacy")');
  check(href === "/privacy" && page.url() === `${APP}/privacy` && (await page.locator("h1").innerText()) === "Privacy", "dashboard footer Privacy opens victress.gg/privacy");
  await ctx.close();
}
await browser.close();
console.log(failed ? `\n${failed} FAILED` : "\nAll privacy page checks passed.");
process.exit(failed ? 1 : 0);
