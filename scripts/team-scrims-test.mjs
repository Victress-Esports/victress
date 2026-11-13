// Team scrims: the payload built from a replay (opponents as totals only, lines only for opted in members) and the submission pipeline
// with the team step and product events, against stubs (no network, no database).
//   node scripts/team-scrims-test.mjs
import { runReplayImport, TEAM_MESSAGES } from "../lib/ballchasing/rl.ts";
import { teamScrimFromReplay, cleanOpponentLabel, sharingMembers } from "../lib/ballchasing/team.ts";

let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const ID = "3b0a1e7c-1111-4222-8333-444455556666";

// ---- fixture: invented names and ids
const P = (platform, id, name, goals, saves = 1) => ({ name, id: { platform, id }, car_name: "Octane", camera: { fov: 110 },
  stats: { core: { score: 300 + goals * 100, goals, assists: 1, saves, shots: goals + 2, shooting_percentage: 25, mvp: false }, boost: { bpm: 400 } } });
const replay = (over = {}) => ({
  id: ID, status: "ok", visibility: "unlisted", date: "2026-11-12T14:47:12Z", duration: 373, play_duration: 349, overtime: true, team_size: 3,
  playlist_id: "private", match_type: "Private", map_name: "Mannfield", uploader: { name: "UploaderName", steam_id: "99999999999999999" },
  blue: { name: "Blue Squad Name", stats: { core: { goals: 3 } }, players: [P("steam", "76561198000000001", "Me Player", 2), P("epic", "aaaabbbbccccdddd", "Mate One", 1), P("ps4", "1234567890", "Mate Two", 0)] },
  orange: { name: "Rival Club Name", stats: { core: { goals: 1 } }, players: [P("xbox", "5551212", "Opp One", 1, 3), P("steam", "76561198000000009", "Opp Two", 0, 2), P("switch", "sw-3", "Opp Three", 0, 0)] },
  ...over,
});
const me = { platform: "steam", id: "76561198000000001" };
const base = { queue_kind: "custom", played_at: "2026-11-12T14:47:12.000Z", duration_seconds: 349 };
const forbidden = ["Me Player", "Mate One", "Mate Two", "Opp One", "Opp Two", "Opp Three", "Rival Club Name", "Blue Squad Name", "UploaderName", "5551212", "76561198000000009", "sw-3", "xbox", "switch", "99999999999999999", "Octane", "aaaabbbbccccdddd", "1234567890", "76561198000000001"];

// ---- the payload
let t = teamScrimFromReplay(replay(), me, [
  { profile_id: "p-me", platform: "steam", id: "76561198000000001" },
  { profile_id: "p-mate1", platform: "EPIC", id: "AAAABBBBCCCCDDDD" },
  { profile_id: "p-opp-side", platform: "xbox", id: "5551212" },     // a "member" found only on the other side: never a line
  { profile_id: "p-wrong-platform", platform: "ps5", id: "1234567890" }, // same id, different platform: never guessed
], base, "  Rival\n Club  ");
check(t.ok && t.payload.side === "blue" && t.payload.goals_for === 3 && t.payload.goals_against === 1 && t.payload.overtime === true && t.payload.side_players === 3, "side, score, overtime and side size come from the replay");
check(t.ok && t.payload.opponent_totals.goals === 1 && t.payload.opponent_totals.saves === 5 && t.payload.opponent_totals.shots === 3 + 2 + 2, "the opponent side is summed into totals");
check(t.ok && Object.keys(t.payload.opponent_totals).sort().join() === "assists,goals,saves,score,shots" && Object.keys(t.payload.team_totals).sort().join() === "assists,goals,saves,score,shots", "totals hold only the five whitelisted numbers");
check(t.ok && t.payload.lines.map((l) => l.profile_id).join() === "p-me,p-mate1", "lines only for members passed in, found on the submitter's side by exact platform and id (case insensitive)");
check(t.ok && t.payload.lines[1].stats.goals === 1 && Object.keys(t.payload.lines[1].stats).length === 5, "a line holds the five numbers only");
const text = JSON.stringify(t.ok ? { ...t.payload, opponent_label: null } : {});
check(forbidden.every((s) => !text.includes(s)), "no player name, team name, platform, platform id, uploader or car appears anywhere in what is stored");
check(t.ok && t.payload.opponent_label === "Rival Club", "the opponent label is what the player typed, trimmed to one line");
check(cleanOpponentLabel("x".repeat(60)).length === 40 && cleanOpponentLabel("   ") === null && cleanOpponentLabel(42) === null, "the label is at most 40 characters and optional");
t = teamScrimFromReplay(replay(), me, [], base);
check(t.ok && t.payload.lines.length === 0 && t.payload.opponent_label === null, "with nobody opted in there are no lines, only totals");
const solo = replay({ team_size: 1, blue: { stats: { core: { goals: 2 } }, players: [P("steam", "76561198000000001", "Me Player", 2)] }, orange: { stats: { core: { goals: 0 } }, players: [P("xbox", "5551212", "Opp One", 0)] } });
check(teamScrimFromReplay(solo, me, [], base).reason === "solo_replay", "a 1v1 replay is not a team scrim");
check(teamScrimFromReplay(replay(), { platform: "steam", id: "1" }, [], base).reason === "not_in_replay" && teamScrimFromReplay(null, me, [], base).reason === "bad_shape", "a submitter not in the replay, or a malformed replay, builds nothing");

