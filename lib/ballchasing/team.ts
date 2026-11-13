// Team scrim payload from a Ballchasing replay. Pure, no server only imports, so it is tested with stubs (scripts/team-scrims-test.mjs).
// What leaves this function:
//  * the submitter's side (blue or orange), the score, date, duration and match type;
//  * the side's totals and the opponent side's totals: five numbers each (score, goals, assists, saves, shots), summed. No opponent
//    name, platform, id, car or anything else is copied; opponent players are never kept one by one;
//  * an individual line only for roster members passed in `members` (the caller passes only members who opted in to team sharing,
//    and the database checks again), found on the submitter's side by EXACT platform and id, exactly once. Nothing is guessed.

export const TEAM_NUMBERS = ["score", "goals", "assists", "saves", "shots"] as const;
export type Numbers = Partial<Record<(typeof TEAM_NUMBERS)[number], number>>;
export type Member = { profile_id: string; platform: string; id: string };
export type TeamScrimPayload = {
  replay_id: string; played_at: string; duration_seconds: number; queue_kind: "ranked" | "normal" | "custom" | "other";
  side: "blue" | "orange"; goals_for: number; goals_against: number; overtime: boolean; side_players: number;
  opponent_label: string | null; team_totals: Numbers; opponent_totals: Numbers; lines: { profile_id: string; stats: Numbers }[];
};
export type TeamFail = "bad_shape" | "not_in_replay" | "solo_replay";

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);
const core = (p: Rec): Rec => (isRec(p.stats) && isRec(p.stats.core) ? p.stats.core : {});
const idOf = (p: Rec) => { const x = isRec(p.id) ? p.id : {}; return { platform: String(x.platform ?? "").toLowerCase(), id: String(x.id ?? "").toLowerCase() }; };

function numbersOf(p: Rec): Numbers {
  const c = core(p), out: Numbers = {};
  for (const k of TEAM_NUMBERS) { const n = num(c[k]); if (n !== undefined) out[k] = Math.round(n); }
  return out;
}
function sum(players: Rec[]): Numbers {
  const out: Numbers = {};
  for (const k of TEAM_NUMBERS) {
    let seen = false, t = 0;
    for (const p of players) { const n = num(core(p)[k]); if (n !== undefined) { seen = true; t += n; } }
    if (seen) out[k] = Math.round(t);
  }
  return out;
}

/** An optional opponent label typed by the submitter. Never taken from the replay. Trimmed, single line, at most 40 characters. */
export function cleanOpponentLabel(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40).trim();
  return s.length ? s : null;
}

export function teamScrimFromReplay(
  detail: unknown,
  submitter: { platform: string; id: string },
  members: Member[],
  base: { queue_kind: TeamScrimPayload["queue_kind"]; played_at: string; duration_seconds: number },
  opponentLabel?: unknown,
): { ok: true; payload: TeamScrimPayload } | { ok: false; reason: TeamFail } {
  if (!isRec(detail) || typeof detail.id !== "string") return { ok: false, reason: "bad_shape" };
  const sides: { color: "blue" | "orange"; players: Rec[]; goals?: number }[] = [];
  for (const color of ["blue", "orange"] as const) {
    const t = detail[color];
    if (!isRec(t) || !Array.isArray(t.players)) return { ok: false, reason: "bad_shape" };
    sides.push({ color, players: t.players.filter(isRec), goals: isRec(t.stats) && isRec(t.stats.core) ? num(t.stats.core.goals) : undefined });
  }
  const want = { platform: submitter.platform.toLowerCase(), id: submitter.id.toLowerCase() };
  const mineIdx = sides.findIndex((s) => s.players.some((p) => { const x = idOf(p); return x.platform === want.platform && x.id === want.id; }));
  if (mineIdx < 0 || !want.platform || !want.id) return { ok: false, reason: "not_in_replay" };
  const mine = sides[mineIdx], theirs = sides[1 - mineIdx];
  if (mine.players.length < 2) return { ok: false, reason: "solo_replay" };

  const lines: TeamScrimPayload["lines"] = [];
  for (const m of members) {
    const w = { platform: String(m.platform ?? "").toLowerCase(), id: String(m.id ?? "").toLowerCase() };
    if (!w.platform || !w.id) continue;
    const hits = mine.players.filter((p) => { const x = idOf(p); return x.platform === w.platform && x.id === w.id; });
    if (hits.length === 1) lines.push({ profile_id: m.profile_id, stats: numbersOf(hits[0]) });
  }

  const team_totals = sum(mine.players), opponent_totals = sum(theirs.players);
  const goals_for = Math.min(99, Math.round(mine.goals ?? team_totals.goals ?? 0));
  const goals_against = Math.min(99, Math.round(theirs.goals ?? opponent_totals.goals ?? 0));
  return {
    ok: true,
    payload: {
      replay_id: detail.id.toLowerCase(), played_at: base.played_at, duration_seconds: base.duration_seconds, queue_kind: base.queue_kind,
      side: mine.color, goals_for, goals_against, overtime: detail.overtime === true, side_players: Math.min(mine.players.length, 8),
      opponent_label: cleanOpponentLabel(opponentLabel), team_totals, opponent_totals, lines,
    },
  };
}

/** Roster members of the submitter's current team who opted in to team sharing and saved a Rocket League identity. Server side. */
export async function sharingMembers(admin: any, teamId: string): Promise<Member[]> {
  const [{ data: roster }, { data: sharing }] = await Promise.all([
    admin.from("team_members").select("profile_id").eq("team_id", teamId),
    admin.from("team_stat_sharing").select("profile_id").eq("team_id", teamId).eq("game", "ROCKET_LEAGUE"),
  ]);
  const onRoster = new Set((roster ?? []).map((r: { profile_id: string }) => r.profile_id));
  const ids = (sharing ?? []).map((r: { profile_id: string }) => r.profile_id).filter((id: string) => onRoster.has(id));
  if (!ids.length) return [];
  const { data: accts } = await admin.from("game_accounts").select("profile_id, platform, external_id").eq("game", "ROCKET_LEAGUE").in("profile_id", ids);
  return (accts ?? []).filter((a: { platform: string | null }) => a.platform).map((a: { profile_id: string; platform: string; external_id: string }) => ({ profile_id: a.profile_id, platform: a.platform, id: a.external_id }));
}
