// Discord command logic (/link, /unlink, /profile, /scrim ...) against an in-memory stand-in for the database. No network.
//   node scripts/discord-commands-test.mjs
import { runDeferred, DB_COMMANDS } from "../lib/discord/commands-run.ts";
import { newLinkCode, hashLinkCode, isLinkCode, linkUrl } from "../lib/discord/link.ts";
import { summarizeRl } from "../lib/ballchasing/summary.ts";
import { COMMANDS } from "../lib/discord/commands.ts";

let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };

// ---- codes
const c = newLinkCode();
check(isLinkCode(c) && c.length === 43 && newLinkCode() !== c, "link codes are 43 random URL safe characters");
check(hashLinkCode(c).length === 64 && hashLinkCode(c) !== c && !hashLinkCode(c).includes(c), "only a hash of the code is ever stored");
check(!isLinkCode("short") && !isLinkCode(c + "x") && !isLinkCode(`${c.slice(0, 42)}/`) && !isLinkCode(null), "malformed codes are refused");
check(linkUrl("https://victress.gg/", c) === `https://victress.gg/dashboard/link/discord/${c}`, "the link opens on the signed in app");

// ---- stand-in database
const A = "111111111111111111", B = "222222222222222222", PA = "profile-a", PB = "profile-b";
function db() {
  const t = {
    discord_links: [], profiles: [{ id: PA, handle: "alice", display_name: "Alice" }, { id: PB, handle: "bob", display_name: null }],
    team_members: [{ profile_id: PA, role: "owner", team_id: "t1" }], teams: [{ id: "t1", name: "Test Team" }],
    game_accounts: [{ profile_id: PA, game: "ROCKET_LEAGUE", platform: "steam", external_id: "76561198000000001" }],
    game_matches: [], import_jobs: [], design_partner_allowlist: [{ profile_id: PA }],
  };
  const codes = [];
  const q = (name) => {
    const f = []; let head = false;
    const b = {
      select(_c, o) { head = !!o?.head; return b; },
      eq(k, v) { f.push((r) => r[k] === v); return b; },
      order() { return b; }, limit() { return b; },
      async maybeSingle() { return { data: t[name].find((r) => f.every((x) => x(r))) ?? null, error: null }; },
      then(res, rej) { const rows = t[name].filter((r) => f.every((x) => x(r))); return Promise.resolve({ data: head ? null : rows, count: rows.length, error: null }).then(res, rej); },
    };
    return b;
  };
  return {
    t, codes, from: q,
    async rpc(fn, a) {
      if (fn === "discord_create_link_code") {
        if (t.discord_links.some((l) => l.discord_user_id === a.p_discord_user_id)) return { data: "already_linked", error: null };
        if (codes.filter((x) => x.d === a.p_discord_user_id).length >= 5) return { data: "rate_limited", error: null };
        codes.push({ d: a.p_discord_user_id, h: a.p_code_hash, hint: a.p_hint }); return { data: "ok", error: null };
      }
      if (fn === "discord_unlink") { const n = t.discord_links.length; t.discord_links = t.discord_links.filter((l) => l.discord_user_id !== a.p_discord_user_id); return { data: t.discord_links.length < n, error: null }; }
      return { data: null, error: { message: "unknown" } };
    },
  };
}
const imports = [];
const svc = (d, over = {}) => ({
  admin: d, appUrl: "https://victress.gg", pilotOpen: true, consentOk: async () => true, sweepStale: async () => {}, newCode: newLinkCode, hashCode: hashLinkCode, linkUrl,
  importReplay: async (uid, link, o) => { imports.push({ uid, link, o }); return { ok: true, message: "Saved." }; },
  summarize: (rows, kind) => summarizeRl(rows, kind), ...over,
});
const cmd = (name, user, options) => ({ type: 2, application_id: "1", member: { user: { id: user, username: "alice_d", global_name: "Alice D" } }, data: { name, options } });
const sub = (name, opts) => [{ name, type: 1, options: opts.map(([n, v]) => ({ name: n, type: typeof v === "boolean" ? 5 : 3, value: v })) }];
const REPLAY = "https://ballchasing.com/replay/3b0a1e7c-1111-4222-8333-444455556666";

