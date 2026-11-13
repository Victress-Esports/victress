// Rocket League replay link import. Self contained and free of server only imports so the whole pipeline is testable with stubs.
// Flow: a player submits a Ballchasing replay link -> we read the replay through the existing Ballchasing client (a READ, which uses
// the read limits, never the upload quota) -> we find the submitting player's own slot by their stored platform and player id ->
// we store one row in game_matches (source 'api', detail 'ballchasing_replay'). Everyone else in the replay is kept as an anonymous
// slot with no name, platform or id: other participants are never identified.
//
// Identity: Ballchasing is not a Steam service. Replays carry each player's own platform and id as Ballchasing reports them
// (observed in real replays: steam, epic, ps4, psynet, xbox; switch is supported but was not in the sample). A player's saved identity
// is matched by EXACT platform and id. Nothing is guessed: PlayStation ids come in two shapes (ps4: numeric, psynet: hex) and they are
// different identities, so they are never treated as equal. Slots with no platform or id are never matched to anyone.

export const BC_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Any platform token Ballchasing might report. The database accepts the same pattern, so a new platform needs no migration. */
export const PLATFORM_PATTERN = /^[a-z0-9]{2,16}$/;
/** Platforms offered in the manual form. A platform that is not listed can still be saved by pasting the Ballchasing player link. */
export const PLATFORM_OPTIONS = [
  { value: "steam", label: "Steam" },
  { value: "epic", label: "Epic Games" },
  { value: "xbox", label: "Xbox" },
  { value: "ps4", label: "PlayStation (numeric ID)" },
  { value: "psynet", label: "PlayStation Network (psynet)" },
  { value: "switch", label: "Nintendo Switch" },
] as const;
export const PLATFORMS = PLATFORM_OPTIONS.map((o) => o.value) as readonly string[];
export const platformLabel = (p: string | null | undefined) => PLATFORM_OPTIONS.find((o) => o.value === p)?.label ?? (p ? p : "Unknown platform");
export const ACCEPTED_VISIBILITY = ["public", "unlisted"] as const;
/** On screen label for data that came from a player submitted replay (founder decision 2026-11-12). */
export const RL_DATA_LABEL = "Player-submitted Ballchasing replay";

// Limits. Reads share Ballchasing's 500 per hour on our key, so one player cannot use the pilot's room.
export const LIMITS = { perUserHour: 10, perUserDay: 40, allUsersHour: 350 } as const;
/** How long one submission may run before it is closed as failed and the player is told. Must stay under the function's maxDuration. */
export const DEFAULT_DEADLINE_MS = 40_000;
/** A job still running after this long has been abandoned (the function that owned it was stopped). */
export const STALE_JOB_MS = 3 * 60_000;

export type LinkFail = "empty" | "not_ballchasing" | "group" | "player" | "replay_id" | "other";

