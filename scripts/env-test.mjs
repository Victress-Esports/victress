// Guards the Supabase environment handling (next.config.ts, lib/supabase/resolve-env.ts, lib/supabase-admin.ts).
//   node scripts/env-test.mjs
// Builds the app several times into the real .next folder, so run it when you are not serving from .next.
// Test tooling only; touches no real database. Part 1 unit tests the resolver; part 2 builds and inspects the built files.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const ts = createRequire(import.meta.url)("typescript");
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };

// ---------------------------------------------------------------- 1. the resolver
const dir = mkdtempSync(join(tmpdir(), "resolve-env-"));
const src = readFileSync("lib/supabase/resolve-env.ts", "utf8");
writeFileSync(join(dir, "resolve-env.mjs"), ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
const { resolveSupabaseEnv, PRODUCTION_PROJECT_REF, STAGING_PROJECT_REF } = await import(pathToFileURL(join(dir, "resolve-env.mjs")).href);

const PROD = { SUPABASE_URL: "https://prod.supabase.co", SUPABASE_ANON_KEY: "prod-anon", SUPABASE_SERVICE_ROLE_KEY: "prod-service" };
const STAGE = { STAGING_SUPABASE_URL: "https://stage.supabase.co", STAGING_SUPABASE_ANON_KEY: "stage-anon", STAGING_SUPABASE_SERVICE_ROLE_KEY: "stage-service" };

let r = resolveSupabaseEnv({ VERCEL_ENV: "production", ...PROD, ...STAGE });
check(r.mode === "production" && r.url === PROD.SUPABASE_URL && r.anonKey === "prod-anon" && r.serviceRoleKey === "prod-service" && r.errors.length === 0, "production reads the SUPABASE_ trio and ignores the STAGING_ trio");
r = resolveSupabaseEnv({ VERCEL_ENV: "preview", ...STAGE, ...PROD });
check(r.mode === "preview" && r.url === STAGE.STAGING_SUPABASE_URL && r.anonKey === "stage-anon" && r.serviceRoleKey === "stage-service" && r.errors.length === 0, "preview reads the STAGING_ trio even when the production trio is also set");
r = resolveSupabaseEnv({ VERCEL_ENV: "preview", ...PROD });
check(r.errors.length > 0 && !r.url && !r.anonKey && !r.serviceRoleKey && /STAGING_SUPABASE_URL/.test(r.errors.join(" ")) && /never falls back to the production/.test(r.errors.join(" ")), "preview with no STAGING_ values fails and returns NO production values");
r = resolveSupabaseEnv({ VERCEL_ENV: "preview", ...STAGE, STAGING_SUPABASE_SERVICE_ROLE_KEY: undefined, ...PROD });
check(r.errors.some((e) => /STAGING_SUPABASE_SERVICE_ROLE_KEY/.test(e)) && r.serviceRoleKey === undefined, "preview without the STAGING_ service role key fails and does not use the production one");
r = resolveSupabaseEnv({ VERCEL_ENV: "preview", STAGING_SUPABASE_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co`, STAGING_SUPABASE_ANON_KEY: "a", STAGING_SUPABASE_SERVICE_ROLE_KEY: "s" });
check(r.errors.some((e) => /PRODUCTION Supabase project/.test(e)), "a preview whose STAGING_ URL is the production project is refused");
r = resolveSupabaseEnv({ VERCEL_ENV: "preview", ...STAGE, SUPABASE_URL: STAGE.STAGING_SUPABASE_URL });
check(r.errors.some((e) => /equals SUPABASE_URL/.test(e)), "a preview whose URL equals SUPABASE_URL is refused");
r = resolveSupabaseEnv({ VERCEL_ENV: "production", SUPABASE_URL: `https://${STAGING_PROJECT_REF}.supabase.co`, SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "s" });
check(r.errors.some((e) => /STAGING Supabase project/.test(e)), "a production deployment pointing at the staging project is refused");
r = resolveSupabaseEnv({ VERCEL_ENV: "production", ...STAGE });
check(r.errors.length > 0 && !r.url && !r.serviceRoleKey, "production with only the STAGING_ trio fails and uses none of it");
r = resolveSupabaseEnv({ VERCEL: "1", ...PROD, ...STAGE });
check(r.errors.some((e) => /VERCEL_ENV is not available/.test(e)), "on Vercel without VERCEL_ENV it fails and says how to fix it");
r = resolveSupabaseEnv({ ...STAGE, ...PROD });
check(r.mode === "local" && r.url === STAGE.STAGING_SUPABASE_URL && r.serviceRoleKey === "stage-service", "local with the STAGING_ trio runs against staging (not production)");
r = resolveSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:4010", NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock", SUPABASE_SERVICE_ROLE_KEY: "mock-service" });
check(r.mode === "local" && r.url === "http://127.0.0.1:4010" && r.serviceRoleKey === "mock-service" && r.errors.length === 0, "local mock scripts keep working with the NEXT_PUBLIC_ pair");
r = resolveSupabaseEnv({ SUPABASE_URL: PROD.SUPABASE_URL, SUPABASE_ANON_KEY: "prod-anon" });
check(r.errors.length > 0 && !r.url, "local ignores SUPABASE_URL (production names), so a stray production value is never used locally");

// ---------------------------------------------------------------- 2. real builds
const base = { ...process.env };
for (const k of Object.keys(base)) if (/SUPABASE|^VERCEL|^SKIP_SUPABASE/.test(k)) delete base[k];
const build = (env) => spawnSync("npx", ["next", "build"], { env: { ...base, ...env }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
function walk(d, out = []) { for (const f of readdirSync(d)) { const p = join(d, f); const s = statSync(p); if (s.isDirectory()) walk(p, out); else if (s.size < 20 * 1024 * 1024) out.push(p); } return out; }
const filesWith = (needle, d) => walk(d).filter((f) => { try { return readFileSync(f).includes(needle); } catch { return false; } });

const M = {
  prodUrl: "https://prodmarkerenvtest.supabase.co", prodAnon: "anon-PROD-MARKER-7Q2", prodSvc: "SERVICE-PROD-MARKER-9Z",
  stageUrl: "https://stagemarkerenvtest.supabase.co", stageAnon: "anon-STAGE-MARKER-4K8", stageSvc: "SERVICE-STAGE-MARKER-3X",
};
const PRODV = { SUPABASE_URL: M.prodUrl, SUPABASE_ANON_KEY: M.prodAnon, SUPABASE_SERVICE_ROLE_KEY: M.prodSvc };
const STAGEV = { STAGING_SUPABASE_URL: M.stageUrl, STAGING_SUPABASE_ANON_KEY: M.stageAnon, STAGING_SUPABASE_SERVICE_ROLE_KEY: M.stageSvc };

function inspect(label, usedUrl, usedAnon, otherUrl, otherAnon) {
  check(filesWith(usedUrl, ".next/static").length > 0, `${label}: the right project URL reaches the browser bundle (public by design)`);
  check(filesWith(usedAnon, ".next/static").length > 0, `${label}: the right anon key reaches the browser bundle (public by design)`);
  check(filesWith(otherUrl, ".next").length === 0 && filesWith(otherAnon, ".next").length === 0, `${label}: the OTHER environment's URL and anon key appear in no built file`);
  check(filesWith(M.prodSvc, ".next").length === 0 && filesWith(M.stageSvc, ".next").length === 0, `${label}: neither service role value appears in ANY built file (client, server or edge)`);
  check(filesWith("SUPABASE_SERVICE_ROLE_KEY", ".next/static").length === 0, `${label}: the service role variable name is not in any client file`);
}

let b = build({ VERCEL_ENV: "production", ...PRODV, ...STAGEV });
check(b.status === 0, "production build (VERCEL_ENV=production) works with the SUPABASE_ trio, with the STAGING_ trio also present");
if (b.status === 0) inspect("production build", M.prodUrl, M.prodAnon, M.stageUrl, M.stageAnon); else console.log((b.stdout + b.stderr).slice(-1500));

b = build({ VERCEL_ENV: "preview", ...STAGEV, ...PRODV });
check(b.status === 0, "preview build (VERCEL_ENV=preview) works with the STAGING_ trio, with the production trio also present");
if (b.status === 0) inspect("preview build", M.stageUrl, M.stageAnon, M.prodUrl, M.prodAnon); else console.log((b.stdout + b.stderr).slice(-1500));

const out = (r) => r.stdout + r.stderr;
b = build({ VERCEL_ENV: "preview", ...PRODV });
check(b.status !== 0 && /STAGING_SUPABASE_URL/.test(out(b)) && /never falls back to the production/.test(out(b)), "preview build with no STAGING_ values FAILS loudly and does not fall back to production");
b = build({ VERCEL_ENV: "preview", ...STAGEV, STAGING_SUPABASE_SERVICE_ROLE_KEY: "", ...PRODV });
check(b.status !== 0 && /STAGING_SUPABASE_SERVICE_ROLE_KEY/.test(out(b)), "preview build without the STAGING_ service role key FAILS");
b = build({ VERCEL_ENV: "preview", STAGING_SUPABASE_URL: "https://pmamceqshyfptvjgimsf.supabase.co", STAGING_SUPABASE_ANON_KEY: "a", STAGING_SUPABASE_SERVICE_ROLE_KEY: "s" });
check(b.status !== 0 && /PRODUCTION Supabase project/.test(out(b)), "preview build pointing at the production project FAILS");
b = build({ VERCEL_ENV: "production" });
check(b.status !== 0 && /SUPABASE_URL/.test(out(b)) && /Production/.test(out(b)), "production build with no variables FAILS with a clear message");
b = build({ VERCEL: "1", ...PRODV });
check(b.status !== 0 && /VERCEL_ENV is not available/.test(out(b)), "a Vercel build without VERCEL_ENV FAILS and explains how to fix it");

b = build({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:4010", NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock" });
check(b.status === 0, "local build with the NEXT_PUBLIC_ pair (mock scripts) works");
b = build({ ...STAGEV });
check(b.status === 0 && filesWith(M.stageUrl, ".next/static").length > 0 && filesWith(M.stageSvc, ".next").length === 0, "local build against staging (STAGING_ trio) works and keeps the service role value out of every built file");
b = build({});
check(b.status !== 0 && /Build stopped/.test(out(b)), "local build with no Supabase variables stops with a clear message");

console.log(failed ? `\n${failed} ENV CHECK(S) FAILED` : "\nALL ENV CHECKS PASSED");
process.exit(failed ? 1 : 0);
