// Guards the Supabase environment handling (next.config.ts, lib/supabase/env.ts). Builds the app twice into the real .next
// folder, so run it when you are not serving from .next. Test tooling only; touches no real database.
//   node scripts/env-test.mjs
// 1. Only SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY set (no NEXT_PUBLIC names): the build works, the URL and
//    anon key reach the browser bundle, and the service role value appears in NO file under .next (client, server or edge).
// 2. No Supabase variables at all: the build stops with the clear message.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const base = { ...process.env };
for (const k of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SKIP_SUPABASE_ENV_CHECK"]) delete base[k];
const build = (env) => spawnSync("npx", ["next", "build"], { env: { ...base, ...env }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (s.size < 20 * 1024 * 1024) out.push(p);
  }
  return out;
}
const filesWith = (needle, dir) => walk(dir).filter((f) => { try { return readFileSync(f).includes(needle); } catch { return false; } });

const URL_MARK = "https://envtestmarker.supabase.co";
const ANON_MARK = "anon-marker-ENVTEST-7Q2";
const SERVICE_MARK = "SERVICE-SECRET-MARKER-ENVTEST-9Z";

const a = build({ SUPABASE_URL: URL_MARK, SUPABASE_ANON_KEY: ANON_MARK, SUPABASE_SERVICE_ROLE_KEY: SERVICE_MARK });
check(a.status === 0, "build works with only SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY");
if (a.status === 0) {
  check(filesWith(URL_MARK, ".next/static").length > 0, "the Supabase URL reaches the browser bundle (public by design)");
  check(filesWith(ANON_MARK, ".next/static").length > 0, "the anon key reaches the browser bundle (public by design)");
  check(filesWith(SERVICE_MARK, ".next").length === 0, "the service role value appears in NO file under .next (client, server or edge)");
  check(filesWith("SUPABASE_SERVICE_ROLE_KEY", ".next/static").length === 0, "the service role variable name is not in any client file");
} else console.log(a.stdout.slice(-1500), a.stderr.slice(-1500));

const b = build({});
check(b.status !== 0 && /Build stopped: SUPABASE_URL and SUPABASE_ANON_KEY are not set/.test(b.stdout + b.stderr), "a build with no Supabase variables stops with the clear message");

console.log(failed ? `\n${failed} ENV CHECK(S) FAILED` : "\nALL ENV CHECKS PASSED");
process.exit(failed ? 1 : 0);