/** Accepts a replay id or a ballchasing.com/replay/<id> link (any query, hash or trailing slash). Anything else is refused, with the reason. */
export function parseReplayRef(input: string): { ok: true; id: string } | { ok: false; reason: LinkFail } {
  const raw = String(input ?? "").trim();
  if (raw.length === 0) return { ok: false, reason: "empty" };
  if (raw.length > 300) return { ok: false, reason: "other" };
  if (BC_UUID.test(raw.toLowerCase())) return { ok: true, id: raw.toLowerCase() };
  const withScheme = /^https:\/\//i.test(raw) ? raw : /^(www\.)?ballchasing\.com\//i.test(raw) ? `https://${raw}` : "";
  if (!withScheme) return { ok: false, reason: "not_ballchasing" };
  try {
    const u = new URL(withScheme);
    if (u.username || u.password) return { ok: false, reason: "not_ballchasing" };
    if (u.hostname !== "ballchasing.com" && u.hostname !== "www.ballchasing.com") return { ok: false, reason: "not_ballchasing" };
    const m = u.pathname.match(/^\/replay\/([^/]+)\/?$/);
    if (m) return BC_UUID.test(m[1].toLowerCase()) ? { ok: true, id: m[1].toLowerCase() } : { ok: false, reason: "replay_id" };
    if (/^\/group\//.test(u.pathname)) return { ok: false, reason: "group" };
    if (/^\/player\//.test(u.pathname)) return { ok: false, reason: "player" };
  } catch { /* fall through */ }
  return { ok: false, reason: "other" };
}

export type IdentityFail = "empty" | "needs_player_link" | "missing_platform" | "unknown_platform" | "bad_id" | "steam_format" | "epic_format";
const ID_GENERIC = /^[A-Za-z0-9_.:@-]{1,64}$/;

/**
 * A Rocket League identity from either (a) a Ballchasing player link, https://ballchasing.com/player/<platform>/<id>, which carries the
 * platform and id exactly as Ballchasing reports them and may name ANY platform (the preferred path), or (b) a platform chosen from the
 * list plus an id. Obvious format mistakes are caught (a Steam id is 17 digits, an Epic id is 32 hex characters).
 */
export function parseIdentity(platformInput: string, idInput: string): { ok: true; platform: string; id: string; source: "link" | "manual" } | { ok: false; reason: IdentityFail } {
  const rawId = String(idInput ?? "").trim();
  let platform = String(platformInput ?? "").trim().toLowerCase();
  let id = rawId;
  let source: "link" | "manual" = "manual";
  if (/ballchasing\.com/i.test(rawId)) {
    const m = rawId.match(/ballchasing\.com\/player\/([^/?#\s]+)\/([^/?#\s]+)/i);
    if (!m) return { ok: false, reason: "needs_player_link" };
    try { platform = decodeURIComponent(m[1]).toLowerCase(); id = decodeURIComponent(m[2]); } catch { return { ok: false, reason: "bad_id" }; }
    if (!PLATFORM_PATTERN.test(platform)) return { ok: false, reason: "unknown_platform" };
    source = "link";
  } else {
    if (rawId.length === 0) return { ok: false, reason: "empty" };
    if (platform.length === 0) return { ok: false, reason: "missing_platform" };
    if (!PLATFORMS.includes(platform)) return { ok: false, reason: "unknown_platform" };
  }
  if (!ID_GENERIC.test(id)) return { ok: false, reason: "bad_id" };
  if (platform === "steam" && !/^\d{17}$/.test(id)) return { ok: false, reason: "steam_format" };
  if (platform === "epic" && !/^[0-9a-fA-F]{32}$/.test(id)) return { ok: false, reason: "epic_format" };
  return { ok: true, platform, id, source };
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

const KEEP: Record<string, string[]> = {
  core: ["score", "goals", "assists", "saves", "shots", "shooting_percentage", "mvp", "goals_against", "shots_against", "aerial_hits", "clears", "centers", "epic_saves", "first_touches", "flip_resets", "bicycle_hits", "crossbar_hits", "juggle_hits"],
  boost: ["bpm", "bcpm", "avg_amount", "amount_collected", "amount_stolen", "amount_overfill", "time_zero_boost", "time_full_boost", "percent_zero_boost", "percent_full_boost", "count_collected_big", "count_collected_small", "count_stolen_big", "count_stolen_small"],
  movement: ["avg_speed", "total_distance", "time_supersonic_speed", "percent_supersonic_speed", "time_boost_speed", "percent_boost_speed", "time_slow_speed", "percent_slow_speed", "percent_ground", "percent_low_air", "percent_high_air", "count_powerslide", "time_powerslide"],
  positioning: ["percent_defensive_third", "percent_neutral_third", "percent_offensive_third", "percent_defensive_half", "percent_offensive_half", "percent_behind_ball", "percent_infront_ball", "avg_distance_to_ball", "avg_distance_to_mates", "percent_most_back", "percent_most_forward", "percent_closest_to_ball", "goals_against_while_last_defender"],
  demo: ["inflicted", "taken"],
};
/** Numbers only, from a fixed list of statistic names. Names, ids, car and camera settings are never copied. */
function pick(stats: unknown): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  if (!isRec(stats)) return out;
  for (const [group, keys] of Object.entries(KEEP)) {
    const g = stats[group];
    if (!isRec(g)) continue;
    const o: Record<string, number> = {};
    for (const k of keys) { const n = num(g[k]); if (n !== undefined) o[k] = n; }
    if (Object.keys(o).length) out[group] = o;
  }
  return out;
}

export type ReplayRow = {
  external_id: string; queue_id: null; queue_kind: "ranked" | "normal" | "custom" | "other"; queue_label: string | null; played_at: string;
  duration_seconds: number; game_version: null; result: "win" | "loss" | "remake";
  me: Record<string, unknown>; participants: Record<string, unknown>[]; objectives: Record<string, unknown>;
};
export type NormalizeFail = "not_ok" | "bad_shape" | "visibility" | "not_in_replay" | "ambiguous_identity" | "bad_date";
/** Aggregate facts that explain a failed match. Never a name or another player's id. */
export type NormalizeInfo = { totalSlots: number; slotsWithoutId: number; foundOnPlatform?: string };

export function queueKind(playlistId: unknown, matchType: unknown): ReplayRow["queue_kind"] {
  const p = String(playlistId ?? "").toLowerCase();
  if (p.startsWith("ranked")) return "ranked";
  if (p.startsWith("unranked")) return "normal";
  if (p === "private" || String(matchType ?? "").toLowerCase() === "private") return "custom";
  return "other";
}

export function normalizeReplay(detail: unknown, who: { platform: string; id: string }): { ok: true; row: ReplayRow } | { ok: false; reason: NormalizeFail; info?: NormalizeInfo } {
  if (!isRec(detail)) return { ok: false, reason: "bad_shape" };
  const id = String(detail.id ?? "");
  if (!BC_UUID.test(id)) return { ok: false, reason: "bad_shape" };
  if (detail.status !== "ok") return { ok: false, reason: "not_ok" };
  if (!(ACCEPTED_VISIBILITY as readonly string[]).includes(String(detail.visibility))) return { ok: false, reason: "visibility" };
  const teams: { color: "blue" | "orange"; players: Rec[]; goals: number }[] = [];
  for (const color of ["blue", "orange"] as const) {
    const t = detail[color];
    if (!isRec(t) || !Array.isArray(t.players)) return { ok: false, reason: "bad_shape" };
    const players = t.players.filter(isRec);
    const teamGoals = isRec(t.stats) && isRec(t.stats.core) ? num(t.stats.core.goals) : undefined;
    const sum = players.reduce((a, p) => a + (isRec(p.stats) && isRec(p.stats.core) ? num(p.stats.core.goals) ?? 0 : 0), 0);
    teams.push({ color, players, goals: teamGoals ?? sum });
  }
  const want = { platform: String(who?.platform ?? "").toLowerCase(), id: String(who?.id ?? "").toLowerCase() };
  const idOf = (p: Rec) => { const pid = isRec(p.id) ? p.id : {}; return { platform: String(pid.platform ?? "").toLowerCase(), id: String(pid.id ?? "").toLowerCase() }; };
  const all = teams.flatMap((t) => t.players);
  const info: NormalizeInfo = { totalSlots: all.length, slotsWithoutId: all.filter((p) => { const x = idOf(p); return !x.platform || !x.id; }).length };
  if (!want.platform || !want.id) return { ok: false, reason: "not_in_replay", info };
  const hits: { team: number; index: number }[] = [];
  teams.forEach((t, ti) => t.players.forEach((p, i) => { const x = idOf(p); if (x.platform === want.platform && x.id === want.id) hits.push({ team: ti, index: i }); }));
  if (hits.length === 0) {
    // The same id under another platform name is the submitter's own id: say so, but never match across platforms.
    const other = all.map(idOf).find((x) => x.id === want.id && x.platform && x.platform !== want.platform);
    return { ok: false, reason: "not_in_replay", info: { ...info, foundOnPlatform: other?.platform } };
  }
  if (hits.length > 1) return { ok: false, reason: "ambiguous_identity", info };
  const mine = teams[hits[0].team], theirs = teams[1 - hits[0].team];
  const me = mine.players[hits[0].index];
  const playedAt = new Date(String(detail.date ?? ""));
  if (Number.isNaN(playedAt.getTime())) return { ok: false, reason: "bad_date" };
  const duration = Math.round(num(detail.play_duration) ?? num(detail.duration) ?? 0);

  let slot = 0;
  const participants: Record<string, unknown>[] = [];
  teams.forEach((t) => t.players.forEach((p) => {
    const c = isRec(p.stats) && isRec(p.stats.core) ? p.stats.core : {};
    const slim: Record<string, number> = {};
    for (const k of ["score", "goals", "assists", "saves", "shots"]) { const n = num(c[k]); if (n !== undefined) slim[k] = n; }
    participants.push({ slot: slot++, team: t.color, core: slim });
  }));
  const meSlot = (teams[0].color === mine.color ? 0 : teams[0].players.length) + hits[0].index;

  const label = typeof detail.playlist_name === "string" ? detail.playlist_name.slice(0, 80) : typeof detail.playlist_id === "string" ? detail.playlist_id.slice(0, 80) : null;
  return {
    ok: true,
    row: {
      external_id: id, queue_id: null, queue_kind: queueKind(detail.playlist_id, detail.match_type), queue_label: label,
      played_at: playedAt.toISOString(), duration_seconds: Math.min(Math.max(duration, 0), 20000), game_version: null,
      result: mine.goals > theirs.goals ? "win" : mine.goals < theirs.goals ? "loss" : "remake",
      me: { slot: meSlot, team: mine.color, ...pick(me.stats) },
      participants,
      objectives: {
        blue_goals: teams[0].goals, orange_goals: teams[1].goals, overtime: detail.overtime === true,
        team_size: num(detail.team_size) ?? null, map: typeof detail.map_name === "string" ? detail.map_name.slice(0, 60) : null,
        visibility: String(detail.visibility),
      },
    },
  };
}

// ---------------------------------------------------------------- the import pipeline

export type Deps = {
  admin: any; // service role Supabase client
  client: { details(id: string): Promise<Record<string, unknown>>; ping(): Promise<boolean> };
  now?: () => Date;
  /** Overall time allowed for one submission. Defaults to DEFAULT_DEADLINE_MS. */
  deadlineMs?: number;
  /** The team step (lib/ballchasing/team.ts), injected so this module keeps no imports. Needed only when a player adds a replay to their team. */
  team?: {
    build: (detail: unknown, submitter: { platform: string; id: string }, members: TeamMember[], base: { queue_kind: ReplayRow["queue_kind"]; played_at: string; duration_seconds: number }, opponentLabel?: unknown) => { ok: true; payload: unknown } | { ok: false; reason: string };
    members: (admin: any, teamId: string) => Promise<TeamMember[]>;
  };
  /** First party product events (public.events). Never given replay numbers or ids. Failures are ignored. */
  track?: (userId: string, name: "first_scrim_submitted" | "scrim_processing_completed", props: { source: "web" | "discord"; game: "ROCKET_LEAGUE" }) => Promise<unknown>;
};
export type TeamMember = { profile_id: string; platform: string; id: string };
/** What happened on the team side: added, already there, not on a roster, a 1v1 replay, or failed. Absent when not asked. */
export type TeamOutcome = "added" | "already" | "no_team" | "solo_replay" | "failed";
export type ImportResult = { ok: boolean; message: string; code: string; jobId?: string; imported?: boolean; team?: TeamOutcome };
export type ImportOptions = {
  authorized: boolean; consent: boolean; via: "web" | "discord";
  /** The player chose to add this replay to their current team's scrims (off unless chosen). */
  forTeam?: boolean;
  /** Optional opponent label typed by the player. Never read from the replay. */
  opponent?: string;
};

export const TEAM_MESSAGES: Record<TeamOutcome, string> = {
  added: "Added to your team's scrims. Your teammates can see the result on the Team scrims page.",
  already: "Your team already has this scrim, so nothing was added to it.",
  no_team: "You are not on a team roster, so nothing was added to a team. Your own numbers are still saved privately.",
  solo_replay: "This is a 1v1 replay, so it was not added to your team's scrims.",
  failed: "Your own numbers were handled, but adding the replay to your team's scrims failed. Try submitting it again.",
};

const VISIBILITY_HELP = "On Ballchasing open the replay, choose Edit, set Visibility to Unlisted or Public, wait a minute, then submit it again.";
const LINK_HELP = "Paste the link of one replay, like https://ballchasing.com/replay/… (the address of the replay page).";
export const MESSAGES: Record<string, string> = {
  empty: "Paste a Ballchasing replay link first.",
  invalid_link: `That does not look like a Ballchasing replay link. ${LINK_HELP}`,
  not_ballchasing: `That is not a Ballchasing replay link. Links must start with https://ballchasing.com/replay/. ${LINK_HELP}`,
  group: `That is a Ballchasing group link, not a single replay. Open one replay from the group and paste that replay's link. ${LINK_HELP}`,
  player: `That is a Ballchasing player link, not a replay. Paste a replay link here. (Your player link belongs in the Rocket League ID box.)`,
  replay_id: `The replay ID in that link is not valid. Copy the full address from the replay page. ${LINK_HELP}`,
  consent_required: "Confirm that you are allowed to submit this replay and that you agree to Victress processing it.",
  no_identity: "Add your Rocket League ID first, so Victress can find your own numbers in a replay. Paste your Ballchasing player link, or choose your platform and enter your ID.",
  busy: "A replay is already being processed. Wait for it to finish, or check Your submissions in a minute.",
  rate_user: "You have submitted several replays recently. Try again later.",
  rate_global: "Replay processing is busy right now. Try again in a little while.",
  not_found: `Ballchasing has no replay at that link, or the replay is private. Check the link. If it is your replay, make it readable. ${VISIBILITY_HELP}`,
  private: `Ballchasing did not let Victress read that replay. This usually means it is private. ${VISIBILITY_HELP}`,
  visibility: `That replay is private, so Victress cannot read it. ${VISIBILITY_HELP}`,
  unavailable: "Ballchasing is not answering right now. Your submission was not saved. Try again in a few minutes.",
  timeout: "This took too long and was stopped, so nothing was saved. Try again in a minute. If it keeps happening, tell us.",
  not_configured: "Rocket League replay import is not configured on this server yet.",
  not_ok: "Ballchasing has not finished processing that replay, or could not process it. Wait a few minutes and submit it again. If it still fails, upload the replay to Ballchasing again.",
  bad_shape: "Victress could not read that replay's data. It may be an unsupported or unfinished replay, so nothing was saved.",
  ambiguous_identity: "Your Rocket League ID appears more than once in this replay, so nothing was saved. Victress will not guess which one is you.",
  bad_date: "Victress could not read when that replay was played, so nothing was saved.",
  already: "You already submitted this replay. Nothing new was saved.",
  unexpected: "Something went wrong. Try again.",
};

/** The message for a code, with the aggregate facts that help explain a failed match (never a name or another player's id). */
export function messageFor(code: string, info?: NormalizeInfo): string {
  if (code === "not_in_replay") {
    const base = "Your saved Rocket League ID was not found among the players in this replay, so nothing was saved.";
    if (info?.foundOnPlatform) return `${base} Your ID does appear in this replay under the platform "${info.foundOnPlatform}", but you saved a different platform. Update your Rocket League ID (the easiest way is to paste your Ballchasing player link) and submit again.`;
    const gaps = info && info.slotsWithoutId > 0 ? ` ${info.slotsWithoutId} of ${info.totalSlots} players in this replay have no ID recorded (this happens with bots and some private matches). If you are one of them, Victress cannot match you in this replay, and it will not guess.` : "";
    return `${base} Check that you played in this replay and that your platform and ID are the ones Ballchasing shows for you: open the replay, click your name, and compare, or paste your player link. ${gaps}`.trim();
  }
  return MESSAGES[code] ?? MESSAGES.unexpected;
}
const say = messageFor;

/** Closes jobs left running by a function that was stopped, so a player is never stuck behind one. Returns how many were closed. */
export async function sweepStaleJobs(admin: any, userId: string, now: Date = new Date(), olderThanMs: number = STALE_JOB_MS): Promise<void> {
  await admin.from("import_jobs").update({ status: "failed", error_code: "timeout", error_message: MESSAGES.timeout, finished_at: now.toISOString() })
    .eq("profile_id", userId).in("status", ["queued", "running"]).lt("created_at", new Date(now.getTime() - olderThanMs).toISOString());
}

/** What to tell a player whose identity could not be saved. */
export const IDENTITY_MESSAGES: Record<IdentityFail, string> = {
  empty: "Paste your Ballchasing player link, or choose your platform and enter your player ID.",
  needs_player_link: "That is a Ballchasing link, but not a player link. Open a replay you played in on ballchasing.com, click your own name, and paste that address. It looks like https://ballchasing.com/player/…",
  missing_platform: "Choose your platform first, or paste your Ballchasing player link, which already includes it.",
  unknown_platform: "Victress does not recognize that platform. Paste your Ballchasing player link instead: it carries your platform exactly as Ballchasing reports it.",
  bad_id: "That ID has characters Victress does not expect. Copy it from your Ballchasing player link instead.",
  steam_format: "A Steam ID here is 17 digits, not your Steam name. The easiest fix is to paste your Ballchasing player link.",
  epic_format: "An Epic ID here is 32 letters and numbers, not your Epic display name. Paste your Ballchasing player link, which contains it.",
};

type Ids = { jobId?: string };
type RunState = { timedOut: boolean; jobId?: string };

export async function runReplayImport(deps: Deps, userId: string, linkOrId: string, opts: ImportOptions): Promise<ImportResult> {
  const now = deps.now ? deps.now() : new Date();
  const state: RunState = { timedOut: false };
  let timer: ReturnType<typeof setTimeout> | undefined;
  // The whole submission has a deadline. If it passes, the job is closed as failed and the player is told; any late work is discarded.
  const deadline = new Promise<ImportResult>((resolve) => {
    timer = setTimeout(async () => {
      state.timedOut = true;
      if (state.jobId) {
        await deps.admin.from("import_jobs").update({ status: "failed", error_code: "timeout", error_message: say("timeout"), finished_at: new Date().toISOString() })
          .eq("id", state.jobId).eq("status", "running").then(() => undefined, () => undefined);
      }
      resolve({ ok: false, code: "timeout", message: say("timeout"), jobId: state.jobId });
    }, deps.deadlineMs ?? DEFAULT_DEADLINE_MS);
  });
  try { return await Promise.race([importOnce(deps, userId, linkOrId, opts, now, state), deadline]); }
  finally { if (timer) clearTimeout(timer); }
}

async function importOnce(deps: Deps, userId: string, linkOrId: string, opts: ImportOptions, now: Date, state: RunState): Promise<ImportResult> {
  const { admin, client } = deps;
  const fail = (code: string, ids: Ids = {}, info?: NormalizeInfo): ImportResult => ({ ok: false, code, message: say(code, info), jobId: ids.jobId });

  const ref = parseReplayRef(linkOrId);
  if (!ref.ok) return fail(ref.reason === "other" ? "invalid_link" : ref.reason);
  if (!opts.authorized || !opts.consent) return fail("consent_required");

  const { data: acct } = await admin.from("game_accounts").select("id, external_id, platform").eq("profile_id", userId).eq("game", "ROCKET_LEAGUE").maybeSingle();
  if (!acct || !acct.platform) return fail("no_identity");

  const since = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const count = async (q: (b: any) => any) => { const r = await q(admin.from("import_jobs").select("id", { count: "exact", head: true }).eq("provider", "ballchasing")); return r.count ?? 0; };
  if ((await count((b) => b.eq("profile_id", userId).gte("created_at", since(3_600_000)))) >= LIMITS.perUserHour) return fail("rate_user");
  if ((await count((b) => b.eq("profile_id", userId).gte("created_at", since(86_400_000)))) >= LIMITS.perUserDay) return fail("rate_user");
  if ((await count((b) => b.gte("created_at", since(3_600_000)))) >= LIMITS.allUsersHour) return fail("rate_global");

  await sweepStaleJobs(admin, userId, now);
  const { data: job, error: jobError } = await admin.from("import_jobs").insert({
    profile_id: userId, game: "ROCKET_LEAGUE", provider: "ballchasing", requested: 1, status: "running", started_at: now.toISOString(),
    external_ref: ref.id, submitted_via: opts.via, consent_at: now.toISOString(),
  }).select("id").single();
  if (jobError || !job) return fail(jobError?.code === "23505" ? "busy" : "unexpected");
  state.jobId = job.id;
  const ids: Ids = { jobId: job.id };
  const track = (name: "first_scrim_submitted" | "scrim_processing_completed") =>
    deps.track ? deps.track(userId, name, { source: opts.via, game: "ROCKET_LEAGUE" }).catch(() => undefined) : Promise.resolve();
  await track("first_scrim_submitted"); // the database turns a second one into repeat_scrim_submitted

  // Team side, only when the player chose it: the submitter's CURRENT team (one team per player). A player on no roster gets no team row.
  let teamId: string | null = null;
  let teamOutcome: TeamOutcome | undefined;
  let teamHave = false;
  if (opts.forTeam) {
    const { data: tm } = await admin.from("team_members").select("team_id").eq("profile_id", userId).maybeSingle();
    teamId = tm?.team_id ?? null;
    if (!teamId) teamOutcome = "no_team";
    else {
      const { data: ts } = await admin.from("team_scrims").select("id").eq("team_id", teamId).eq("replay_id", ref.id).maybeSingle();
      teamHave = !!ts;
      if (teamHave) teamOutcome = "already";
    }
  }
  const teamNote = () => (teamOutcome ? `\n${TEAM_MESSAGES[teamOutcome]}` : "");

  const finish = async (code: string, ok: boolean, extra: Record<string, unknown> = {}, info?: NormalizeInfo): Promise<ImportResult> => {
    if (state.timedOut) return { ok: false, code: "timeout", message: say("timeout"), jobId: job.id }; // the deadline already closed this job
    await admin.from("import_jobs").update({
      status: ok ? "succeeded" : "failed", error_code: ok ? null : code, error_message: ok ? null : say(code, info).slice(0, 200), finished_at: new Date().toISOString(), ...extra,
    }).eq("id", job.id);
    const imported = ok && !extra.skipped_existing;
    if (imported || teamOutcome === "added") await track("scrim_processing_completed");
    const base = !ok ? say(code, info)
      : !extra.skipped_existing ? "Saved. Your numbers from this replay are on your Rocket League page."
      : teamOutcome === "added" ? "Your own numbers from this replay were already saved." : say("already");
    return { ok, code, message: base + (ok ? teamNote() : ""), jobId: job.id, imported, team: teamOutcome };
  };
  const already = async () => ({ ...(await finish("already", true, { skipped_existing: 1 })), code: "already" });

  try {
    const { data: have } = await admin.from("game_matches").select("id").eq("profile_id", userId).eq("game", "ROCKET_LEAGUE").eq("external_id", ref.id).maybeSingle();
    const teamPending = !!(opts.forTeam && teamId && !teamHave);
    if (have && !teamPending) return await already();

    let detail: Record<string, unknown>;
    try { detail = await client.details(ref.id); }
    catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "not_found") return await finish("not_found", false, { failed_matches: 1 });
      if (code === "auth") {
        // 401/403 is either our token or a replay we may not read. The ping tells them apart.
        const tokenWorks = await client.ping().then(() => true, () => false);
        return await finish(tokenWorks ? "private" : "not_configured", false, { failed_matches: 1 });
      }
      if (code === "rate_limited" || code === "unavailable") return await finish("unavailable", false, { failed_matches: 1 });
      return await finish("unexpected", false, { failed_matches: 1 });
    }
    if (state.timedOut) return fail("timeout", ids);

    const who = { platform: String(acct.platform), id: String(acct.external_id) };
    const n = normalizeReplay(detail, who);
    if (!n.ok) return await finish(n.reason, false, { failed_matches: 1 }, n.info);

    let personalNew = false;
    if (!have) {
      const { error } = await admin.from("game_matches").insert({
        profile_id: userId, account_id: acct.id, game: "ROCKET_LEAGUE", source: "api", source_detail: "ballchasing_replay", ...n.row,
      });
      if (error && error.code !== "23505") return await finish("unexpected", false, { failed_matches: 1 });
      personalNew = !error;
      if (personalNew) await admin.from("game_accounts").update({ last_imported_at: new Date().toISOString() }).eq("id", acct.id);
    }

    if (teamPending && teamId) {
      if (state.timedOut) return fail("timeout", ids);
      teamOutcome = await addToTeam(deps, userId, teamId, detail, who, n.row, opts);
    }
    return personalNew ? await finish("ok", true, { imported: 1 }) : await already();
  } catch {
    return await finish("unexpected", false, { failed_matches: 1 }).catch(() => fail("unexpected", ids));
  }
}

/**
 * Adds the replay to the submitter's current team. The opponent side becomes totals only; individual lines are built only for roster
 * members who opted in, and the database (record_team_scrim) checks membership and the opt in again before storing anything.
 */
async function addToTeam(deps: Deps, userId: string, teamId: string, detail: unknown, who: { platform: string; id: string }, row: ReplayRow, opts: ImportOptions): Promise<TeamOutcome> {
  if (!deps.team) return "failed";
  try {
    const members = await deps.team.members(deps.admin, teamId);
    const built = deps.team.build(detail, who, members, { queue_kind: row.queue_kind, played_at: row.played_at, duration_seconds: row.duration_seconds }, opts.opponent);
    if (!built.ok) return built.reason === "solo_replay" ? "solo_replay" : "failed";
    const { data, error } = await deps.admin.rpc("record_team_scrim", { p_submitter: userId, p: { ...(built.payload as object), via: opts.via } });
    if (error) return "failed";
    const status = (data as { status?: string } | null)?.status;
    return status === "ok" ? "added" : status === "already" ? "already" : status === "no_team" ? "no_team" : status === "solo_replay" ? "solo_replay" : "failed";
  } catch {
    return "failed";
  }
}
