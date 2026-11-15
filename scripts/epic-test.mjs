// Epic verification: unit tests for lib/epic/core.ts with a stand in Epic server and a stand in database. Touches no network or database.
//   node scripts/epic-test.mjs
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const ts = createRequire(import.meta.url)("typescript");
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };

const dir = mkdtempSync(join(tmpdir(), "epic-"));
writeFileSync(join(dir, "core.mjs"), ts.transpileModule(readFileSync("lib/epic/core.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
const E = await import(pathToFileURL(join(dir, "core.mjs")).href);

// ------------------------------------------------------------ configuration and the flag
const base = { VICTRESS_EPIC_CLIENT_ID: "cid123", VICTRESS_EPIC_CLIENT_SECRET: "sec456", VICTRESS_EPIC_REDIRECT_URI: "https://victress.gg/dashboard/link/epic/callback" };
check(E.epicConfig(base) === null && !E.epicFlagOn(base), "flag unset: Epic is off even with every value present (Steam and typed IDs are unaffected)");
check(E.epicConfig({ ...base, VICTRESS_EPIC_SIGNIN_ENABLED: "1" }) === null, "only the exact value true turns it on");
const cfg = E.epicConfig({ ...base, VICTRESS_EPIC_SIGNIN_ENABLED: "true" });
check(cfg && cfg.clientId === "cid123" && cfg.deploymentId === undefined, "flag on with the three values: configured");
check(E.epicConfig({ ...base, VICTRESS_EPIC_SIGNIN_ENABLED: "true", VICTRESS_EPIC_CLIENT_SECRET: " " }) === null, "a missing secret means not configured");
check(E.epicConfig({ ...base, VICTRESS_EPIC_SIGNIN_ENABLED: "true", VICTRESS_EPIC_REDIRECT_URI: "http://victress.gg/dashboard/link/epic/callback" }) === null, "a plain http redirect is refused outside localhost");
check(E.epicConfig({ ...base, VICTRESS_EPIC_SIGNIN_ENABLED: "true", VICTRESS_EPIC_REDIRECT_URI: "http://localhost:3000/dashboard/link/epic/callback" }) !== null, "http://localhost is allowed for local testing");
check(E.epicConfig({ ...base, VICTRESS_EPIC_SIGNIN_ENABLED: "true", VICTRESS_EPIC_REDIRECT_URI: "http://app.localhost:3000/dashboard/link/epic/callback" }) !== null, "http://app.localhost is allowed for local testing");
check(E.epicConfig({ ...base, VICTRESS_EPIC_SIGNIN_ENABLED: "true", VICTRESS_EPIC_REDIRECT_URI: "http://localhost.evil.example/dashboard/link/epic/callback" }) === null, "a look alike host (localhost.evil.example) is not treated as local");
check(E.epicConfig({ ...base, VICTRESS_EPIC_SIGNIN_ENABLED: "true", VICTRESS_EPIC_REDIRECT_URI: "https://victress.gg/somewhere-else" }) === null, "a redirect that is not the callback route is refused");

const state = "a".repeat(64);
const u = new URL(E.authorizeUrl(cfg, state));
check(u.origin + u.pathname === "https://www.epicgames.com/id/authorize" && u.searchParams.get("client_id") === "cid123" && u.searchParams.get("response_type") === "code"
  && u.searchParams.get("scope") === "basic_profile" && u.searchParams.get("state") === state && u.searchParams.get("redirect_uri") === base.VICTRESS_EPIC_REDIRECT_URI,
  "authorize URL: Epic's documented endpoint, code flow, basic_profile only, state and redirect");
check(!u.toString().includes("sec456"), "the client secret never appears in the browser redirect");

// ------------------------------------------------------------ the callback
const PID = "11111111-2222-4333-8444-555555555555";
const ACC = "9626f441055349ce8cb7d7d5a483eaa2";
const cookie = E.stateCookieValue(state, PID);
function epicServer(over = {}) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, init, body: String(init.body) });
    if (url === E.EPIC_TOKEN_URL) {
      if (over.tokenStatus) return new Response("{}", { status: over.tokenStatus });
      return Response.json({ access_token: "at-xyz", token_type: "bearer", account_id: over.account ?? ACC, client_id: over.client ?? "cid123", expires_in: 7200 });
    }
    if (url === E.EPIC_TOKEN_INFO_URL) {
      if (over.infoStatus) return new Response("{}", { status: over.infoStatus });
      return Response.json({ active: over.active ?? true, account_id: over.infoAccount ?? ACC, client_id: over.infoClient ?? "cid123" });
    }
    throw new Error("unexpected url " + url);
  };
  return { f, calls };
}
const run = (q, over, ck = cookie, pid = PID) => { const s = epicServer(over); return E.verifyEpicCallback({ cfg, profileId: pid, query: q, cookie: ck, fetch: s.f }).then((r) => ({ r, calls: s.calls })); };