// ---- the pipeline against an in-memory database
function fakeDb() {
  const t = { game_accounts: [], game_matches: [], import_jobs: [], team_members: [], team_scrims: [], team_stat_sharing: [], team_scrim_lines: [], events: [] };
  let seq = 0;
  const calls = { rpc: [] };
  const q = (name) => {
    const f = []; let op = "select", payload = null, head = false;
    const rows = () => t[name].filter((r) => f.every((fn) => fn(r)));
    const b = {
      select(_c, o) { if (op === "select") head = !!o?.head; return b; },
      insert(p) { op = "insert"; payload = p; return b; },
      update(p) { op = "update"; payload = p; return b; },
      eq(k, v) { f.push((r) => r[k] === v); return b; },
      in(k, vs) { f.push((r) => vs.includes(r[k])); return b; },
      gte(k, v) { f.push((r) => r[k] >= v); return b; },
      lt(k, v) { f.push((r) => r[k] < v); return b; },
      async maybeSingle() { return { data: rows()[0] ?? null, error: null }; },
      async single() { return run(true); },
      then(res, rej) { return run(false).then(res, rej); },
    };
    async function run(single) {
      if (op === "insert") {
        const row = { id: `id-${++seq}`, created_at: new Date().toISOString(), status: "queued", ...payload };
        if (name === "import_jobs" && t.import_jobs.some((j) => j.profile_id === row.profile_id && ["queued", "running"].includes(j.status))) return { data: null, error: { code: "23505" } };
        if (name === "game_matches" && t.game_matches.some((m) => m.profile_id === row.profile_id && m.external_id === row.external_id)) return { data: null, error: { code: "23505" } };
        t[name].push(row); return { data: single ? { id: row.id } : [row], error: null };
      }
      if (op === "update") { rows().forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; }
      const r = rows(); return { data: head ? null : r, count: r.length, error: null };
    }
    return b;
  };
  // Mirrors public.record_team_scrim: current team, 1v1 refused, one row per team and replay, lines only for opted in members.
  async function rpc(fn, args) {
    calls.rpc.push({ fn, args });
    if (fn !== "record_team_scrim") return { data: null, error: { code: "42883" } };
    const tm = t.team_members.find((m) => m.profile_id === args.p_submitter);
    if (!tm) return { data: { status: "no_team" }, error: null };
    if (args.p.side_players < 2) return { data: { status: "solo_replay" }, error: null };
    if (t.team_scrims.some((s) => s.team_id === tm.team_id && s.replay_id === args.p.replay_id)) return { data: { status: "already" }, error: null };
    const id = `ts-${++seq}`;
    const { lines, ...rest } = args.p;
    t.team_scrims.push({ id, team_id: tm.team_id, submitted_by: args.p_submitter, ...rest });
    for (const l of lines ?? []) {
      if (t.team_members.some((m) => m.team_id === tm.team_id && m.profile_id === l.profile_id) && t.team_stat_sharing.some((s) => s.team_id === tm.team_id && s.profile_id === l.profile_id))
        t.team_scrim_lines.push({ scrim_id: id, ...l });
    }
    return { data: { status: "ok", scrim_id: id }, error: null };
  }
  return { t, from: q, rpc, calls };
}

const db = fakeDb();
const acct = (pid, platform, id) => db.t.game_accounts.push({ id: `acc-${pid}`, profile_id: pid, game: "ROCKET_LEAGUE", provider: "rocket_league", platform, external_id: id });
acct("me", "steam", "76561198000000001"); acct("mate1", "epic", "aaaabbbbccccdddd"); acct("mate2", "ps4", "1234567890"); acct("opp", "xbox", "5551212"); acct("loner", "steam", "76561198000000009");
db.t.team_members.push({ team_id: "A", profile_id: "me" }, { team_id: "A", profile_id: "mate1" }, { team_id: "A", profile_id: "mate2" }, { team_id: "B", profile_id: "opp" });
db.t.team_stat_sharing.push({ team_id: "A", profile_id: "mate1", game: "ROCKET_LEAGUE" }, { team_id: "A", profile_id: "me", game: "ROCKET_LEAGUE" });
const events = [];
let reads = 0;
const client = { details: async () => { reads++; return replay(); }, ping: async () => true };
const deps = { admin: db, client, team: { build: teamScrimFromReplay, members: sharingMembers }, track: async (u, name, props) => { events.push({ u, name, props }); } };
const submit = (user, o = {}) => runReplayImport(deps, user, `https://ballchasing.com/replay/${ID}`, { authorized: true, consent: true, via: "discord", ...o });

