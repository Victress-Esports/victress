/**
 * Turns Riot Match-v5 responses into the normalized rows stored in public.game_matches.
 * Pure functions, no network, no secrets. Privacy by construction: only the owner's own PUUID is used to find the owner's
 * slot, and the stored rows contain no PUUIDs, Riot IDs or summoner names for anyone (other players are anonymous slots).
 */
import { queueKind, type QueueKind } from "./core";
import { QUEUE_LABELS } from "./queues";

type Obj = Record<string, unknown>;
const num = (v: unknown, max = 1e9): number => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0);
const str = (v: unknown, max = 40): string => (typeof v === "string" ? v.replace(/[^\p{L}\p{N} '._-]/gu, "").slice(0, max) : "");
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export type Slot = {
  slot: number; team: 100 | 200; champion: string; role: string; level: number;
  kills: number; deaths: number; assists: number; cs: number; gold: number; damage: number; damageTaken: number;
  vision: number; wardsPlaced: number; wardsKilled: number; controlWards: number; win: boolean; remake: boolean;
};
export type MatchRow = {
  external_id: string; queue_id: number; queue_kind: QueueKind; queue_label: string; played_at: string; duration_seconds: number;
  game_version: string | null; result: "win" | "loss" | "remake"; me: Slot & { items: number[] }; participants: Slot[];
  objectives: Record<string, { first: boolean; kills: number }[] | Record<string, unknown>>;
};
export type NormalizeResult = { ok: true; row: MatchRow } | { ok: false; reason: "not_participant" | "malformed" };

function slotOf(p: Obj): Slot {
  return {
    slot: num(p.participantId, 10), team: p.teamId === 200 ? 200 : 100, champion: str(p.championName), role: str(p.teamPosition, 12) || "NONE",
    level: num(p.champLevel, 30), kills: num(p.kills, 200), deaths: num(p.deaths, 200), assists: num(p.assists, 300),
    cs: num(p.totalMinionsKilled, 3000) + num(p.neutralMinionsKilled, 3000), gold: num(p.goldEarned, 200000),
    damage: num(p.totalDamageDealtToChampions, 1e6), damageTaken: num(p.totalDamageTaken, 1e6), vision: num(p.visionScore, 500),
    wardsPlaced: num(p.wardsPlaced, 500), wardsKilled: num(p.wardsKilled, 500), controlWards: num(p.visionWardsBoughtInGame, 500),
    win: p.win === true, remake: p.gameEndedInEarlySurrender === true,
  };
}

export function normalizeMatch(match: Obj, ownerPuuid: string): NormalizeResult {
  const meta = obj(match.metadata), info = obj(match.info);
  const id = typeof meta.matchId === "string" ? meta.matchId : "";
  const parts = arr(info.participants).map(obj);
  if (!/^[A-Z0-9]{2,6}_\d{4,15}$/.test(id) || parts.length < 2 || parts.length > 16) return { ok: false, reason: "malformed" };
  const mine = parts.find((p) => p.puuid === ownerPuuid);
  if (!mine) return { ok: false, reason: "not_participant" };

  const start = num(info.gameStartTimestamp ?? info.gameCreation, 4e12);
  // Since patch 11.20 gameDuration is in seconds when gameEndTimestamp exists; older matches report milliseconds.
  const seconds = info.gameEndTimestamp ? num(info.gameDuration, 20000) : Math.round(num(info.gameDuration, 2e7) / 1000);
  const queueId = num(info.queueId, 100000);
  const me = slotOf(mine);
  const teams = arr(info.teams).map(obj);
  const objectives: MatchRow["objectives"] = {};
  for (const t of teams) {
    const side = t.teamId === 200 ? "red" : "blue";
    const o = obj(t.objectives);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o).slice(0, 20)) out[str(k, 24)] = { first: obj(v).first === true, kills: num(obj(v).kills, 100) };
    objectives[side] = out;
  }
  return {
    ok: true,
    row: {
      external_id: id, queue_id: queueId, queue_kind: queueKind(queueId), queue_label: QUEUE_LABELS[queueId] ?? `Queue ${queueId}`,
      played_at: new Date(start || Date.now()).toISOString(), duration_seconds: seconds, game_version: str(info.gameVersion, 40) || null,
      result: me.remake ? "remake" : me.win ? "win" : "loss",
      me: { ...me, items: [0, 1, 2, 3, 4, 5, 6].map((i) => num(mine[`item${i}`], 100000)) },
      participants: parts.map(slotOf), objectives,
    },
  };
}

export type CompactTimeline = {
  interval: number;
  frames: { t: number; blue: number; red: number; gold: number; cs: number; xp: number; level: number }[];
  events: { t: number; type: "kill" | "monster" | "building"; killer?: number; victim?: number; assists?: number[]; team?: 100 | 200; what?: string }[];
};

/** Compact timeline: per frame team gold totals plus the owner's gold, CS and XP, and the key events. No player ids beyond anonymous slots. */
export function normalizeTimeline(timeline: Obj, ownerSlot: number): CompactTimeline | null {
  const info = obj(timeline.info);
  const frames = arr(info.frames).map(obj);
  if (!frames.length || frames.length > 120) return null;
  const out: CompactTimeline = { interval: Math.round(num(info.frameInterval, 600000) / 1000) || 60, frames: [], events: [] };
  for (const f of frames) {
    const pf = obj(f.participantFrames);
    let blue = 0, red = 0;
    for (const [slot, v] of Object.entries(pf)) {
      const g = num(obj(v).totalGold, 200000);
      if (Number(slot) <= 5) blue += g; else red += g;
    }
    const mine = obj(pf[String(ownerSlot)]);
    out.frames.push({ t: Math.round(num(f.timestamp, 1e8) / 1000), blue, red, gold: num(mine.totalGold, 200000), cs: num(mine.minionsKilled, 3000) + num(mine.jungleMinionsKilled, 3000), xp: num(mine.xp, 200000), level: num(mine.level, 30) });
    for (const e of arr(f.events).map(obj)) {
      const t = Math.round(num(e.timestamp, 1e8) / 1000);
      if (e.type === "CHAMPION_KILL") out.events.push({ t, type: "kill", killer: num(e.killerId, 10), victim: num(e.victimId, 10), assists: arr(e.assistingParticipantIds).slice(0, 4).map((x) => num(x, 10)) });
      else if (e.type === "ELITE_MONSTER_KILL") out.events.push({ t, type: "monster", team: e.killerTeamId === 200 ? 200 : 100, what: str(e.monsterSubType || e.monsterType, 24) });
      else if (e.type === "BUILDING_KILL") out.events.push({ t, type: "building", team: e.teamId === 200 ? 200 : 100, what: str(e.buildingType, 24) });
    }
  }
  if (out.events.length > 1500) out.events.length = 1500;
  return out;
}
