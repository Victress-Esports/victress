/**
 * Riot Games API client for League of Legends: Account API (Riot ID to PUUID) and Match API v5.
 * Pure module: it takes the API key and a fetch function as arguments, so it can be tested without network access.
 * The server only wrapper in ./index.ts is the one place that reads the key from the environment. Never import this file from client code.
 * Everything fetched through this client is game API data and is stored with provenance "api".
 */

export type RiotRoute = "americas" | "europe" | "asia" | "sea";
export const RIOT_ROUTES: RiotRoute[] = ["americas", "europe", "asia", "sea"];

export type RiotErrorCode =
  | "invalid_input" | "not_found" | "auth" | "rate_limited" | "unavailable" | "timeout" | "unexpected";

/** Error with a message that is safe to show to a player. It never contains the API key or response bodies. */
export class RiotError extends Error {
  constructor(public code: RiotErrorCode, message: string, public status?: number, public retryAfterMs?: number) {
    super(message);
    this.name = "RiotError";
  }
}

export type Clock = { now: () => number; sleep: (ms: number) => Promise<void> };
const realClock: Clock = { now: () => Date.now(), sleep: (ms) => new Promise((r) => setTimeout(r, ms)) };

/**
 * Sliding window limiter for the development key limits: 20 requests per 1 second and 100 requests per 2 minutes.
 * It stays under the published limits (default 18 and 95) because other instances may share the same key.
 * Per process only: on serverless the key is shared across instances, so 429 handling below is still required.
 */
export class RateLimiter {
  private windows: { limit: number; ms: number; hits: number[] }[];
  constructor(private clock: Clock = realClock, limits: { perSecond: number; perTwoMinutes: number } = { perSecond: 18, perTwoMinutes: 95 }) {
    this.windows = [
      { limit: limits.perSecond, ms: 1000, hits: [] },
      { limit: limits.perTwoMinutes, ms: 120_000, hits: [] },
    ];
  }
  /** Resolves when a request may be sent, and records it. */
  async acquire(): Promise<void> {
    for (;;) {
      const now = this.clock.now();
      let wait = 0;
      for (const w of this.windows) {
        w.hits = w.hits.filter((t) => now - t < w.ms);
        if (w.hits.length >= w.limit) wait = Math.max(wait, w.hits[0] + w.ms - now);
      }
      if (wait <= 0) {
        for (const w of this.windows) w.hits.push(now);
        return;
      }
      await this.clock.sleep(wait + 1);
    }
  }
  /** After a 429 from Riot, hold everything for the time Riot asked. */
  penalize(ms: number) {
    const until = this.clock.now() + ms;
    for (const w of this.windows) while (w.hits.length < w.limit) w.hits.push(until - w.ms);
  }
}

export type RiotClientOptions = {
  apiKey: string;
  fetch?: typeof fetch;
  clock?: Clock;
  limiter?: RateLimiter;
  maxRetries?: number;
  timeoutMs?: number;
};

export type RiotAccount = { puuid: string; gameName: string; tagLine: string };

