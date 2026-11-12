// Rocket League replay link import. Self contained and free of server only imports so the whole pipeline is testable with stubs.
// Flow: a player submits a Ballchasing replay link -> we read the replay through the existing Ballchasing client (a READ, which uses
// the read limits, never the upload quota) -> we find the submitting player's own slot by their stored platform and player id ->
// we store one row in game_matches (source 'api', detail 'ballchasing_replay'). Everyone else in the replay is kept as an anonymous
// slot with no name, platform or id: other participants are never identified.

export const BC_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const PLATFORMS = ["steam", "epic", "xbox", "ps4", "switch"] as const;
export type RlPlatform = (typeof PLATFORMS)[number];
export const ACCEPTED_VISIBILITY = ["public", "unlisted"] as const;
/** On screen label for data that came from a player submitted replay (founder decision 2026-11-12). */
export const RL_DATA_LABEL = "Player-submitted Ballchasing replay";

// Limits. Reads share Ballchasing's 500 per hour on our key, so one player cannot use the pilot's room.
export const LIMITS = { perUserHour: 10, perUserDay: 40, allUsersHour: 350 } as const;

/** Accepts a replay id or a ballchasing.com/replay/<id> link (any query, hash or trailing slash). Anything else is refused. */
export function parseReplayRef(input: string): { ok: true; id: string } | { ok: false } {
  const raw = String(input ?? "").trim();
  if (raw.length === 0 || raw.length > 300) return { ok: false };
  if (BC_UUID.test(raw.toLowerCase())) return { ok: true, id: raw.toLowerCase() };
  const withScheme = /^https?:\/\//i.test(raw) ? raw : /^(www\.)?ballchasing\.com\//i.test(raw) ? `https://${raw}` : "";
  if (!withScheme) return { ok: false };
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" || u.username || u.password) return { ok: false };
    if (u.hostname !== "ballchasing.com" && u.hostname !== "www.ballchasing.com") return { ok: false };
    const m = u.pathname.match(/^\/replay\/([0-9a-fA-F-]{36})\/?$/);
    if (m && BC_UUID.test(m[1].toLowerCase())) return { ok: true, id: m[1].toLowerCase() };
  } catch { /* fall through */ }
  return { ok: false };
}

