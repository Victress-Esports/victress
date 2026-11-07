// SEO audit against a running server. Sends each request with a production Host header so both domains are checked.
//   node scripts/seo-audit.mjs [port]          (default 3200)   against a local server, using the mock Supabase
//   node scripts/seo-audit.mjs live            against the real production sites over https (read only GET requests; checks that
//                                              need the mock's sample profiles are skipped)
// Checks: titles and descriptions (length, unique), canonical, Open Graph, Twitter, robots/noindex, headings, images,
// JSON-LD, status codes, redirects, and that robots.txt and sitemap.xml agree with each other.
import http from "node:http";
import https from "node:https";

const LIVE = process.argv[2] === "live";
const PORT = Number(process.argv[2]) || 3200;
const MARKETING = "victressesports.com";
const APP = "victress.gg";

function get(host, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const transport = LIVE ? https : http;
    const target = LIVE ? { host, port: 443, path, headers } : { host: "127.0.0.1", port: PORT, path, headers: { host, ...headers } };
    const req = transport.request(target, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, buf: Buffer.concat(chunks), body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    req.setTimeout(60000, () => req.destroy(new Error("timeout")));
    req.end();
  });
}

let failures = 0;
let checks = 0;
const fail = (msg) => {
  failures++;
  console.log("   FAIL", msg);
};
const ok = (cond, msg) => (checks++, cond ? true : (fail(msg), false));

const meta = (html, attr, key) => {
  const m = html.match(new RegExp(`<meta[^>]*${attr}="${key}"[^>]*>`, "i"));
  return m ? (m[0].match(/content="([^"]*)"/i)?.[1] ?? "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"') : null;
};
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<");

