// Unit checks for lib/funnel.ts with a stubbed database.  node scripts/funnel-unit-test.mjs
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const ts = createRequire(import.meta.url)("typescript");
const dir = mkdtempSync(join(tmpdir(), "funnel-"));
const tr = (f) => ts.transpileModule(readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
writeFileSync(join(dir, "db-errors.mjs"), tr("lib/db-errors.ts"));
writeFileSync(join(dir, "admin.mjs"), "export const supabaseAdmin = () => globalThis.__admin;");
writeFileSync(join(dir, "funnel.mjs"), tr("lib/funnel.ts").replace('import "server-only";', "").replace('"@/lib/db-errors"', '"./db-errors.mjs"').replace('"@/lib/supabase-admin"', '"./admin.mjs"'));
const f = await import(pathToFileURL(join(dir, "funnel.mjs")).href);
let failed = 0;
const check = (ok, n) => { console.log(`${ok ? "PASS" : "FAIL"} ${n}`); if (!ok) failed++; };
const errors = []; const origErr = console.error; console.error = (...a) => errors.push(a.join(" "));
const calls = [];
globalThis.__admin = { from: (t) => ({ insert: async (row) => { calls.push([t, row]); return { error: globalThis.__err ?? null }; } }) };

await f.recordFunnelEvent("registration_started", null, { method: "email", email: "a@b.co", game: "CS2", extra: 1 });
check(calls.length === 1 && calls[0][0] === "funnel_events" && JSON.stringify(calls[0][1]) === '{"name":"registration_started","profile_id":null,"props":{"method":"email"}}', "props are reduced to the allowed keys and values");
calls.length = 0;
const today = new Date().toISOString();
await f.recordReturnVisit("u1", today);
check(calls.length === 0, "no return visit on the day the account was created");
await f.recordReturnVisit("u1", undefined);
check(calls.length === 0, "no return visit without a creation date");
await f.recordReturnVisit("u1", new Date(Date.now() - 2 * 864e5).toISOString());
check(calls.length === 1 && calls[0][1].name === "return_visit" && calls[0][1].profile_id === "u1", "return visit recorded for an older account");
globalThis.__err = { code: "23505", message: "dup" }; await f.recordFunnelEvent("first_import_started", "u1");
globalThis.__err = { code: "PGRST205", message: "Could not find the table" }; await f.recordFunnelEvent("first_import_started", "u1");
check(errors.length === 0, "duplicates and a missing table are silent");
globalThis.__err = { code: "XX000", message: "boom" }; await f.recordFunnelEvent("first_import_started", "u1");
check(errors.length === 1 && !errors[0].includes("boom"), "other errors are logged by code only");
globalThis.__admin = { from: () => { throw new Error("db down"); } };
let threw = false; try { await f.recordFunnelEvent("profile_completed", "u1"); } catch { threw = true; }
check(!threw, "a database failure never throws into the page");
globalThis.__admin = null;
threw = false; try { await f.recordFunnelEvent("profile_completed", "u1"); } catch { threw = true; }
check(!threw, "no database configured: silent");
console.error = origErr;
console.log(failed ? `\n${failed} FAILED` : "\nall passed"); process.exit(failed ? 1 : 0);