/** Accepts "platform + id", or a ballchasing.com/player/<platform>/<id> profile link, and returns a clean identity. */
export function parseIdentity(platformInput: string, idInput: string): { ok: true; platform: RlPlatform; id: string } | { ok: false } {
  let platform = String(platformInput ?? "").trim().toLowerCase();
  let id = String(idInput ?? "").trim();
  const m = id.match(/^(?:https?:\/\/)?(?:www\.)?ballchasing\.com\/player\/([a-z0-9]+)\/([^/?#\s]+)/i);
  if (m) { platform = m[1].toLowerCase(); try { id = decodeURIComponent(m[2]); } catch { return { ok: false }; } }
  if (platform === "ps5" || platform === "playstation" || platform === "psn") platform = "ps4";
  if (platform === "xboxone" || platform === "xbox_one") platform = "xbox";
  if (!(PLATFORMS as readonly string[]).includes(platform)) return { ok: false };
  if (id.length < 1 || id.length > 64 || !/^[A-Za-z0-9_.:@-]+$/.test(id)) return { ok: false };
  return { ok: true, platform: platform as RlPlatform, id };
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

export function queueKind(playlistId: unknown, matchType: unknown): ReplayRow["queue_kind"] {
  const p = String(playlistId ?? "").toLowerCase();
  if (p.startsWith("ranked")) return "ranked";
  if (p.startsWith("unranked")) return "normal";
  if (p === "private" || String(matchType ?? "").toLowerCase() === "private") return "custom";
  return "other";
}

export function normalizeReplay(detail: unknown, who: { platform: string; id: string }): { ok: true; row: ReplayRow } | { ok: false; reason: NormalizeFail } {
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
  const want = { platform: who.platform.toLowerCase(), id: who.id.toLowerCase() };
  const hits: { team: number; index: number }[] = [];
  teams.forEach((t, ti) => t.players.forEach((p, i) => {
    const pid = isRec(p.id) ? p.id : {};
    if (String(pid.platform ?? "").toLowerCase() === want.platform && String(pid.id ?? "").toLowerCase() === want.id) hits.push({ team: ti, index: i });
  }));
  if (hits.length === 0) return { ok: false, reason: "not_in_replay" };
  if (hits.length > 1) return { ok: false, reason: "ambiguous_identity" };
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
};
export type ImportResult = { ok: boolean; message: string; code: string; jobId?: string; imported?: boolean };
export type ImportOptions = { authorized: boolean; consent: boolean; via: "web" | "discord" };

const MESSAGES: Record<string, string> = {
  invalid_link: "That does not look like a Ballchasing replay link. Paste the link from ballchasing.com/replay/….",
  consent_required: "Confirm that you are allowed to submit this replay and that you agree to Victress processing it.",
  no_identity: "Add your Rocket League platform and player ID first, so Victress can find your numbers in the replay.",
  busy: "A replay is already being processed. Wait for it to finish.",
  rate_user: "You have submitted several replays recently. Try again later.",
  rate_global: "Replay processing is busy right now. Try again in a little while.",
  not_found: "Ballchasing has no replay at that link. Check the link, or make sure the replay is not deleted.",
  private: "Victress can only read replays set to unlisted or public on Ballchasing. Change this replay's visibility there, then submit it again.",
  unavailable: "Ballchasing is not answering right now. Try again later.",
  not_configured: "Rocket League replay import is not configured on this server yet.",
  not_ok: "Ballchasing has not finished processing that replay. Try again in a few minutes.",
  bad_shape: "Victress could not read that replay's data.",
  visibility: "Victress can only read replays set to unlisted or public on Ballchasing. Change this replay's visibility there, then submit it again.",
  not_in_replay: "Your Rocket League ID was not found among the players in this replay, so nothing was saved. Check the platform and ID on your account, or submit a replay you played in.",
  ambiguous_identity: "Your Rocket League ID appears more than once in this replay, so nothing was saved.",
  bad_date: "Victress could not read when that replay was played.",
  already: "You already submitted this replay. Nothing new was saved.",
  unexpected: "Something went wrong. Try again.",
};
const say = (code: string) => MESSAGES[code] ?? MESSAGES.unexpected;

type Ids = { jobId?: string };
export async function runReplayImport(deps: Deps, userId: string, linkOrId: string, opts: ImportOptions): Promise<ImportResult> {
  const { admin, client } = deps;
  const now = deps.now ? deps.now() : new Date();
  const fail = (code: string, ids: Ids = {}): ImportResult => ({ ok: false, code, message: say(code), jobId: ids.jobId });

  const ref = parseReplayRef(linkOrId);
  if (!ref.ok) return fail("invalid_link");
  if (!opts.authorized || !opts.consent) return fail("consent_required");

  const { data: acct } = await admin.from("game_accounts").select("id, external_id, platform").eq("profile_id", userId).eq("game", "ROCKET_LEAGUE").maybeSingle();
  if (!acct || !acct.platform) return fail("no_identity");

  const since = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const count = async (q: (b: any) => any) => { const r = await q(admin.from("import_jobs").select("id", { count: "exact", head: true }).eq("provider", "ballchasing")); return r.count ?? 0; };
  if ((await count((b) => b.eq("profile_id", userId).gte("created_at", since(3_600_000)))) >= LIMITS.perUserHour) return fail("rate_user");
  if ((await count((b) => b.eq("profile_id", userId).gte("created_at", since(86_400_000)))) >= LIMITS.perUserDay) return fail("rate_user");
  if ((await count((b) => b.gte("created_at", since(3_600_000)))) >= LIMITS.allUsersHour) return fail("rate_global");

  // A job left running by a crashed request must not block the player forever.
  await admin.from("import_jobs").update({ status: "failed", error_code: "stale", error_message: "The import did not finish.", finished_at: now.toISOString() })
    .eq("profile_id", userId).in("status", ["queued", "running"]).lt("created_at", since(10 * 60_000));
  const { data: job, error: jobError } = await admin.from("import_jobs").insert({
    profile_id: userId, game: "ROCKET_LEAGUE", provider: "ballchasing", requested: 1, status: "running", started_at: now.toISOString(),
    external_ref: ref.id, submitted_via: opts.via, consent_at: now.toISOString(),
  }).select("id").single();
  if (jobError || !job) return fail(jobError?.code === "23505" ? "busy" : "unexpected");
  const ids: Ids = { jobId: job.id };
  const finish = async (code: string, ok: boolean, extra: Record<string, unknown> = {}) => {
    await admin.from("import_jobs").update({
      status: ok ? "succeeded" : "failed", error_code: ok ? null : code, error_message: ok ? null : say(code), finished_at: new Date().toISOString(), ...extra,
    }).eq("id", job.id);
    return { ok, code, message: ok ? "Saved. Your numbers from this replay are on your Rocket League page." : say(code), jobId: job.id, imported: ok && !extra.skipped_existing } as ImportResult;
  };

  try {
    const { data: have } = await admin.from("game_matches").select("id").eq("profile_id", userId).eq("game", "ROCKET_LEAGUE").eq("external_id", ref.id).maybeSingle();
    if (have) return await finish("already", true, { skipped_existing: 1 }).then((r) => ({ ...r, message: say("already"), code: "already" }));

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

    const n = normalizeReplay(detail, { platform: String(acct.platform), id: String(acct.external_id) });
    if (!n.ok) return await finish(n.reason, false, { failed_matches: 1 });

    const { error } = await admin.from("game_matches").insert({
      profile_id: userId, account_id: acct.id, game: "ROCKET_LEAGUE", source: "api", source_detail: "ballchasing_replay", ...n.row,
    });
    if (error) {
      if (error.code === "23505") return await finish("already", true, { skipped_existing: 1 }).then((r) => ({ ...r, message: say("already"), code: "already" }));
      return await finish(error.message?.includes("import_limit") ? "unexpected" : "unexpected", false, { failed_matches: 1 });
    }
    await admin.from("game_accounts").update({ last_imported_at: new Date().toISOString() }).eq("id", acct.id);
    return await finish("ok", true, { imported: 1 });
  } catch {
    return await finish("unexpected", false, { failed_matches: 1 }).catch(() => fail("unexpected", ids));
  }
}