let { r, calls } = await run({ code: "goodcode123", state });
check(r.ok && r.accountId === ACC, "valid callback: the Epic Account ID from the token endpoint is returned");
const tok = calls[0];
check(tok.url === "https://api.epicgames.dev/epic/oauth/v2/token" && tok.init.method === "POST" && tok.init.headers.Authorization === `Basic ${btoa("cid123:sec456")}`,
  "token request: Epic's endpoint, POST, client credentials in a Basic header");
check(/grant_type=authorization_code/.test(tok.body) && /code=goodcode123/.test(tok.body) && tok.body.includes(encodeURIComponent(base.VICTRESS_EPIC_REDIRECT_URI)) && !tok.body.includes("sec456"),
  "token body: authorization_code, the code and the redirect URI; the secret is not in the body");
check(calls[1]?.url === "https://api.epicgames.dev/epic/oauth/v2/tokenInfo" && calls[1].body === "token=at-xyz", "the token is confirmed with Epic's token info endpoint");
({ r } = await run({ code: "goodcode123", state }, { account: ACC.toUpperCase(), infoAccount: ACC.toUpperCase() }));
check(r.ok && r.accountId === ACC, "an upper case account id is stored lower case (Ballchasing reports lower case hex)");

({ r, calls } = await run({ code: "goodcode123", state, error: "access_denied" }));
check(!r.ok && r.reason === "denied" && calls.length === 0, "player cancels at Epic: nothing is requested");
({ r, calls } = await run({ code: "goodcode123", state: "b".repeat(64) }));
check(!r.ok && r.reason === "state" && calls.length === 0, "a state that does not match the cookie is refused before any request");
({ r, calls } = await run({ code: "goodcode123", state }, {}, null));
check(!r.ok && r.reason === "state" && calls.length === 0, "no state cookie: refused");
({ r, calls } = await run({ code: "goodcode123", state }, {}, cookie, "99999999-2222-4333-8444-555555555555"));
check(!r.ok && r.reason === "state" && calls.length === 0, "a callback opened by a different Victress account is refused (state is bound to the player)");
({ r } = await run({ code: "bad code!", state }));
check(!r.ok && r.reason === "exchange", "a malformed code is refused");
({ r } = await run({ code: "goodcode123", state }, { tokenStatus: 400 }));
check(!r.ok && r.reason === "exchange", "Epic refuses the code: nothing verified");
({ r } = await run({ code: "goodcode123", state }, { tokenStatus: 503 }));
check(!r.ok && r.reason === "unavailable", "Epic is down: nothing verified, told to retry");
({ r } = await run({ code: "goodcode123", state }, { account: "not-an-epic-id" }));
check(!r.ok && r.reason === "exchange", "an account id that is not 32 hex characters is refused");
({ r } = await run({ code: "goodcode123", state }, { client: "someone-else" }));
check(!r.ok && r.reason === "mismatch", "a token issued to another client is refused");
({ r } = await run({ code: "goodcode123", state }, { active: false }));
check(!r.ok && r.reason === "token_info", "an inactive token is refused");
({ r } = await run({ code: "goodcode123", state }, { infoAccount: "0".repeat(32) }));
check(!r.ok && r.reason === "mismatch", "token info naming a different account is refused");
({ r } = await run({ code: "goodcode123", state }, { infoClient: "other" }));
check(!r.ok && r.reason === "mismatch", "token info naming a different client is refused");