const NAME_RE = /^[^\n\r\t/\\?#%]{3,16}$/;
const TAG_RE = /^[A-Za-z0-9]{3,5}$/;
const PUUID_RE = /^[A-Za-z0-9_-]{20,100}$/;
const MATCH_ID_RE = /^[A-Z0-9]{2,6}_\d{4,15}$/;

/** Parses "Name#TAG". Returns null when it is not a plausible Riot ID. */
export function parseRiotId(input: string): { gameName: string; tagLine: string } | null {
  const s = input.trim();
  const i = s.lastIndexOf("#");
  if (i < 1) return null;
  const gameName = s.slice(0, i).trim();
  const tagLine = s.slice(i + 1).trim();
  return NAME_RE.test(gameName) && TAG_RE.test(tagLine) ? { gameName, tagLine } : null;
}

/** Queue ids used by Riot's Match API. Anything not listed is "other" and kept, never guessed. Verify against Riot's queues.json before relying on it. */
export type QueueKind = "ranked" | "normal" | "custom" | "practice" | "other";
export function queueKind(queueId: number): QueueKind {
  if (queueId === 420 || queueId === 440) return "ranked"; // Ranked Solo/Duo, Ranked Flex
  if (queueId === 400 || queueId === 430 || queueId === 490) return "normal"; // Draft, Blind, Quickplay
  if (queueId === 0) return "custom"; // custom games report queueId 0
  if (queueId === 3140) return "practice"; // Practice Tool
  return "other";
}

export type MatchIdQuery = { start?: number; count?: number; queue?: number; type?: "ranked" | "normal" | "tourney" | "tutorial"; startTime?: number; endTime?: number };

export function createRiotClient(opts: RiotClientOptions) {
  if (!opts.apiKey) throw new RiotError("auth", "Riot API key is not configured.");
  const doFetch = opts.fetch ?? fetch;
  const clock = opts.clock ?? realClock;
  const limiter = opts.limiter ?? new RateLimiter(clock);
  const maxRetries = opts.maxRetries ?? 4;
  const timeoutMs = opts.timeoutMs ?? 10_000;

  async function get<T>(route: RiotRoute, path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    if (!RIOT_ROUTES.includes(route)) throw new RiotError("invalid_input", "Unknown region.");
    const url = new URL(`https://${route}.api.riotgames.com${path}`);
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));

    let lastStatus: number | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      await limiter.acquire();
      let res: Response;
      try {
        res = await doFetch(url.toString(), { headers: { "X-Riot-Token": opts.apiKey, Accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
      } catch (e) {
        // Network failure or timeout: retry with backoff, then report plainly. The error text is not passed on.
        lastStatus = undefined;
        if (attempt === maxRetries) {
          const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
          throw new RiotError(timedOut ? "timeout" : "unavailable", "Riot did not answer. Try again in a few minutes.");
        }
        await clock.sleep(Math.min(8000, 500 * 2 ** attempt));
        continue;
      }
      lastStatus = res.status;
      if (res.ok) {
        try { return (await res.json()) as T; } catch { throw new RiotError("unexpected", "Riot returned a response we could not read.", res.status); }
      }
      if (res.status === 429) {
        const header = Number(res.headers.get("retry-after"));
        const wait = Number.isFinite(header) && header > 0 ? header * 1000 : 1000 * 2 ** attempt;
        limiter.penalize(wait);
        if (attempt === maxRetries) throw new RiotError("rate_limited", "Riot is limiting requests right now. Try again in a couple of minutes.", 429, wait);
        await clock.sleep(wait + 50);
        continue;
      }
      if (res.status >= 500) {
        if (attempt === maxRetries) throw new RiotError("unavailable", "Riot's service is not responding. Try again later.", res.status);
        await clock.sleep(Math.min(8000, 500 * 2 ** attempt));
        continue;
      }
      if (res.status === 404) throw new RiotError("not_found", "Riot has no record of that.", 404);
      if (res.status === 401 || res.status === 403) throw new RiotError("auth", "Victress's Riot access is not working (key rejected or expired). This is on our side, not yours.", res.status);
      throw new RiotError("unexpected", `Riot returned an unexpected response (${res.status}).`, res.status);
    }
    throw new RiotError("unexpected", "Riot request failed.", lastStatus);
  }

  return {
    /** Account API: Riot ID (Name#TAG) to PUUID. The route is the player's regional route, for example americas. */
    async accountByRiotId(gameName: string, tagLine: string, route: RiotRoute): Promise<RiotAccount> {
      if (!NAME_RE.test(gameName) || !TAG_RE.test(tagLine)) throw new RiotError("invalid_input", "That is not a valid Riot ID. Use the form Name#TAG.");
      return get<RiotAccount>(route, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
    },
    /** Match API v5: match ids, newest first. count is 1 to 100. */
    async matchIds(puuid: string, route: RiotRoute, q: MatchIdQuery = {}): Promise<string[]> {
      if (!PUUID_RE.test(puuid)) throw new RiotError("invalid_input", "Invalid player id.");
      const count = Math.min(100, Math.max(1, Math.floor(q.count ?? 20)));
      return get<string[]>(route, `/lol/match/v5/matches/by-puuid/${puuid}/ids`, { ...q, count, start: Math.max(0, Math.floor(q.start ?? 0)) });
    },
    /** Match API v5: one match with all participants. */
    async match(matchId: string, route: RiotRoute): Promise<Record<string, unknown>> {
      if (!MATCH_ID_RE.test(matchId)) throw new RiotError("invalid_input", "Invalid match id.");
      return get(route, `/lol/match/v5/matches/${matchId}`);
    },
    /** Match API v5: the timeline of one match. */
    async timeline(matchId: string, route: RiotRoute): Promise<Record<string, unknown>> {
      if (!MATCH_ID_RE.test(matchId)) throw new RiotError("invalid_input", "Invalid match id.");
      return get(route, `/lol/match/v5/matches/${matchId}/timeline`);
    },
  };
}
export type RiotClient = ReturnType<typeof createRiotClient>;