check(["link", "unlink", "profile", "scrim"].every((n) => DB_COMMANDS.has(n)) && !DB_COMMANDS.has("help") && !DB_COMMANDS.has("privacy"), "exactly the data commands are routed to the data layer");

// ---- every reply is private and cannot ping
let d = db();
let r = await runDeferred(cmd("link", A), svc(d));
check(r.flags === 64 && r.allowed_mentions.parse.length === 0, "replies are visible only to the user and cannot mention anyone");
check(/dashboard\/link\/discord\/[A-Za-z0-9_-]{43}/.test(r.content) && /10 minutes/.test(r.content) && /does not share your profile/.test(r.content), "/link gives a one time link, its lifetime, and says linking shares nothing");
const url = r.content.match(/link\/discord\/([A-Za-z0-9_-]{43})/)[1];
check(d.codes.length === 1 && d.codes[0].h === hashLinkCode(url) && !JSON.stringify(d.codes).includes(url), "the database receives the hash, never the code");
check(d.codes[0].hint === "Alice D @alice_d", "the Discord display name is passed only as the hint shown on the confirmation page");
check(d.t.discord_links.length === 0, "/link alone links nothing");
r = await runDeferred(cmd("link", A), svc(d)); r = await runDeferred(cmd("link", A), svc(d)); r = await runDeferred(cmd("link", A), svc(d)); r = await runDeferred(cmd("link", A), svc(d));
r = await runDeferred(cmd("link", A), svc(d));
check(/several link codes/.test(r.content), "too many /link requests are refused");

// ---- after linking
d = db(); d.t.discord_links.push({ discord_user_id: A, profile_id: PA, linked_at: new Date().toISOString() });
r = await runDeferred(cmd("link", A), svc(d));
check(/already linked/.test(r.content) && !/dashboard\/link/.test(r.content) && d.codes.length === 0, "a linked account is told so, and gets no new code");
r = await runDeferred(cmd("profile", A), svc(d));
check(/alice/.test(r.content) && /Test Team \(owner\)/.test(r.content) && /Steam/.test(r.content) && /765…001/.test(r.content) && !r.content.includes("76561198000000001"), "/profile shows the player's own account, team, and a masked Rocket League ID");
check(/does not make your profile or numbers visible/.test(r.content), "/profile says linking shares nothing");
r = await runDeferred(cmd("profile", B), svc(d));
check(/not linked/.test(r.content) && !/alice/.test(r.content), "an unlinked Discord user sees nothing about anyone");

// ---- a player with no team still works; team info appears only for a member
d = db(); d.t.discord_links.push({ discord_user_id: B, profile_id: PB, linked_at: "x" });
r = await runDeferred(cmd("profile", B), svc(d));
check(/Team: No team/.test(r.content) && !/Test Team/.test(r.content), "a player without a team gets their own profile and no team information");

// ---- unlink
d = db(); d.t.discord_links.push({ discord_user_id: A, profile_id: PA, linked_at: "x" });
r = await runDeferred(cmd("unlink", A), svc(d));
check(d.t.discord_links.length === 0 && /no longer linked/.test(r.content) && /unchanged/.test(r.content), "/unlink removes the link and says nothing else changed");
r = await runDeferred(cmd("unlink", A), svc(d));
check(/was not linked/.test(r.content), "unlinking twice is harmless");
check(d.t.game_accounts.length === 1 && d.t.profiles.length === 2, "unlinking does not delete the account or saved data");

