// Which address links use: Production unchanged, Previews on the stable branch address. Loads lib/urls.ts in a fresh process per case,
// with only the given environment, so the module level constants are evaluated as on Vercel. No network, no build.
//   node scripts/urls-test.mjs
import { execFileSync } from "node:child_process";

let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const probe = `import("./lib/urls.ts").then((u) => console.log(JSON.stringify({ preview: u.IS_PREVIEW, app: u.APP_URL, mkt: u.MARKETING_URL,
  claim: u.appUrl("/claim?from=card"), link: u.appUrl("/dashboard/link/discord/CODE"), market: u.marketingUrl("/privacy"), form: u.appFormAction("/login") })))`;
const run = (env) => JSON.parse(execFileSync(process.execPath, ["--no-warnings", "--input-type=module", "-e", probe], { env: { PATH: process.env.PATH, ...env }, encoding: "utf8" }));

const BRANCH = "victress-git-claude-wizardl-6d3298-matt-hills-projects-54d303a1.vercel.app";
const DEPLOY = "victress-abc123xyz-matt-hills-projects-54d303a1.vercel.app";

// Production: Vercel sets both addresses, but they are ignored.
let r = run({ NEXT_PUBLIC_VERCEL_ENV: "production", NEXT_PUBLIC_VERCEL_BRANCH_URL: BRANCH, NEXT_PUBLIC_VERCEL_URL: DEPLOY });
check(!r.preview && r.app === "https://victress.gg" && r.mkt === "https://victressesports.com", "production: victress.gg and victressesports.com, never a vercel.app address");
check(r.claim === "https://victress.gg/claim?from=card" && r.link === "https://victress.gg/dashboard/link/discord/CODE" && r.market === "https://victressesports.com/privacy" && r.form === "https://victress.gg/login", "production: claim, Discord link, marketing and form addresses are unchanged");
r = run({ NEXT_PUBLIC_VERCEL_ENV: "production", NEXT_PUBLIC_APP_URL: "https://app.example.test", NEXT_PUBLIC_MARKETING_URL: "https://www.example.test" });
check(r.app === "https://app.example.test" && r.mkt === "https://www.example.test", "production: the NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_MARKETING_URL overrides still apply");

// Preview: the branch address wins over the per-deployment address.
r = run({ NEXT_PUBLIC_VERCEL_ENV: "preview", NEXT_PUBLIC_VERCEL_BRANCH_URL: BRANCH, NEXT_PUBLIC_VERCEL_URL: DEPLOY });
check(r.preview && r.app === `https://${BRANCH}` && r.mkt === `https://${BRANCH}`, "preview: both sites use the stable branch address, not the per-deployment one");
check(r.claim === `https://${BRANCH}/__site/app?to=${encodeURIComponent("/claim?from=card")}`, "preview: the claim button goes to the branch address through the app hop");
check(r.link === `https://${BRANCH}/__site/app?to=${encodeURIComponent("/dashboard/link/discord/CODE")}`, "preview: the Discord /link link goes to the branch address through the app hop");
check(!JSON.stringify(r).includes(DEPLOY), "preview: the per-deployment address appears nowhere");
// Preview without a branch address (for example a deployment not made from a Git branch): fall back to the deployment address.
r = run({ NEXT_PUBLIC_VERCEL_ENV: "preview", NEXT_PUBLIC_VERCEL_URL: DEPLOY });
check(r.preview && r.app === `https://${DEPLOY}`, "preview without a branch address: falls back to the deployment address");
// Local: no Vercel variables.
r = run({});
check(!r.preview && r.app === "https://victress.gg" && r.claim === "https://victress.gg/claim?from=card", "local: defaults, no preview hop");

// Every link the loop sends goes through lib/urls.ts, and the verification callbacks return to their configured (branch) address.
const { readFileSync } = await import("node:fs");
const route = readFileSync("app/api/discord/interactions/route.ts", "utf8");
check(/claimUrl: appLink\("\/claim\?from=card"\)/.test(route) && /linkUrl: \(_base: string, code: string\) => appLink\(linkUrl\("", code\)\)/.test(route) && /appUrl: APP_URL/.test(route), "Discord: the claim button, /link and other links are built from lib/urls.ts");
const steamCb = readFileSync("app/a/dashboard/link/steam/callback/route.ts", "utf8"), epicCb = readFileSync("app/a/dashboard/link/epic/callback/route.ts", "utf8");
check(/new URL\(cfg\.returnUrl\)\.origin/.test(steamCb) && /new URL\(cfg\.redirectUri\)\.origin/.test(epicCb), "Steam and Epic return the player to the origin of their configured callback (the branch address on the Preview)");
console.log(failed ? `\n${failed} FAILED` : "\nAll URL checks passed.");
process.exit(failed ? 1 : 0);