// ------------------------------------------------------------ saving (stand in for the Supabase admin client)
function db(rows = [], games = 0) {
  const t = { game_accounts: rows.map((x) => ({ ...x })), writes: [] };
  const q = (table) => {
    const f = []; let op = "select"; let payload = null;
    const api = {
      select(_c, o) { if (o?.head) op = "count"; return api; },
      eq(k, v) { f.push((x) => x[k] === v); return api; },
      update(p) { op = "update"; payload = p; return api; },
      insert(p) { op = "insert"; payload = p; return api.exec(); },
      maybeSingle() { return api.exec().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })); },
      then(res, rej) { return api.exec().then(res, rej); },
      async exec() {
        if (table === "game_matches") return { count: games, data: null, error: null };
        const match = t.game_accounts.filter((x) => f.every((p) => p(x)));
        if (op === "insert") {
          if (payload.ownership_verified && t.game_accounts.some((x) => x.ownership_verified && x.platform === payload.platform && x.external_id === payload.external_id)) return { error: { code: "23505" } };
          t.game_accounts.push({ id: "new", ...payload }); t.writes.push(["insert", payload]); return { error: null };
        }
        if (op === "update") { match.forEach((x) => Object.assign(x, payload)); t.writes.push(["update", payload]); return { error: null }; }
        return { data: match, error: null };
      },
    };
    return api;
  };
  return { t, admin: { from: q } };
}
let d = db();
check(await E.saveVerifiedEpic(d.admin, PID, ACC) === "saved" && d.t.game_accounts[0].platform === "epic" && d.t.game_accounts[0].external_id === ACC
  && d.t.game_accounts[0].ownership_verified === true && d.t.game_accounts[0].verified_via === "epic_oauth" && d.t.game_accounts[0].provider === "rocket_league",
  "no identity yet: the verified Epic identity is saved (platform epic, the account id, verified)");
check(await E.saveVerifiedEpic(d.admin, PID, ACC) === "already", "same Epic account again: nothing changes");
d = db([{ id: "a1", profile_id: PID, game: "ROCKET_LEAGUE", platform: "epic", external_id: ACC, ownership_verified: false }]);
check(await E.saveVerifiedEpic(d.admin, PID, ACC) === "saved" && d.t.game_accounts[0].ownership_verified === true, "a typed Epic ID that matches exactly becomes verified");
d = db([{ id: "a1", profile_id: PID, game: "ROCKET_LEAGUE", platform: "steam", external_id: "76561198000000001", ownership_verified: false }]);
check(await E.saveVerifiedEpic(d.admin, PID, ACC) === "replaced" && d.t.game_accounts[0].platform === "epic", "a typed Steam ID with no games is replaced by the verified Epic account");
d = db([{ id: "a1", profile_id: PID, game: "ROCKET_LEAGUE", platform: "steam", external_id: "76561198000000001", ownership_verified: false }], 3);
check(await E.saveVerifiedEpic(d.admin, PID, ACC) === "has_games" && d.t.writes.length === 0 && d.t.game_accounts[0].platform === "steam",
  "a different identity with saved games is never swapped (old games never attach to another player)");
d = db([{ id: "a1", profile_id: PID, game: "ROCKET_LEAGUE", platform: "epic", external_id: "f".repeat(32), ownership_verified: false }], 2);
check(await E.saveVerifiedEpic(d.admin, PID, ACC) === "has_games", "a different typed Epic ID with games is not overwritten either");
d = db([{ id: "b1", profile_id: "other", game: "ROCKET_LEAGUE", platform: "epic", external_id: ACC, ownership_verified: true }]);
check(await E.saveVerifiedEpic(d.admin, PID, ACC) === "taken" && d.t.writes.length === 0, "an Epic account verified on another Victress account is refused");
d = db([{ id: "b1", profile_id: "other", game: "ROCKET_LEAGUE", platform: "epic", external_id: ACC, ownership_verified: false }]);
check(await E.saveVerifiedEpic(d.admin, PID, ACC) === "saved", "another account that only typed the same ID does not block the real owner");
check(await E.saveVerifiedEpic(db().admin, PID, "NotAnId") === "error", "a malformed id is never saved");

// ------------------------------------------------------------ messages
const all = Object.values(E.EPIC_MESSAGES).join(" ");
check(!/[—]/.test(all) && !/source of truth/i.test(all), "messages: no em dashes, no banned phrases");
check(!/(skill|ability|rank)/i.test(E.EPIC_MESSAGES.saved), "verification message claims identity only, never ability");

console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