// ---- /scrim: linking and the pilot gate come first
d = db();
r = await runDeferred(cmd("scrim", A, sub("submit", [["link", REPLAY], ["authorized", true], ["consent", true]])), svc(d));
check(/Link your Victress account first/.test(r.content) && imports.length === 0, "an unlinked user cannot submit a replay");
d.t.discord_links.push({ discord_user_id: A, profile_id: PA, linked_at: "x" }, { discord_user_id: B, profile_id: PB, linked_at: "x" });
r = await runDeferred(cmd("scrim", B, sub("submit", [["link", REPLAY], ["authorized", true], ["consent", true]])), svc(d));
check(/approved pilot players only/.test(r.content) && imports.length === 0, "a linked player who is not on the pilot roster cannot submit");
r = await runDeferred(cmd("scrim", A, sub("submit", [["link", REPLAY], ["authorized", true], ["consent", true]])), svc(d, { pilotOpen: false }));
check(/approved pilot players only/.test(r.content) && imports.length === 0, "with the pilot flag off nobody can submit");
r = await runDeferred(cmd("scrim", A, sub("submit", [["link", REPLAY], ["authorized", false], ["consent", true]])), svc(d));
check(/Nothing was submitted/.test(r.content) && imports.length === 0, "without the authorization confirmation nothing is submitted");
r = await runDeferred(cmd("scrim", A, sub("submit", [["link", REPLAY], ["authorized", true], ["consent", false]])), svc(d));
check(/Nothing was submitted/.test(r.content) && imports.length === 0, "without the consent confirmation nothing is submitted");
r = await runDeferred(cmd("scrim", A, sub("submit", [["link", REPLAY], ["authorized", true], ["consent", true]])), svc(d));
check(imports.length === 1 && imports[0].uid === PA && imports[0].o.via === "discord" && imports[0].o.authorized && imports[0].o.consent && imports[0].link === REPLAY, "a linked pilot player's confirmed submission goes to the shared import pipeline, as that player, via Discord");
check(/Saved\./.test(r.content), "the pipeline's result is shown to the player");

// ---- status and stats
d.t.import_jobs.push({ profile_id: PA, game: "ROCKET_LEAGUE", status: "failed", error_message: "Victress can only read replays set to unlisted or public on Ballchasing.", external_ref: "3b0a1e7c-1111-4222-8333-444455556666", created_at: new Date().toISOString() },
  { profile_id: PB, game: "ROCKET_LEAGUE", status: "succeeded", error_message: null, external_ref: "other-players-replay", created_at: new Date().toISOString() });
r = await runDeferred(cmd("scrim", A, sub("status", [])), svc(d));
check(/not saved/.test(r.content) && /unlisted or public/.test(r.content) && !/other-players-replay/.test(r.content), "/scrim status shows the player's own submissions and why one failed, never another player's");
r = await runDeferred(cmd("scrim", A, sub("stats", [])), svc(d));
check(/No Rocket League games saved/.test(r.content), "/scrim stats with nothing saved says so");
const me = { core: { score: 300, goals: 2, assists: 1, saves: 2, shots: 4 }, boost: { bpm: 400 }, movement: { avg_speed: 1500, percent_supersonic_speed: 10 }, demo: { inflicted: 1, taken: 0 } };
d.t.game_matches.push({ profile_id: PA, game: "ROCKET_LEAGUE", queue_kind: "custom", played_at: "2026-11-12T10:00:00Z", duration_seconds: 330, result: "win", me: { ...me, team: "blue" },
    participants: [{ slot: 0, team: "blue", core: { goals: 2, shots: 4 } }, { slot: 1, team: "blue", core: { goals: 1, shots: 3 } }, { slot: 2, team: "orange", core: { goals: 1, shots: 5 } }] },
  { profile_id: PB, game: "ROCKET_LEAGUE", queue_kind: "custom", played_at: "2026-11-12T11:00:00Z", duration_seconds: 330, result: "loss", me: { core: { score: 999, goals: 9, shots: 9 } } });
