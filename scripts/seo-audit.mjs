// SEO audit against a running server. Sends each request with a production Host header so both domains are checked.
//   node scripts/seo-audit.mjs [port]          (default 3200)
// Checks: titles and descriptions (length, unique), canonical, Open Graph, Twitter, robots/noindex, headings, images,
// JSON-LD, status codes, redirects, and that robots.txt and sitemap.xml agree with each other.
import http from "node:http";

const PORT = Number(process.argv[2]) || 3200;
const MARKETING = "victressesports.com";
const APP = "victress.gg";

function get(host, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: PORT, path, headers: { host, ...headers } }, (res) => {
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
const fail = (msg) => {
  failures++;
  console.log("   FAIL", msg);
};
const ok = (cond, msg) => (cond ? true : (fail(msg), false));

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

async function auditPage({ host, path, index, types = [], og = true }) {
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
  if (seen.title.has(title)) fail(`title duplicates ${seen.title.get(title)}`);
  else seen.title.set(title, label);
  if (seen.desc.has(desc)) fail(`description duplicates ${seen.desc.get(desc)}`);
  else seen.desc.set(desc, label);

  const robotsMeta = meta(html, "name", "robots") ?? "";
  const xrt = res.headers["x-robots-tag"] ?? "";
  if (index) ok(!/noindex/i.test(robotsMeta + xrt), `indexable page is noindex (${robotsMeta} ${xrt})`);
  else ok(/noindex/i.test(robotsMeta + xrt), "private page is NOT noindex");

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
  mk(MARKETING, "/", true, ["Organization", "WebSite"]),
  mk(MARKETING, "/pricing", true, ["FAQPage", "BreadcrumbList"]),
  mk(MARKETING, "/teams", true, ["BreadcrumbList"]),
  mk(MARKETING, "/about", true, ["BreadcrumbList"]),
  mk(MARKETING, "/privacy", true, ["BreadcrumbList"]),
  mk(MARKETING, "/terms", true, ["BreadcrumbList"]),
  mk(APP, "/", true),
  mk(APP, "/leaderboard/valorant", true, ["BreadcrumbList"]),
  mk(APP, "/leaderboard/rocket-league", false, ["BreadcrumbList"]),
  mk(APP, "/mock_ace", true, ["ProfilePage", "Person"]),
  mk(APP, "/dashboard_fan", true, ["ProfilePage"]),
  mk(APP, "/demo_mock", false),
  mk(APP, "/login", false),
];
for (const p of pages) await auditPage(p);

console.log("\n######## PROFILE JSON-LD: only public fields ########");
{
  const html = (await get(APP, "/mock_ace")).body;
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  console.log(JSON.stringify(ld, null, 2));
  const allowed = new Set(["@type", "@id", "name", "alternateName", "url", "image", "description", "memberOf", "knowsAbout"]);
  for (const k of Object.keys(ld.mainEntity)) ok(allowed.has(k), `unexpected Person field: ${k}`);
  ok(!/"(email|rank|role|stats)"/.test(JSON.stringify(ld)), "private/unmarked fields leaked into JSON-LD");
}

const mPaths = ["/", "/pricing", "/teams", "/about", "/privacy", "/terms"];
const aPrivate = ["/dashboard", "/dashboard/profile", "/dashboard/stats", "/dashboard/team", "/onboarding", "/login", "/auth/callback", "/auth/signout", "/join/abc123", "/api/waitlist", "/api/handle-check"];
await auditSite(MARKETING, APP, mPaths, ["/api/waitlist", "/api/handle-check"]);
const appUrls = await auditSite(APP, MARKETING, ["/", "/mock_ace", "/dashboard_fan", "/leaderboard/valorant", "/leaderboard/cs2"], aPrivate);
ok(!appUrls.some((u) => /demo_mock|leaderboard\/rocket-league/.test(u.loc)), "demo profile or closed board listed in sitemap");
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
const nf1 = await expectStatus(MARKETING, "/no-such-page", 404, "(marketing 404)");
ok(/Page not found/.test(nf1.body) && /<nav/.test(nf1.body) && /noindex/.test(nf1.body), "marketing 404 should have its own layout and noindex");
const nf2 = await expectStatus(APP, "/no-such-page-at-all/deeper", 404, "(app 404)");
ok(/No player or page here/.test(nf2.body) && /noindex/.test(nf2.body), "app 404 should have its own copy and noindex");
await expectStatus(APP, "/nobody_has_this_handle", 404, "(unknown handle)");
await expectStatus(APP, "/admin", 404, "(reserved handle)");
await expectStatus(APP, "/ab", 404, "(too short)");
await expectStatus(APP, "/pdeadbeef0001", 404, "(placeholder pattern)");
await expectStatus(APP, "/leaderboard/fortnite", 404, "(unknown game board)");
await expectStatus(APP, "/mock_ace", 200, "(a taken handle is a profile page, so 200)");
await expectStatus(MARKETING, "/m/pricing", 404, "(internal prefix)");
await expectStatus(APP, "/a/login", 404, "(internal prefix)");
await expectStatus(MARKETING, "/__site/app", 404, "(preview hop is dead on production)");
for (const [h, p] of [[`www.${MARKETING}`, "/pricing?x=1"], [`www.${APP}`, "/mock_ace"], [`www.${MARKETING}`, "/sitemap.xml"], [`www.${APP}`, "/robots.txt"], [`www.${APP}`, "/"]]) {
  const r = await get(h, p);
  const want = `https://${h.replace("www.", "")}${p}`;
  console.log(`   ${h}${p}  -> ${r.status}  location ${r.headers.location}`);
  // The bare root may come back with or without the trailing slash; both are the same URL.
  ok(r.status === 308 && (r.headers.location === want || (p === "/" && r.headers.location === want.replace(/\/$/, ""))), `www redirect: got ${r.status} ${r.headers.location}, want 308 ${want}`);
}

console.log(`\n${failures === 0 ? "ALL SEO CHECKS PASSED" : failures + " CHECK(S) FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
