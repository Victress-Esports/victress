// Tests lib/ballchasing/core.ts with a stub fetch and fake clock (no network, no token).  node scripts/ballchasing-test.mjs
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const ts = createRequire(import.meta.url)("typescript");
const dir = mkdtempSync(join(tmpdir(), "bc-"));
writeFileSync(join(dir, "core.mjs"), ts.transpileModule(readFileSync("lib/ballchasing/core.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
const { createBallchasingClient, BcError, Limiter, MAX_REPLAY_BYTES } = await import(pathToFileURL(join(dir, "core.mjs")).href);
let failed = 0;
const check = (ok, n) => { console.log(`${ok ? "PASS" : "FAIL"} ${n}`); if (!ok) failed++; };
const clock = () => { let t = 0; return { now: () => t, sleep: async (ms) => { t += ms; } }; };
const ID = "969c37e6-f5c7-41bf-a0c0-21922df74469", TOKEN = "tok-secret-123";
const json = (b, s = 200, h = {}) => new Response(JSON.stringify(b), { status: s, headers: h });

{ const calls = []; const c = createBallchasingClient({ token: TOKEN, clock: clock(), fetch: async (u, i) => { calls.push([u, i]); return json({ list: [{ id: ID, visibility: "public" }, { id: "b".repeat(8) + "-0000-0000-0000-" + "c".repeat(12), visibility: "private" }, { id: "not-a-uuid", visibility: "public" }] }); } });
  const r = await c.list({ playlist: ["ranked-duels", "ranked-doubles"], count: 999 });
  check(r.list.length === 1 && calls[0][0].includes("visibility=public") && calls[0][0].includes("count=200") && calls[0][0].includes("playlist=ranked-duels&playlist=ranked-doubles"), "list asks for public replays only, caps count at 200, drops non public and malformed ids");
  check(calls[0][1].headers.Authorization === TOKEN && !calls[0][0].includes(TOKEN), "token is sent raw in the Authorization header, never in the URL"); }
{ const c = createBallchasingClient({ token: TOKEN, clock: clock(), fetch: async () => new Response(new Uint8Array([1, 2, 3])) }); const b = await c.download(ID); check(b.length === 3, "download returns the file bytes"); }
{ const c = createBallchasingClient({ token: TOKEN, clock: clock(), fetch: async () => new Response("x", { headers: { "content-length": String(MAX_REPLAY_BYTES + 1) } }) }); let e; try { await c.download(ID); } catch (x) { e = x; } check(e?.code === "too_large", "oversize file refused"); }
for (const bad of [(c) => c.details("../x"), (c) => c.download("zzz")]) { const c = createBallchasingClient({ token: TOKEN, clock: clock(), fetch: async () => { throw new Error("no"); } }); let e; try { await bad(c); } catch (x) { e = x; } check(e?.code === "invalid_input", "bad replay id refused before any request"); }
for (const [s, code] of [[404, "not_found"], [401, "auth"], [403, "auth"], [418, "unexpected"]]) { const c = createBallchasingClient({ token: TOKEN, clock: clock(), fetch: async () => json({ error: TOKEN }, s) }); let e; try { await c.details(ID); } catch (x) { e = x; } check(e?.code === code && !e.message.includes(TOKEN), `${s} gives ${code} with no token in the message`); }
{ let n = 0; const k = clock(); const c = createBallchasingClient({ token: TOKEN, clock: k, fetch: async () => (++n < 3 ? json({}, 429) : json({ ok: 1 })) }); const r = await c.details(ID); check(r.ok === 1 && n === 3 && k.now() >= 6000, "429 backs off and retries"); }
{ let n = 0; const c = createBallchasingClient({ token: TOKEN, clock: clock(), maxRetries: 1, fetch: async () => { n++; return json({}, 503); } }); let e; try { await c.details(ID); } catch (x) { e = x; } check(e?.code === "unavailable" && n === 2, "503 retried then reported"); }
{ const k = clock(); const l = new Limiter(k, [[1, 1100], [190, 3_600_000]]); for (let i = 0; i < 5; i++) await l.acquire(); check(k.now() >= 4400, "downloads are spaced at least 1.1 seconds apart"); }
{ const k = clock(); const l = new Limiter(k, [[2, 1000], [480, 3_600_000]]); const t = []; for (let i = 0; i < 600; i++) { await l.acquire(); t.push(k.now()); } const hour = t.filter((x) => x > t[599] - 3_600_000).length; check(hour <= 480, `600 list calls never exceed 480 in an hour (max seen ${hour})`); }
{ let e; try { createBallchasingClient({ token: "" }); } catch (x) { e = x; } check(e?.code === "auth", "no token: client refuses to start"); }
{ const calls = []; const c = createBallchasingClient({ token: TOKEN, clock: clock(), fetch: async (u, i) => { calls.push([u, i]); return json({ id: ID }); } });
  await c.uploadReplay(new Uint8Array([1, 2, 3]));
  check(calls[0][0].includes("/v2/upload?visibility=private") && calls[0][1].method === "POST" && calls[0][1].body instanceof FormData, "uploadReplay defaults to visibility=private");
  await c.uploadReplay(new Uint8Array([1]), "unlisted");
  check(calls[1][0].includes("visibility=unlisted"), "another visibility only when asked for explicitly");
  let e; try { await c.uploadReplay(new Uint8Array(0)); } catch (x) { e = x; } check(e?.code === "too_large", "empty upload refused"); }
{ const walk = (d, o = []) => { for (const f of readdirSync(d)) { if (["node_modules", ".next", ".git", "target"].includes(f)) continue; const p = join(d, f); statSync(p).isDirectory() ? walk(p, o) : /\.(tsx?|jsx?)$/.test(f) && o.push(p); } return o; };
  const users = [...walk("app"), ...walk("components"), ...walk("lib")].filter((f) => !f.includes("lib/ballchasing/") && /uploadReplay|lib\/ballchasing/.test(readFileSync(f, "utf8")));
  check(users.length === 0, `no page, component, action or route uses the ballchasing client or uploadReplay (found: ${users.join(", ") || "none"})`); }
console.log(failed ? `\n${failed} FAILED` : "\nall passed"); process.exit(failed ? 1 : 0);