r = await runDeferred(cmd("scrim", A, sub("stats", [])), svc(d));
check(/1 game\b/.test(r.content) && /A small sample/.test(r.content) && /Goals 2\.0/.test(r.content) && !/999/.test(r.content), "/scrim stats shows only the player's own games and flags a small sample");
check(/Player-submitted Ballchasing replay/.test(r.content) && /not how good you are/.test(r.content), "/scrim stats carries the data label and the context line");
check(/Your side: 3\.0 goals for, 1\.0 against; shots 7\.0 to 5\.0; you scored 67% of your side's goals/.test(r.content), "/scrim stats shows your side's totals and your share, from slot totals");
check(!/Goals 1\.0 .*teammate/i.test(r.content) && !/slot/i.test(r.content), "no single teammate or slot is reported");
r = await runDeferred(cmd("scrim", A, sub("stats", [["kind", "ranked"]])), svc(d));
check(/No Rocket League games saved/.test(r.content), "the match type filter applies");

// ---- parity with the website: the same consent rule, and leaving is never blocked
d = db(); d.t.discord_links.push({ discord_user_id: A, profile_id: PA, linked_at: "x" });
const stale = svc(d, { consentOk: async () => false });
const before = imports.length;
for (const [label, c] of [["/profile", cmd("profile", A)], ["/scrim submit", cmd("scrim", A, sub("submit", [["link", REPLAY], ["authorized", true], ["consent", true]]))], ["/scrim status", cmd("scrim", A, sub("status", []))], ["/scrim stats", cmd("scrim", A, sub("stats", []))]]) {
  r = await runDeferred(c, stale);
  check(/accept the current Terms and Privacy Policy/.test(r.content) && !/alice/.test(r.content), `${label} is refused until the current Terms and Privacy Policy are accepted, as on the website`);
}
check(imports.length === before, "nothing is submitted while consent is not current");
r = await runDeferred(cmd("unlink", A), stale);
check(/no longer linked/.test(r.content) && d.t.discord_links.length === 0, "/unlink still works when consent is not current: leaving is never blocked");
const failClosed = svc(db(), { consentOk: async () => { throw new Error("rpc missing"); } });
failClosed.admin.t.discord_links.push({ discord_user_id: A, profile_id: PA, linked_at: "x" });
r = await runDeferred(cmd("profile", A), failClosed);
check(/Something went wrong/.test(r.content) && !/alice/.test(r.content), "if the consent check cannot run, nothing is shown (fail closed)");

// ---- after unlinking, Discord gives access to nothing
d = db(); d.t.discord_links.push({ discord_user_id: A, profile_id: PA, linked_at: "x" });
d.t.game_matches.push({ profile_id: PA, game: "ROCKET_LEAGUE", queue_kind: "custom", played_at: "2026-11-12T10:00:00Z", duration_seconds: 330, result: "win", me: { core: { goals: 2 } } });
await runDeferred(cmd("unlink", A), svc(d));
for (const [label, c] of [["/profile", cmd("profile", A)], ["/scrim submit", cmd("scrim", A, sub("submit", [["link", REPLAY], ["authorized", true], ["consent", true]]))], ["/scrim status", cmd("scrim", A, sub("status", []))], ["/scrim stats", cmd("scrim", A, sub("stats", []))]]) {
  r = await runDeferred(c, svc(d));
  check(/not linked|Link your Victress account first/.test(r.content) && !/Goals/.test(r.content), `after /unlink, ${label} gives no access`);
}
check(d.t.game_matches.length === 1, "unlinking does not delete saved games (deleting data is a separate, explicit action on the website)");

// ---- a player with no team uses everything
d = db(); d.t.team_members = []; d.t.teams = []; d.t.discord_links.push({ discord_user_id: A, profile_id: PA, linked_at: "x" });
const solo = svc(d);
r = await runDeferred(cmd("scrim", A, sub("submit", [["link", REPLAY], ["authorized", true], ["consent", true]])), solo);
check(/Saved\./.test(r.content), "a player with no team can submit a replay");
d.t.game_matches.push({ profile_id: PA, game: "ROCKET_LEAGUE", queue_kind: "custom", played_at: "2026-11-12T10:00:00Z", duration_seconds: 330, result: "win", me });
r = await runDeferred(cmd("scrim", A, sub("stats", [])), solo);
check(/Goals 2\.0/.test(r.content), "a player with no team sees their own numbers");
r = await runDeferred(cmd("profile", A), solo);
check(/Team: No team/.test(r.content), "a player with no team sees their own profile");

// ---- /scrim status closes abandoned submissions; /profile explains how to add an ID
d = db(); d.t.discord_links.push({ discord_user_id: A, profile_id: PA, linked_at: "x" });
let swept = 0;
await runDeferred(cmd("scrim", A, sub("status", [])), svc(d, { sweepStale: async (uid) => { if (uid === PA) swept++; } }));
check(swept === 1, "/scrim status first closes any abandoned submission for that player, so nothing shows as processing forever");
d.t.import_jobs.push({ profile_id: PA, game: "ROCKET_LEAGUE", status: "running", error_message: null, external_ref: "3b0a1e7c-1111-4222-8333-444455556666", created_at: new Date().toISOString() });
r = await runDeferred(cmd("scrim", A, sub("status", [])), svc(d));
check(/still processing \(give it a minute\)/.test(r.content), "a submission that is running is shown as still processing, with what to do");
d = db(); d.t.game_accounts = []; d.t.discord_links.push({ discord_user_id: A, profile_id: PA, linked_at: "x" });
r = await runDeferred(cmd("profile", A), svc(d));
check(/paste your Ballchasing player link/.test(r.content) && !/Steam/i.test(r.content), "/profile with no Rocket League ID explains the easy way to add one and assumes no platform");
d.t.game_accounts = [{ profile_id: PA, game: "ROCKET_LEAGUE", platform: "psynet", external_id: "89abcdef01234567" }];
r = await runDeferred(cmd("profile", A), svc(d));
check(/PlayStation Network/.test(r.content) && /89a…567/.test(r.content) && !r.content.includes("89abcdef01234567"), "/profile shows a psynet identity by its platform name with the id masked");
d.t.game_accounts = [{ profile_id: PA, game: "ROCKET_LEAGUE", platform: "ps5", external_id: "987654321" }];
r = await runDeferred(cmd("profile", A), svc(d));
check(/ps5/.test(r.content), "a platform Victress has not seen before is shown as Ballchasing named it");

// ---- failure handling
r = await runDeferred(cmd("profile", A), svc({ from: () => { throw new Error("db down"); }, rpc: async () => ({ error: { message: "x" } }) }));
check(/Something went wrong/.test(r.content) && !/db down/.test(r.content), "an internal error gives a plain message and leaks nothing");
r = await runDeferred({ type: 2, data: { name: "profile" } }, svc(db()));
check(/could not tell which Discord account/.test(r.content), "a request with no identifiable user is refused");
// team option: off unless chosen; label passed through; replies stay ephemeral and never ping
{
  const d = db(); d.t.discord_links.push({ discord_user_id: A, profile_id: PA, linked_at: "x" }); const before = imports.length;
  let t = await runDeferred(cmd("scrim", A, sub("submit", [["link", REPLAY], ["authorized", true], ["consent", true]])), svc(d));
  check(imports.length === before + 1 && imports.at(-1).o.forTeam === false, "without the team option, the submission is private only (forTeam false)");
  t = await runDeferred(cmd("scrim", A, sub("submit", [["link", REPLAY], ["authorized", true], ["consent", true], ["team", true], ["opponent", "Rival"]])), svc(d));
  check(imports.at(-1).o.forTeam === true && imports.at(-1).o.opponent === "Rival", "team True and an opponent label are passed to the import");
  check(/dashboard\/team\/scrims/.test(t.content), "the team reply points to the Team scrims page");
  check(t.flags === 64 && Array.isArray(t.allowed_mentions?.parse) && t.allowed_mentions.parse.length === 0, "the team reply is ephemeral and cannot ping anyone");
}
const submitDef = COMMANDS.find((c) => c.name === "scrim").options.find((o) => o.name === "submit").options;
check(submitDef.find((o) => o.name === "team")?.required === false && submitDef.find((o) => o.name === "opponent")?.max_length === 40, "/scrim submit has an optional team choice and an optional 40 character opponent label");

r = await runDeferred(cmd("profile", "not-a-snowflake"), svc(db()));
check(/could not tell which Discord account/.test(r.content), "a malformed Discord user id is refused");

console.log(failed ? `\n${failed} FAILED` : "\nAll Discord command checks passed.");
process.exit(failed ? 1 : 0);
