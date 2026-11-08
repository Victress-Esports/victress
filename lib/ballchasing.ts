// ballchasing.com API client. SERVER ONLY. Reads BALLCHASING_API_TOKEN from the environment.
// Uploads are always private. Calls are spaced and retried on 429 to stay inside the free tier.

if (typeof window !== "undefined") throw new Error("lib/ballchasing.ts is server only");

export type BcPing = { chaser: boolean; name: string; steam_id?: string; type: string; country?: string };
export type BcStats = { core?: { shots: number; goals: number; saves: number; assists: number; score: number } };
export type BcPlayer = { name: string; id: { platform: string; id: string }; stats?: BcStats };
export type BcTeam = { name?: string; goals?: number; players: BcPlayer[] };
export type BcReplay = {
  id: string;
  title?: string;
  status?: string; // "ok" | "pending" | "failed"
  visibility?: string;
  blue: BcTeam;
  orange: BcTeam;
};
export type BcListResponse = { count?: number; list: { id: string; title?: string; visibility?: string }[] };
export type BcUpload = { id: string; location?: string; duplicate: boolean };

export type BcResult<T> =
  | { ok: true; status: number; data: T; headers: Record<string, string> }
  | { ok: false; status: number; error: string; headers: Record<string, string> };

export const ballchasingEnabled = () => process.env.BALLCHASING_CHECK_ENABLED === "true";

const BASE = "https://ballchasing.com";
const MIN_GAP_MS = 1000; // well under the free tier's per second allowance
let last = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle() {
  const wait = last + MIN_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
}

function pickHeaders(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => {
    if (/ratelimit|rate-limit|retry-after/i.test(k)) out[k] = v;
  });
  return out;
}

async function bc<T>(path: string, init: RequestInit = {}, maxRetries = 4): Promise<BcResult<T>> {
  for (let attempt = 0; ; attempt++) {
    await throttle();
    let res: Response;
    try {
      // The token goes in the Authorization header only and is never logged.
      res = await fetch(BASE + path, {
        ...init,
        headers: { ...(process.env.BALLCHASING_API_TOKEN ? { Authorization: process.env.BALLCHASING_API_TOKEN } : {}), ...(init.headers ?? {}) },
        cache: "no-store",
      });
    } catch (e) {
      return { ok: false, status: 0, error: `network error: ${(e as Error).message}`, headers: {} };
    }
    const headers = pickHeaders(res.headers);
    if (res.status === 429 && attempt < maxRetries) {
      const ra = Number(res.headers.get("retry-after"));
      await sleep((Number.isFinite(ra) && ra > 0 ? ra : 2 ** (attempt + 1)) * 1000);
      continue;
    }
    if (!res.ok && res.status !== 409) {
      const body = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: body.slice(0, 300) || res.statusText, headers };
    }
    return { ok: true, status: res.status, data: (await res.json()) as T, headers };
  }
}

export const ping = () => bc<BcPing>("/api/");

export const listReplays = (count = 1) => bc<BcListResponse>(`/api/replays?count=${count}&uploader=me`);

export const getReplay = (id: string) => bc<BcReplay>(`/api/replays/${encodeURIComponent(id)}`);

// Always private. A 409 means ballchasing already has this replay; the id is still returned and usable.
export async function uploadReplay(file: Blob, filename: string): Promise<BcResult<BcUpload>> {
  const form = new FormData();
  form.append("file", file, filename);
  const r = await bc<{ id: string; location?: string }>("/api/v2/upload?visibility=private", { method: "POST", body: form });
  if (!r.ok) return r;
  return { ...r, data: { id: r.data.id, location: r.data.location, duplicate: r.status === 409 } };
}

// Replays are processed asynchronously after upload.
export async function waitForReplay(id: string, timeoutMs = 60_000): Promise<BcResult<BcReplay>> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const r = await getReplay(id);
    if (!r.ok || r.data.status === "ok" || r.data.status === "failed" || Date.now() > end) return r;
    await sleep(3000);
  }
}
