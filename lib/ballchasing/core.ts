/**
 * ballchasing.com API client (Rocket League). Pure module: token and fetch are arguments, so it is testable without network.
 * Auth is the raw token in the Authorization header (no Bearer). Free tier limits (read 2026-11-07): list and detail calls
 * 2 per second and 500 per hour; file download 1 per second and 200 per hour. The client stays under them.
 * Only replays whose visibility is "public" are ever fetched. Files contain player names and platform ids: personal data.
 */
export type BcErrorCode = "invalid_input" | "not_found" | "auth" | "rate_limited" | "unavailable" | "too_large" | "unexpected";
export class BcError extends Error {
  constructor(public code: BcErrorCode, message: string, public status?: number) { super(message); this.name = "BcError"; }
}
export type Clock = { now: () => number; sleep: (ms: number) => Promise<void> };
const realClock: Clock = { now: () => Date.now(), sleep: (ms) => new Promise((r) => setTimeout(r, ms)) };

/** Sliding windows: [limit, windowMs] pairs. */
export class Limiter {
  private hits: number[][];
  constructor(private clock: Clock, private windows: [number, number][]) { this.hits = windows.map(() => []); }
  async acquire() {
    for (;;) {
      const now = this.clock.now();
      let wait = 0;
      this.windows.forEach(([limit, ms], i) => {
        this.hits[i] = this.hits[i].filter((t) => now - t < ms);
        if (this.hits[i].length >= limit) wait = Math.max(wait, this.hits[i][0] + ms - now);
      });
      if (wait <= 0) { this.hits.forEach((h) => h.push(now)); return; }
      await this.clock.sleep(wait + 1);
    }
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const MAX_REPLAY_BYTES = 20 * 1024 * 1024;

export type BcListQuery = { playlist?: string[]; season?: string; minRank?: string; maxRank?: string; replayDateAfter?: string; replayDateBefore?: string; count?: number; sortBy?: "replay-date" | "upload-date"; sortDir?: "asc" | "desc" };
export type BcReplaySummary = { id: string; title?: string; visibility: string; playlist_id?: string; season?: number | string; date?: string; blue?: { goals?: number }; orange?: { goals?: number } };

export function createBallchasingClient(opts: { token: string; fetch?: typeof fetch; clock?: Clock; maxRetries?: number }) {
  if (!opts.token) throw new BcError("auth", "ballchasing token is not configured.");
  const doFetch = opts.fetch ?? fetch;
  const clock = opts.clock ?? realClock;
  const maxRetries = opts.maxRetries ?? 3;
  const api = new Limiter(clock, [[2, 1000], [480, 3_600_000]]);
  const files = new Limiter(clock, [[1, 1100], [190, 3_600_000]]);

  async function call(limiter: Limiter, path: string, query?: URLSearchParams): Promise<Response> {
    const url = `https://ballchasing.com/api${path}${query?.size ? `?${query}` : ""}`;
    for (let attempt = 0; ; attempt++) {
      await limiter.acquire();
      let res: Response;
      try { res = await doFetch(url, { headers: { Authorization: opts.token }, signal: AbortSignal.timeout(30_000), cache: "no-store" }); }
      catch { if (attempt >= maxRetries) throw new BcError("unavailable", "ballchasing did not answer."); await clock.sleep(500 * 2 ** attempt); continue; }
      if (res.ok) return res;
      if (res.status === 429) { if (attempt >= maxRetries) throw new BcError("rate_limited", "ballchasing is limiting requests. Try again later.", 429); await clock.sleep(2000 * 2 ** attempt); continue; }
      if (res.status >= 500) { if (attempt >= maxRetries) throw new BcError("unavailable", "ballchasing is not responding.", res.status); await clock.sleep(500 * 2 ** attempt); continue; }
      if (res.status === 404) throw new BcError("not_found", "ballchasing has no such replay.", 404);
      if (res.status === 401 || res.status === 403) throw new BcError("auth", "ballchasing rejected the token.", res.status);
      throw new BcError("unexpected", `ballchasing returned ${res.status}.`, res.status);
    }
  }

  return {
    async ping() { await call(api, "/"); return true; },
    /** Public replays only (visibility filter is applied again on the results). */
    async list(q: BcListQuery = {}): Promise<{ list: BcReplaySummary[]; next?: string }> {
      const p = new URLSearchParams({ visibility: "public", count: String(Math.min(200, Math.max(1, q.count ?? 50))) });
      for (const pl of q.playlist ?? []) p.append("playlist", pl);
      if (q.season) p.set("season", q.season);
      if (q.minRank) p.set("min-rank", q.minRank);
      if (q.maxRank) p.set("max-rank", q.maxRank);
      if (q.replayDateAfter) p.set("replay-date-after", q.replayDateAfter);
      if (q.replayDateBefore) p.set("replay-date-before", q.replayDateBefore);
      p.set("sort-by", q.sortBy ?? "replay-date"); p.set("sort-dir", q.sortDir ?? "desc");
      const body = (await (await call(api, "/replays", p)).json()) as { list?: BcReplaySummary[]; next?: string };
      return { list: (body.list ?? []).filter((r) => r.visibility === "public" && UUID.test(r.id)), next: body.next };
    },
    async details(id: string): Promise<Record<string, unknown>> {
      if (!UUID.test(id)) throw new BcError("invalid_input", "Invalid replay id.");
      return (await call(api, `/replays/${id}`)).json();
    },
    /** The original .replay file. Refuses anything over MAX_REPLAY_BYTES. */
    async download(id: string): Promise<Uint8Array> {
      if (!UUID.test(id)) throw new BcError("invalid_input", "Invalid replay id.");
      const res = await call(files, `/replays/${id}/file`);
      const len = Number(res.headers.get("content-length"));
      if (Number.isFinite(len) && len > MAX_REPLAY_BYTES) throw new BcError("too_large", "Replay file is too large.");
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length > MAX_REPLAY_BYTES) throw new BcError("too_large", "Replay file is too large.");
      return buf;
    },
  };
}
export type BallchasingClient = ReturnType<typeof createBallchasingClient>;