// Minimal robots.txt matcher: longest matching rule wins, Allow beats Disallow on a tie (Google's behaviour).
function parseRobots(txt) {
  const rules = [];
  const sitemaps = [];
  let applies = false;
  for (const raw of txt.split("\n")) {
    const line = raw.split("#")[0].trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase();
    if (k === "user-agent") applies = m[2] === "*";
    else if (k === "sitemap") sitemaps.push(m[2]);
    else if (applies && (k === "allow" || k === "disallow") && m[2] !== "") rules.push({ allow: k === "allow", path: m[2] });
  }
  const toRe = (p) => new RegExp("^" + p.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\$$/, "$"));
  const blocked = (path) => {
    let best = null;
    for (const r of rules) if (toRe(r.path).test(path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
    return !!best && !best.allow;
  };
  return { rules, sitemaps, blocked };
}

const seen = { title: new Map(), desc: new Map() };

async function auditPage({ host, path, index, types = [], og = true, hidden = false, contains = [], exact, notContains = [] }) {
  const label = `${host}${path}`;
  const res = await get(host, path);
  console.log(`\n# ${label}  [${res.status}] ${index ? "indexable" : "private/noindex"}`);
  if (!ok(res.status === 200, `status ${res.status}, expected 200`)) return;
  const html = res.body;

  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  const desc = meta(html, "name", "description") ?? "";
  console.log(`   title (${title.length}): ${title}`);
  console.log(`   description (${desc.length}): ${desc}`);
  ok(title.length > 0 && title.length < 60, `title length ${title.length} (must be 1-59)`);
  ok(desc.length > 0 && desc.length < 160, `description length ${desc.length} (must be 1-159)`);
  ok((title.match(/\| Victress/g) ?? []).length <= 1, "title repeats '| Victress'");
  // Founder rule: titles and descriptions are plain industry phrases that say what the page is. They are never the tagline.
  {
    const tagline = /turn practice into progress/i;
    // Founder rule (2026-11-07): titles and descriptions are indexed, so they describe only what is live. No "coming soon", no
    // "planned", no unbuilt product names. Those labels stay on the pages themselves, next to the unbuilt features.
    const unbuilt = /coming soon|\bplanned\b|scout desk|scrim intelligence|scrim analysis/i;
    const social = ["og:title", "og:description", "twitter:title", "twitter:description"].map((k) => [k, meta(html, k.startsWith("og") ? "property" : "name", k) ?? ""]);
    ok(!tagline.test(title), `title contains the tagline: ${title}`);
    ok(!tagline.test(desc), "meta description contains the tagline");
    for (const [k, v] of social) ok(!tagline.test(v), `${k} contains the tagline`);
    ok(!unbuilt.test(title), `title mentions coming soon, planned or an unbuilt product: ${title}`);
    ok(!unbuilt.test(desc), `meta description mentions coming soon, planned or an unbuilt product: ${desc}`);
    for (const [k, v] of social) ok(!unbuilt.test(v), `${k} mentions coming soon, planned or an unbuilt product: ${v}`);
    // JSON-LD "description" fields (the slogan is the one place the tagline is kept on purpose; FAQ answers are page content).
    const walk = (o, out = []) => { if (Array.isArray(o)) o.forEach((x) => walk(x, out)); else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { if (k === "description" && typeof v === "string") out.push(v); else walk(v, out); } return out; };
    for (const blk of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      let ldj = null; try { ldj = JSON.parse(blk[1]); } catch {}
      if (ldj) for (const d of walk(ldj)) { ok(!tagline.test(d) && !unbuilt.test(d), `JSON-LD description mentions the tagline, coming soon, planned or an unbuilt product: ${d.slice(0, 80)}`); }
    }
    if (host === MARKETING && index) ok(/ \| Victress$/.test(title), `marketing title is not "<what the page is> | Victress": ${title}`);
  }
  if (seen.title.has(title)) fail(`title duplicates ${seen.title.get(title)}`);
  else seen.title.set(title, label);
  if (seen.desc.has(desc)) fail(`description duplicates ${seen.desc.get(desc)}`);
  else seen.desc.set(desc, label);

  const robotsMeta = meta(html, "name", "robots") ?? "";
  const xrt = res.headers["x-robots-tag"] ?? "";
  if (index) ok(!/noindex/i.test(robotsMeta + xrt), `indexable page is noindex (${robotsMeta} ${xrt})`);
  else ok(/noindex/i.test(robotsMeta + xrt), "private page is NOT noindex");

  for (const old of ["Perform. Compete. Rise", "Turn performance into progress", "Your stats. Your profile. Your competitive edge", "Founding clubs", "founding clubs", "privacy-friendly analytics", "Elevate", "Vistrielle"]) ok(!html.includes(old), `retired tagline found on page: "${old}"`);
  // Brand rule: no hyphens or em dashes in visible marketing copy (game names and the "Self-reported" label are the exceptions).
  if (host === MARKETING) {
    const visible = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
    const hyphenated = (visible.match(/[A-Za-z0-9]+[-\u2013\u2014][A-Za-z0-9]+|\u2014|\u2013/g) ?? []).filter((w) => !/^(Self-reported|Counter-Strike)$/i.test(w));
    ok(hyphenated.length === 0, `hyphen or dash in visible copy: ${[...new Set(hyphenated)].slice(0, 6).join(", ")}`);
  }
  for (const text of contains) ok(html.includes(text), `page does not contain: "${text}"`);
  for (const text of notContains) ok(!html.includes(text), `page should not contain: "${text}"`);
  if (exact) {
    ok(title === exact.title, `title is "${title}", expected "${exact.title}"`);
    ok(desc === exact.description, `description differs from the approved value`);
  }

  // A profile whose owner has not opted in to search: viewable, shareable, but no canonical and no structured data.
  if (hidden) {
    ok(!/rel="canonical"/.test(html), "opted-out profile still has a canonical link");
    ok(!/application\/ld\+json/.test(html), "opted-out profile still has JSON-LD");
    ok(!!meta(html, "property", "og:title") && !!meta(html, "property", "og:image"), "opted-out profile lost its social card tags");
    ok(meta(html, "name", "twitter:card") === "summary_large_image", "opted-out profile lost its Twitter card");
  }

  if (index && og) {
    const canon = html.match(/<link[^>]*rel="canonical"[^>]*>/i)?.[0].match(/href="([^"]*)"/i)?.[1];
    const want = `https://${host}${path === "/" ? "" : path}`;
    ok(canon === want, `canonical ${canon} (want ${want})`);
    ok((html.match(/rel="canonical"/g) ?? []).length === 1, "not exactly one canonical link");
    ok(meta(html, "property", "og:title") === title, "og:title missing or differs from <title>");
    ok(meta(html, "property", "og:description") === desc, "og:description missing or differs");
    ok(meta(html, "property", "og:url") === want, `og:url ${meta(html, "property", "og:url")} (want ${want})`);
    ok(["website", "profile"].includes(meta(html, "property", "og:type") ?? ""), "og:type missing");
    ok(meta(html, "property", "og:site_name") === "Victress", "og:site_name missing");
    ok(meta(html, "name", "twitter:card") === "summary_large_image", "twitter:card missing");
    ok(meta(html, "name", "twitter:title") === title, "twitter:title missing");
    const img = meta(html, "property", "og:image");
    ok(!!img && img.startsWith(`https://${host}/`), `og:image ${img} is not absolute on this host`);
    ok((meta(html, "property", "og:image:alt") ?? "").length > 10, "og:image:alt missing");
    ok(meta(html, "property", "og:image:width") === "1200" && meta(html, "property", "og:image:height") === "630", "og:image size tags missing");
    ok(meta(html, "name", "twitter:image") === img, "twitter:image differs from og:image");
    if (img) {
      const ir = await get(host, new URL(img).pathname + new URL(img).search);
      ok(ir.status === 200 && /image\/png/.test(ir.headers["content-type"] ?? ""), `og:image fetch -> ${ir.status} ${ir.headers["content-type"]}`);
    }
  }

  ok((html.match(/<h1[\s>]/g) ?? []).length === 1, `h1 count ${(html.match(/<h1[\s>]/g) ?? []).length}`);
  ok((html.match(/<main[\s>]/g) ?? []).length === 1, `main landmarks ${(html.match(/<main[\s>]/g) ?? []).length}`);
  ok(/<html[^>]*lang="en/.test(html), "html lang missing");
  const imgs = html.match(/<img[^>]*>/g) ?? [];
  for (const im of imgs) {
    ok(/\salt="/.test(im), `img without alt: ${im.slice(0, 80)}`);
    ok(/\swidth="\d+"/.test(im) && /\sheight="\d+"/.test(im), `img without width/height: ${im.slice(0, 80)}`);
  }
  console.log(`   images: ${imgs.length}, all with alt and dimensions`);
  ok(/rel="icon"/.test(html) && /rel="apple-touch-icon"/.test(html), "favicon or apple-touch-icon link missing");

  const found = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const d = JSON.parse(m[1]);
      for (const n of d["@graph"] ?? [d]) {
        found.push(n["@type"]);
        if (n.mainEntity?.["@type"]) found.push(n.mainEntity["@type"]);
      }
    } catch (e) {
      fail(`JSON-LD does not parse: ${e.message}`);
    }
  }
  console.log(`   JSON-LD: ${found.join(", ") || "none"}`);
  for (const t of types) ok(found.includes(t), `JSON-LD missing ${t}`);
}