// 1. Submit via Discord without choosing the team: private only.
let r = await submit("me", { forTeam: false });
check(r.ok && r.imported && db.t.team_scrims.length === 0 && r.team === undefined, "without choosing the team, the replay stays private: no team scrim");
// 2. Duplicate, now choosing the team: the personal row exists, the team scrim is added (one more read), with the label.
r = await submit("me", { forTeam: true, opponent: "Rival" });
check(r.ok && r.team === "added" && db.t.team_scrims.length === 1 && db.t.game_matches.filter((m) => m.profile_id === "me").length === 1, "choosing the team later adds the team scrim without a second personal row");
check(/already saved/.test(r.message) && r.message.includes(TEAM_MESSAGES.added), "the reply says the own numbers were already saved and the scrim was added");
check(db.t.team_scrim_lines.map((l) => l.profile_id).sort().join() === "mate1,me", "lines only for opted in members who were found on the side (mate2 did not opt in)");
check(db.t.team_scrims[0].opponent_label === "Rival" && db.t.team_scrims[0].via === "discord" && db.t.team_scrims[0].side === "blue", "the scrim records the typed label, the channel and the side");
// 3. Exact duplicate: nothing new, no Ballchasing read.
const before = reads;
r = await submit("me", { forTeam: true });
check(r.ok && r.team === "already" && reads === before && db.t.team_scrims.length === 1, "an exact duplicate stores nothing new and does not read Ballchasing again");
check(r.message.includes(TEAM_MESSAGES.already), "the duplicate reply says the team already has it");
// 4. A teammate submits the same replay for the team: their own private row, team already has it.
r = await submit("mate1", { forTeam: true });
check(r.ok && r.imported && r.team === "already" && db.t.team_scrims.length === 1, "a teammate submitting the same replay gets their own private row; the team keeps one scrim");
// 5. The other team submits the same replay: a separate scrim for their team, their side, no lines for team A.
r = await submit("opp", { forTeam: true });
const bScrim = db.t.team_scrims.find((s) => s.team_id === "B");
check(r.ok && r.team === "added" && bScrim && bScrim.side === "orange" && bScrim.goals_for === 1 && bScrim.goals_against === 3, "the other team's submission is a separate scrim from their side");
check(!db.t.team_scrim_lines.some((l) => l.scrim_id === bScrim.id), "team A's members get no lines in team B's scrim");
// 6. Non roster player: personal row only, told why.
r = await submit("loner", { forTeam: true });
check(r.ok && r.team === "no_team" && r.message.includes(TEAM_MESSAGES.no_team) && db.t.team_scrims.length === 2, "a player on no roster gets no team scrim and is told so; their own numbers are still saved");
// 7. Events: first, then repeat; processing completed only when something was saved; never a stat or an id.
const mine = events.filter((e) => e.u === "me").map((e) => e.name);
check(mine.filter((n) => n === "first_scrim_submitted").length === 3, "every accepted submission is reported as first_scrim_submitted; the database records later ones as repeat_scrim_submitted");
check(mine.filter((n) => n === "scrim_processing_completed").length === 2, "processing completed is reported when something was saved (private row, then team scrim), not for an exact duplicate");
check(events.every((e) => Object.keys(e.props).sort().join() === "game,source" && e.props.source === "discord" && e.props.game === "ROCKET_LEAGUE"), "events carry only the source and the game: no stats, replay ids or player ids");
// 8. A failed read reports no processing.
const n0 = events.length;
const bad = await runReplayImport({ ...deps, client: { details: async () => { throw Object.assign(new Error("x"), { code: "not_found" }); }, ping: async () => true } }, "mate2", ID, { authorized: true, consent: true, via: "web", forTeam: true });
check(!bad.ok && events.slice(n0).map((e) => e.name).join() === "first_scrim_submitted", "a failed submission reports the submission but not processing completed");
// 9. Event failures never reach the player.
const r9 = await runReplayImport({ ...deps, track: async () => { throw new Error("db down"); } }, "mate2", ID, { authorized: true, consent: true, via: "web" });
check(r9.ok, "a failing event recorder does not affect the submission");

console.log(failed ? `\n${failed} FAILED` : "\nAll team scrim checks passed.");
process.exit(failed ? 1 : 0);
