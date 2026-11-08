// Riot Games API client. SERVER ONLY. Reads RIOT_API_KEY from the environment; never import from a client component.
// Connectivity and rate-limit probing for now. Nothing returned here is stored.

if (typeof window !== "undefined") throw new Error("lib/riot.ts is server only");

export type RegionalRoute = "americas" | "europe" | "asia" | "sea";
export type PlatformRoute = "na1" | "br1" | "la1" | "la2" | "euw1" | "eun1" | "kr" | "jp1" | "oc1" | "tr1" | "ru";

export type RateLimitInfo = {
  appLimit: string | null; // X-App-Rate-Limit e.g. "20:1,100:120"
  appCount: string | null;
  methodLimit: string | null; // X-Method-Rate-Limit
  methodCount: string | null;
  retryAfter: number | null;
};

export type RiotAccount = { puuid: string; gameName?: string; tagLine?: string };
export type RiotSummoner = { id?: string; accountId?: string; puuid: string; profileIconId: number; revisionDate: number; summonerLevel: number };
export type RiotMatchSummary = { metadata: { matchId: string; participants: string[] }; info: { gameMode: string; gameDuration: number; queueId: number } };

export type RiotResult<T> =
  | { ok: true; status: number; data: T; rate: RateLimitInfo }
  | { ok: false; status: number; error: string; rate: RateLimitInfo };

export const riotEnabled = () => process.env.RIOT_CHECK_ENABLED === "true";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readRate(h: Headers): RateLimitInfo {
  const ra = h.get("retry-after");
  return {
    appLimit: h.get("x-app-rate-limit"),
    appCount: h.get("x-app-rate-limit-count"),
    methodLimit: h.get("x-method-rate-limit"),
    methodCount: h.get("x-method-rate-limit-count"),
    retryAfter: ra ? Number(ra) : null,
  };
}

async function riotGet<T>(host: string, path: string, maxRetries = 3): Promise<RiotResult<T>> {
  const key = process.env.RIOT_API_KEY;
  const url = `https://${host}.api.riotgames.com${path}`;
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      // The key goes in a header only, never in the URL, and is never logged.
      res = await fetch(url, { headers: { ...(key ? { "X-Riot-Token": key } : {}), Accept: "application/json" }, cache: "no-store" });
    } catch (e) {
      return { ok: false, status: 0, error: `network error: ${(e as Error).message}`, rate: readRate(new Headers()) };
    }
    const rate = readRate(res.headers);
    if (res.status === 429 && attempt < maxRetries) {
      await sleep(((rate.retryAfter ?? 1) + 0.25) * 1000 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: body.slice(0, 300) || res.statusText, rate };
    }
    return { ok: true, status: res.status, data: (await res.json()) as T, rate };
  }
}

const enc = encodeURIComponent;

export const getAccountByRiotId = (gameName: string, tagLine: string, region: RegionalRoute = "americas") =>
  riotGet<RiotAccount>(region, `/riot/account/v1/accounts/by-riot-id/${enc(gameName)}/${enc(tagLine)}`);

export const getSummonerByPuuid = (puuid: string, platform: PlatformRoute = "na1") =>
  riotGet<RiotSummoner>(platform, `/lol/summoner/v4/summoners/by-puuid/${enc(puuid)}`);

export const getMatchIdsByPuuid = (puuid: string, count = 1, region: RegionalRoute = "americas") =>
  riotGet<string[]>(region, `/lol/match/v5/matches/by-puuid/${enc(puuid)}/ids?start=0&count=${count}`);

export const getMatch = (matchId: string, region: RegionalRoute = "americas") =>
  riotGet<RiotMatchSummary>(region, `/lol/match/v5/matches/${enc(matchId)}`);

// Key type is inferred, not asserted. Personal and Development keys share the default limits (20/1s, 100/120s),
// so the headers alone cannot tell them apart. Production keys normally have higher or custom limits.
export function describeKey(rate: RateLimitInfo): string {
  const lim = rate.appLimit ?? "";
  const isDefault = /(^|,)20:1(,|$)/.test(lim) && /(^|,)100:120(,|$)/.test(lim);
  return isDefault
    ? "Default limits (20/1s, 100/120s): consistent with a Personal or a Development key. Headers cannot distinguish them; a Development key expires 24 hours after it was issued, a Personal key does not."
    : `Non-default limits (${lim || "none returned"}): not a default Personal or Development key.`;
}