async function auditSite(host, other, expectedPaths, privatePaths) {
  console.log(`\n================ ${host}: robots.txt ================`);
  const rob = await get(host, "/robots.txt");
  console.log(rob.body.trim());
  const robots = parseRobots(rob.body);
  ok(robots.sitemaps.length === 1 && robots.sitemaps[0] === `https://${host}/sitemap.xml`, `robots Sitemap line is ${robots.sitemaps.join(",")}`);
  ok(!robots.sitemaps.some((s) => s.includes(other)), `robots.txt points at the other domain (${other})`);
  ok(!robots.blocked("/api/og") && !robots.blocked("/api/og/profile"), "social card route is blocked by robots.txt");
  for (const p of privatePaths) ok(robots.blocked(p), `private path not blocked in robots.txt: ${p}`);

  console.log(`\n================ ${host}: sitemap.xml ================`);
  const sm = await get(host, "/sitemap.xml");
  console.log(`status ${sm.status}, ${sm.headers["content-type"]}`);
  const xml = sm.body;
  const preview = xml.split("\n").slice(0, 8).join("\n");
  console.log(preview + (xml.split("\n").length > 8 ? "\n..." : ""));
  ok(sm.status === 200, `sitemap status ${sm.status}`);

  let urls = [];
  if (xml.includes("<sitemapindex")) {
    console.log("(sitemap index)");
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const child = new URL(m[1].replace(/&amp;/g, "&"));
      ok(child.host === host, `index child on wrong host: ${child.host}`);
      const r = await get(host, child.pathname);
      ok(r.status === 200, `child ${child.pathname} -> ${r.status}`);
      const cu = [...r.body.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map((x) => ({ loc: x[1], lastmod: x[2] }));
      console.log(`   ${child.pathname}: ${cu.length} URLs`);
      urls.push(...cu);
    }
  } else {
    urls = [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map((x) => ({ loc: x[1], lastmod: x[2] }));
  }
  console.log(`\nURLs listed for ${host} (${urls.length}):`);
  for (const u of urls) console.log(`   ${u.loc}${u.lastmod ? `   lastmod ${u.lastmod}` : ""}`);

  for (const u of urls) {
    const url = new URL(u.loc);
    if (url.host !== host) fail(`sitemap URL on wrong host: ${u.loc}`);
    if (robots.blocked(url.pathname)) fail(`sitemap URL is blocked by robots.txt: ${u.loc}`);
    const r = await get(host, url.pathname);
    if (r.status !== 200) fail(`sitemap URL returns ${r.status}: ${u.loc}`);
    else if (/noindex/i.test((r.headers["x-robots-tag"] ?? "") + (meta(r.body, "name", "robots") ?? ""))) fail(`sitemap URL is noindex: ${u.loc}`);
  }
  for (const p of expectedPaths) ok(urls.some((u) => new URL(u.loc).pathname === p), `sitemap is missing ${p}`);
  return urls;
}

console.log("######## PAGES ########");
const mk = (host, path, index, types = []) => ({ host, path, index, types });
const pages = [
  {
    host: MARKETING,
    path: "/",
    index: true,
    types: ["Organization", "WebSite", "WebApplication"],
    // Above the fold: the tagline once (the headline), one sentence, ONE button with one small line, one labeled sample. Below it: the
    // three products, how it works, the design partner pilot, one closing button.
    contains: [
      "Turn practice into progress.",
      "Victress helps competitive esports players turn practice into performance evidence, build a Player Resume and be discovered by teams, coaches and collegiate programs.",
      "Become a Design Partner", "Free 4 to 6 week pilot for one competitive team.", "Sample", "Sign up", "Log in",
      "Three products.", "Scrim Intelligence", "Player Resume", "Scout Desk", "Coming soon",
      "How it works.", "The design partner pilot.", "Applying does not guarantee a place.",
      "Victress is not currently offering funding, coaching, mentorship, scholarships or recruitment.",
    ],
    // Approved homepage values. The wings are the logo (nav and footer) and a faint cropped backdrop; the full-size art file itself must not be a hero visual.
    exact: {
      title: "Esports Player Development and Recruitment | Victress",
      description: "Esports player development and recruitment for players, teams, coaches and collegiate programs. Create an account with source labeled stats and manage rosters.",
    },
    notContains: ["wings-480", "wings-720", "/brand/wings.webp", "Claim your name", "Available now", "shareable player profile", "share one link", "Explore the Platform", "Get started"],
  },
  mk(MARKETING, "/pricing", true, ["FAQPage", "BreadcrumbList"]),
  mk(MARKETING, "/teams", true, ["BreadcrumbList"]),
  mk(MARKETING, "/about", true, ["BreadcrumbList"]),
  { host: MARKETING, path: "/partnerships", index: true, types: ["BreadcrumbList"], contains: ["mailto:hello@victressesports.com", "Collegiate esports programs", "Tournament organizers"] },
  { host: MARKETING, path: "/contact", index: true, types: ["BreadcrumbList"], contains: ["mailto:hello@victressesports.com", "Teams and organizations", "Individual players", "Request access", "Apply for Design Partner"] },
  { host: MARKETING, path: "/platform", index: true, types: ["BreadcrumbList"], contains: ["Practice", "Performance Evidence", "Development", "Recognition", "Opportunity", "Scrim Intelligence", "Player Resume", "Scout Desk", "Coming soon"] },
  { host: MARKETING, path: "/women-in-esports", index: true, types: ["BreadcrumbList"], contains: ["Women in Esports", "Victress is called Victress for a purpose.", "Delivered through", "Victress is not currently offering funding, coaching, mentorship, scholarships or recruitment."] },
  { host: MARKETING, path: "/design-partner", index: true, types: ["BreadcrumbList"], contains: ["Founding Design Partner pilot", "4 to 6 week", "What partners receive", "What we ask", "Applying does not guarantee a place.", "Active women", "Game Changers teams", "Collegiate programs"] },
  mk(MARKETING, "/privacy", true, ["BreadcrumbList"]),
  { host: MARKETING, path: "/terms", index: true, types: ["BreadcrumbList"], contains: ["at least 13 years old"] },
  mk(APP, "/", true),
  ...(LIVE
    ? []
    : [
        mk(APP, "/mock_ace", true, ["ProfilePage", "Person"]), // opted in to search
        mk(APP, "/dashboard_fan", true, ["ProfilePage"]), // opted in to search
        { host: APP, path: "/mock_player_12", index: false, hidden: true }, // default: not opted in, still viewable (200)
        { host: APP, path: "/demo_mock", index: false, hidden: true }, // demo players are never indexed
      ]),
  { host: APP, path: "/login", index: false, contains: ["You must be 13 or older", "Terms", "Privacy Policy"] },
];
for (const p of pages) await auditPage(p);

if (!LIVE) {
  console.log("\n######## PROFILE JSON-LD: only public fields ########");
  const html = (await get(APP, "/mock_ace")).body;
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  console.log(JSON.stringify(ld, null, 2));
  const allowed = new Set(["@type", "@id", "name", "alternateName", "url", "image", "description", "memberOf", "knowsAbout"]);
  for (const k of Object.keys(ld.mainEntity)) ok(allowed.has(k), `unexpected Person field: ${k}`);
  ok(!/"(email|rank|role|stats)"/.test(JSON.stringify(ld)), "private/unmarked fields leaked into JSON-LD");
}

const mPaths = ["/", "/platform", "/women-in-esports", "/design-partner", "/pricing", "/teams", "/partnerships", "/about", "/contact", "/privacy", "/terms"];
const aPrivate = ["/dashboard", "/dashboard/profile", "/dashboard/team", "/onboarding", "/login", "/auth/callback", "/auth/signout", "/join/abc123", "/api/waitlist", "/api/handle-check"];
await auditSite(MARKETING, APP, mPaths, ["/api/waitlist", "/api/handle-check"]);
const appUrls = await auditSite(
  APP,
  MARKETING,
  LIVE ? ["/"] : ["/", "/mock_ace", "/dashboard_fan", "/mock_player_03", "/mock_player_04", "/mock_player_05"],
  aPrivate,
);
ok(!appUrls.some((u) => /demo_mock|leaderboard/.test(u.loc)), "demo profile or a leaderboard listed in sitemap");
if (!LIVE) {
// Opt-in only: profiles that never switched the toggle on must not be in the sitemap, even though they are viewable.
ok(!appUrls.some((u) => /mock_player_(0[6-9]|1[0-2])$/.test(u.loc)), "a profile that has not opted in to search is listed in the sitemap");
ok(appUrls.filter((u) => /\/(mock_|dashboard_fan)/.test(u.loc)).length === 5, `expected exactly 5 opted-in profiles in the sitemap, found ${appUrls.filter((u) => /\/(mock_|dashboard_fan)/.test(u.loc)).length}`);
{
  const r = await get(APP, "/mock_player_12");
  ok(r.status === 200, `opted-out profile must still be viewable by link, got ${r.status}`);
}
}
ok(!appUrls.some((u) => /\/(p[0-9a-f]{12})$/.test(u.loc)), "placeholder handle listed in sitemap");

console.log("\n######## PRIVATE ROUTES: noindex headers ########");
for (const [h, p] of [[APP, "/auth/callback"], [APP, "/login"], [APP, "/dashboard"], [APP, "/dashboard/stats"], [APP, "/onboarding"], [APP, "/join/abc123def"], [APP, "/api/handle-check?handle=abc"], [APP, "/api/waitlist"]]) {
  const r = await get(h, p);
  const x = r.headers["x-robots-tag"] ?? "";
  console.log(`   ${p.padEnd(34)} status ${r.status}  x-robots-tag: ${x || "(none)"}`);
  ok(/noindex/i.test(x) || /noindex/i.test(meta(r.body, "name", "robots") ?? ""), `no noindex signal on ${p}`);
}

console.log("\n######## STATUS CODES AND REDIRECTS ########");
const expectStatus = async (host, path, status, note = "") => {
  const r = await get(host, path);
  console.log(`   ${host}${path}  -> ${r.status}${r.headers.location ? "  location " + r.headers.location : ""} ${note}`);
  ok(r.status === status, `${host}${path} returned ${r.status}, expected ${status}`);
  return r;
};
// Naming decision: the initiative is "Women in Esports", never "Victress Women in Esports", in page text, titles and llms.txt.
{
  for (const path of ["/", "/women-in-esports", "/about", "/platform", "/design-partner", "/llms.txt"]) {
    const r = await get(MARKETING, path);
    ok(!/Victress Women in Esports/i.test(r.body), `${path} must not say "Victress Women in Esports"`);
  }
  const wp = (await get(MARKETING, "/women-in-esports")).body;
  ok(/<h1[^>]*>\s*Women in Esports\.\s*<\/h1>/.test(wp), "/women-in-esports: the page headline is exactly \"Women in Esports.\" with nothing above it");
}
const nf1 = await expectStatus(MARKETING, "/no-such-page", 404, "(marketing 404)");
ok(/Page not found/.test(nf1.body) && /<nav/.test(nf1.body) && /noindex/.test(nf1.body), "marketing 404 should have its own layout and noindex");
const nf2 = await expectStatus(APP, "/no-such-page-at-all/deeper", 404, "(app 404)");
ok(/No player or page here/.test(nf2.body) && /noindex/.test(nf2.body), "app 404 should have its own copy and noindex");
await expectStatus(APP, "/nobody_has_this_handle", 404, "(unknown handle)");
await expectStatus(APP, "/admin", 404, "(reserved handle)");
await expectStatus(APP, "/ab", 404, "(too short)");
await expectStatus(APP, "/pdeadbeef0001", 404, "(placeholder pattern)");
await expectStatus(APP, "/leaderboard/fortnite", 404, "(unknown game board)");
if (!LIVE) await expectStatus(APP, "/mock_ace", 200, "(a taken handle is a profile page, so 200)");
await expectStatus(MARKETING, "/m/pricing", 404, "(internal prefix)");
await expectStatus(APP, "/a/login", 404, "(internal prefix)");
await expectStatus(MARKETING, "/__site/app", 404, "(preview hop is dead on production)");
for (const [h, p] of [[`www.${MARKETING}`, "/pricing?x=1"], [`www.${APP}`, LIVE ? "/leaderboard/valorant" : "/mock_ace"], [`www.${MARKETING}`, "/sitemap.xml"], [`www.${APP}`, "/robots.txt"], [`www.${APP}`, "/"]]) {
  const r = await get(h, p);
  const want = `https://${h.replace("www.", "")}${p}`;
  console.log(`   ${h}${p}  -> ${r.status}  location ${r.headers.location}`);
  // The bare root may come back with or without the trailing slash; both are the same URL.
  ok(r.status === 308 && (r.headers.location === want || (p === "/" && r.headers.location === want.replace(/\/$/, ""))), `www redirect: got ${r.status} ${r.headers.location}, want 308 ${want}`);
}

console.log("\n######## ICONS AND MANIFEST ########");
{
  const home = (await get(MARKETING, "/")).body;
  ok(/<link rel="icon" href="\/favicon\.ico[^"]*"/.test(home), "favicon.ico link missing");
  ok(/<link rel="icon" href="\/icon\.png[^"]*"[^>]*sizes="32x32"/.test(home), "32x32 PNG icon link missing");
  ok(!/icon\.svg/.test(home), "the old V svg icon is still referenced");
  ok(/<link rel="apple-touch-icon" href="\/apple-icon\.png[^"]*"[^>]*sizes="180x180"/.test(home), "apple-touch-icon link missing");
  ok(/<link rel="manifest" href="\/manifest\.webmanifest"/.test(home), "manifest link missing");
  ok(/<meta name="theme-color" content="#171717"/.test(home), "theme-color missing");

  const ico = await get(MARKETING, "/favicon.ico");
  const n = ico.buf.readUInt16LE(4);
  const frames = Array.from({ length: n }, (_, i) => ico.buf[6 + 16 * i] || 256).sort((a, b) => a - b);
  console.log(`   favicon.ico frames: ${frames.join(", ")} px`);
  ok(ico.status === 200 && JSON.stringify(frames) === JSON.stringify([16, 32, 48]), `favicon.ico frames ${frames}, expected 16, 32, 48`);

  const { default: sharp } = await import("sharp");
  const apple = await get(MARKETING, "/apple-icon.png");
  const raw = await sharp(apple.buf).raw().toBuffer();
  const meta2 = await sharp(apple.buf).metadata();
  console.log(`   apple-icon: ${meta2.width}x${meta2.height}, corner alpha ${raw[3]}`);
  ok(meta2.width === 180 && meta2.height === 180 && raw[3] === 255, "apple-touch icon must be 180x180 with opaque corners");

  const man = JSON.parse((await get(MARKETING, "/manifest.webmanifest")).body);
  console.log("   manifest icons:", man.icons.map((i) => `${i.sizes} ${i.purpose ?? "any"}`).join(" | "));
  ok(man.icons.some((i) => i.purpose === "maskable" && i.sizes === "512x512"), "manifest has no maskable 512 icon");
  ok(man.icons.some((i) => i.sizes === "192x192") && man.icons.some((i) => i.sizes === "512x512" && i.purpose === "any"), "manifest missing 192 / 512 icons");
  ok(!/competitive edge|Your stats\. Your profile/.test(JSON.stringify(man)), "manifest contains the retired secondary slogan");
  for (const i of man.icons) ok((await get(MARKETING, i.src)).status === 200, `manifest icon ${i.src} does not load`);
}

console.log("\n######## HOME FAQ, PRODUCT SCHEMA, llms.txt ########");
{
  const home = (await get(MARKETING, "/")).body;
  const pricing = (await get(MARKETING, "/pricing")).body;
  const ld = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  ok(!ld.some((d) => d["@type"] === "FAQPage"), "the home page no longer carries a FAQPage (it has no FAQ section)");
  const pricingFaq = [...pricing.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((d) => d["@type"] === "FAQPage");
  ok(!!pricingFaq && pricingFaq.mainEntity.length >= 3, "the pricing page keeps its FAQPage");
  const app = ld.flatMap((d) => d["@graph"] ?? []).find((n) => n["@type"] === "WebApplication");
  console.log(`   WebApplication: ${app?.url}, offers ${JSON.stringify(app?.offers)}`);
  ok(app?.url === "https://victress.gg" && app.offers.price === "0", "WebApplication should point at victress.gg and only offer the free plan");

  const llms = await get(MARKETING, "/llms.txt");
  console.log(`   /llms.txt -> ${llms.status} ${llms.headers["content-type"]}, ${llms.body.length} chars`);
  ok(llms.status === 200 && /text\/plain/.test(llms.headers["content-type"] ?? ""), "llms.txt should be 200 text/plain");
  ok(!/turn practice into progress/i.test(llms.body.slice(0, 600)) && /esports player development and recruitment platform/i.test(llms.body.slice(0, 300)), "llms.txt must open with the plain description, not the tagline");
  ok(/Coming soon/.test(llms.body) && !/Self-reported|self reported/i.test(llms.body) && /private by default and are not indexed by search engines/.test(llms.body), "llms.txt must label unbuilt items Coming soon, mention no self-reported stats and state the profile privacy rule");
  ok(!/Perform\. Compete|performance into progress|Your stats\. Your profile|ounding club|privacy-friendly analytics/.test(llms.body), "llms.txt contains a retired slogan or an unapproved claim");
  // Structure: Women in Esports has its own "Why Victress exists" section, Player Resume is stated as available now, no internal references.
  const section = (name) => llms.body.split(/^## /m).find((s) => s.startsWith(name + "\n")) ?? "";
  const headings = [...llms.body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  console.log(`   /llms.txt sections: ${headings.join(" | ")}`);
  ok(headings[0] === "Why Victress exists", `llms.txt: "Why Victress exists" should be the first section, got "${headings[0]}"`);
  ok(/Women in Esports/.test(section("Why Victress exists")) && !/Victress Women in Esports/.test(llms.body), "llms.txt: the Why Victress exists section must contain Women in Esports (never Victress Women in Esports)");
  ok(/Scrim Intelligence[^\n]*Coming soon/.test(llms.body) && /Scout Desk[^\n]*Coming soon/.test(llms.body), "llms.txt: Scrim Intelligence and Scout Desk each carry one Coming soon label");
  ok(!/strategy section|docs\/strategy/i.test(llms.body), "llms.txt must not refer to the internal strategy document");
  ok((await get(APP, "/llms.txt")).status === 404, "llms.txt should not be served on the application domain");
  const robots = parseRobots((await get(MARKETING, "/robots.txt")).body);
  ok(!robots.blocked("/llms.txt"), "robots.txt blocks /llms.txt");
}

console.log("\n######## DOMAIN SEPARATION ########");
for (const [h, p] of [[APP, "/pricing"], [APP, "/teams"], [APP, "/about"], [APP, "/privacy"], [APP, "/terms"], [MARKETING, "/login"], [MARKETING, "/dashboard"], [MARKETING, "/leaderboard/valorant"]]) {
  const r = await get(h, p);
  console.log(`   ${h}${p} -> ${r.status}`);
  ok(r.status === 404, `${h}${p} should be 404 (no duplicate of the other domain's pages), got ${r.status}`);
}
{
  // the application domain must never be the marketing home's canonical or og:url
  const home = (await get(MARKETING, "/")).body;
  ok(!/victress\.gg/.test((home.match(/<link rel="canonical"[^>]*>/) ?? [""])[0]), "marketing home canonical points at victress.gg");
  ok(!/victress\.gg/.test(meta(home, "property", "og:url") ?? ""), "marketing home og:url points at victress.gg");
}


console.log("\n######## STATUS WORDING, SELF-ENTERED STATS AND THE HOME HERO ########");
{
  // Founder decisions, 2026-11-07. (1) No status language anywhere: pages say what Victress is and does in plain present tense; an
  // unbuilt item carries one plain "Coming soon" label. (2) Victress does not publish stats players enter themselves.
  const FORBIDDEN = [/in development/i, /under development/i, /being built/i, /\bbeta\b/i, /\bearly\b/i, /pilot stage/i, /pilot phase/i, /initial pilot/i, /\bplanned\b/i, /work in progress/i, /not available yet/i, /not open yet/i, /not built/i, /in testing/i, /available now/i];
  const STATS = [/self[- ]reported/i, /your own stats/i, /enter your (own )?stats/i, /add (your )?stats/i, /stats you (enter|made)/i, /every number shows where it came from/i, /entered by players/i];
  // content/pricing.ts holds founder approved verbatim plan text that still says "Track your stats, share your progress" and "share it with teams".
  // It is reported below as a known conflict and not edited without approval.
  const KNOWN_PRICING = /Track your stats, share your progress[^.]*\.|share it with teams/gi;
  const visibleText = (html) => decode(html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  const sources = [];
  for (const host of [MARKETING, APP]) {
    for (const path of host === MARKETING ? mPaths : ["/", "/login"]) sources.push([`${host}${path}`, (await get(host, path)).body]);
  }
  const llmsBody = (await get(MARKETING, "/llms.txt")).body;
  let knownPricing = 0;
  for (const [label, html] of [...sources, ["llms.txt", llmsBody]]) {
    const raw = label === "llms.txt" ? llmsBody : visibleText(html);
    if (/pricing/.test(label)) knownPricing += (raw.match(KNOWN_PRICING) ?? []).length;
    const text = raw.replace(KNOWN_PRICING, " ");
    const jsonld = label === "llms.txt" ? "" : [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join(" ").replace(/"slogan":"[^"]*"/g, "");
    for (const re of FORBIDDEN) ok(!re.test(text) && !re.test(jsonld), `${label} contains status wording ${re}`);
    for (const re of STATS) ok(!re.test(text) && !re.test(jsonld), `${label} mentions stats players enter ${re}`);
  }
  if (knownPricing) console.log(`   KNOWN CONFLICT (not a failure): ${knownPricing} approved verbatim pricing phrase(s) in content/pricing.ts mention players tracking or sharing stats. Needs the founder's approval to change.`);

  // Public profile pages show no self-entered stat, even for a player whose record holds stats and who listed everything (mock data).
  if (!LIVE) {
    for (const path of ["/mock_ace", "/dashboard_fan", "/mock_player_03"]) {
      const r = await get(APP, path);
      if (r.status !== 200) continue;
      const t = visibleText(r.body);
      ok(!/self[- ]reported|average combat score|\bACS\b|K\/D|win rate|premier rating|\bADR\b/i.test(t), `${APP}${path} shows a stat`);
      ok(!/"(metrics|stat|stats)"/i.test(r.body.replace(/<script[^>]*>[\s\S]*?<\/script>/g, "")) , `${APP}${path} carries stat data in the page`);
    }
  }

  // The same rules for emails, social cards, email sending code and the sitemap/profile code that run outside the pages.
  const { readFileSync, readdirSync } = await import("node:fs");
  const files = [...readdirSync("emails").map((f) => `emails/${f}`), "app/api/og/route.tsx", "lib/email.ts"];
  for (const f of files) {
    const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, " ");
    for (const re of FORBIDDEN) ok(!re.test(src), `${f} contains status wording ${re}`);
    for (const re of STATS) ok(!re.test(src), `${f} mentions stats players enter ${re}`);
  }

  // Home: one idea above the fold. The headline is the only place the tagline appears; ONE button; a labeled sample; no secondary actions.
  const home = (await get(MARKETING, "/")).body;
  const text = visibleText(home);
  ok((text.match(/turn practice into progress/gi) ?? []).length === 1, "the tagline must appear exactly once on the home page (the headline)");
  ok((home.match(/<h1[\s>]/g) ?? []).length === 1 && /<h1[^>]*>\s*Turn practice into progress\.\s*<\/h1>/.test(home), "the home page has one h1: the tagline");
  const hero = home.slice(home.indexOf("<section"), home.indexOf("</section>"));
  const heroLinks = [...hero.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => m[1]);
  ok(heroLinks.length === 1 && heroLinks[0] === "/design-partner", `the hero has exactly one link, to /design-partner (found ${JSON.stringify(heroLinks)})`);
  ok(!/<button\b/.test(hero), "the hero has no buttons besides the one link");
  ok(/Sample/.test(hero) && /Free 4 to 6 week pilot for one competitive team\./.test(hero), "the hero shows the sample label and the one small line under the button");
  ok(!/\b(badge|counter)\b/i.test(hero), "the hero has no badges or counters");
  const header = home.slice(home.indexOf("<header"), home.indexOf("</header>"));
  const navCtas = [...header.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>\s*Sign up\s*<\/a>/g)].map((m) => m[1]);
  ok(navCtas.length >= 1 && navCtas.every((h) => /^https:\/\/victress\.gg/.test(h) || /__site\/app/.test(h)), `the nav has a Sign up button that goes to victress.gg (found ${JSON.stringify(navCtas)})`);
  ok(!/Become a Design Partner/.test(header) && !/href="\/design-partner"/.test(header), "the nav does not repeat the hero action (Become a Design Partner)");
  const order = ["Three products.", "How it works.", "The design partner pilot."].map((t) => home.indexOf(t));
  ok(order.every((i) => i > 0) && order[0] < order[1] && order[1] < order[2] && home.lastIndexOf("Become a Design Partner") > order[2], "below the fold the sections run in order: products, how it works, the pilot, one closing button");
}

console.log(`\n${checks} checks run, ${failures} failed${LIVE ? " (live production)" : ""}`);
console.log(failures === 0 ? "ALL SEO CHECKS PASSED" : failures + " CHECK(S) FAILED");
process.exit(failures === 0 ? 0 : 1);
