// Sign in through Steam, used only to VERIFY a player's Steam account for Rocket League. It is not a way to sign in to Victress.
// No imports and no server only guard, so tests can load it directly. Server code uses lib/steam/index.ts.
//
// Steam is an OpenID 2.0 provider (https://steamcommunity.com/openid). No API key or secret is needed:
//   1. Redirect to https://steamcommunity.com/openid/login with checkid_setup, identifier_select, our return_to (carrying a state bound
//      to the signed in player) and realm (the origin of return_to).
//   2. Steam redirects back with openid.* parameters. We check the mode, the provider endpoint, that return_to is exactly ours with the
//      same state, that the claimed id is https://steamcommunity.com/openid/id/<17 digits>, and that the signed fields cover them.
//   3. We ask Steam to confirm the response (openid.mode=check_authentication, server to server). Only "is_valid:true" counts.
// The SteamID64 (17 digits) is what Ballchasing reports as the player id for platform "steam". Matching stays exact.

export const STEAM_OPENID = "https://steamcommunity.com/openid/login";
const NS = "http://specs.openid.net/auth/2.0";
const SELECT = "http://specs.openid.net/auth/2.0/identifier_select";
const CLAIMED = /^https:\/\/steamcommunity\.com\/openid\/id\/([0-9]{17})$/;
export const STEAM_ENV_NAMES = { enabled: "VICTRESS_STEAM_SIGNIN_ENABLED", returnUrl: "VICTRESS_STEAM_RETURN_URL" } as const;

type Env = Record<string, string | undefined>;
export type SteamConfig = { returnUrl: string; realm: string };
export const steamFlagOn = (env: Env) => env[STEAM_ENV_NAMES.enabled] === "true";

/** Null unless the flag is on and the return URL is https (http only on localhost) and ends in the callback route. */
export function steamConfig(env: Env): SteamConfig | null {
  if (!steamFlagOn(env)) return null;
  const raw = (env[STEAM_ENV_NAMES.returnUrl] ?? "").trim();
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  const local = u.hostname === "localhost" || u.hostname.endsWith(".localhost") || u.hostname === "127.0.0.1";
  if (u.protocol !== "https:" && !(local && u.protocol === "http:")) return null;
  if (!u.pathname.endsWith("/dashboard/link/steam/callback") || u.search || u.hash) return null;
  return { returnUrl: u.toString(), realm: u.origin };
}

const returnTo = (cfg: SteamConfig, state: string) => `${cfg.returnUrl}?state=${state}`;

export function steamLoginUrl(cfg: SteamConfig, state: string): string {
  const p = new URLSearchParams({
    "openid.ns": NS, "openid.mode": "checkid_setup", "openid.return_to": returnTo(cfg, state), "openid.realm": cfg.realm,
    "openid.identity": SELECT, "openid.claimed_id": SELECT,
  });
  return `${STEAM_OPENID}?${p}`;
}

const same = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
export const steamStateCookie = (state: string, profileId: string) => `${state}.${profileId}`;

export type SteamFailure = "denied" | "state" | "invalid" | "unavailable";
export type SteamResult = { ok: true; steamId: string } | { ok: false; reason: SteamFailure };

/** Checks Steam's answer and confirms it with Steam. Returns the SteamID64 only when every check passes. */
export async function verifySteamCallback(args: { cfg: SteamConfig; profileId: string; query: URLSearchParams; cookie?: string | null; fetch?: typeof fetch; timeoutMs?: number }): Promise<SteamResult> {
  const q = args.query;
  const doFetch = args.fetch ?? fetch;
  if (q.get("openid.mode") === "cancel") return { ok: false, reason: "denied" };
  const state = q.get("state") ?? "";
  if (!/^[0-9a-f]{64}$/.test(state) || !args.cookie || !same(args.cookie, steamStateCookie(state, args.profileId))) return { ok: false, reason: "state" };
  if (q.get("openid.mode") !== "id_res" || q.get("openid.ns") !== NS || q.get("openid.op_endpoint") !== STEAM_OPENID) return { ok: false, reason: "invalid" };
  if (q.get("openid.return_to") !== returnTo(args.cfg, state)) return { ok: false, reason: "invalid" };
  const claimed = q.get("openid.claimed_id") ?? "";
  const m = claimed.match(CLAIMED);
  if (!m || q.get("openid.identity") !== claimed) return { ok: false, reason: "invalid" };
  const signed = new Set((q.get("openid.signed") ?? "").split(","));
  for (const f of ["op_endpoint", "claimed_id", "identity", "return_to", "response_nonce"]) if (!signed.has(f)) return { ok: false, reason: "invalid" };

  const body = new URLSearchParams();
  for (const [k, v] of q) if (k.startsWith("openid.")) body.set(k, v);
  body.set("openid.mode", "check_authentication");
  try {
    const res = await doFetch(STEAM_OPENID, { method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(args.timeoutMs ?? 10_000), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    if (!res.ok) return { ok: false, reason: "unavailable" };
    const text = await res.text();
    if (!/^is_valid:true$/m.test(text)) return { ok: false, reason: "invalid" };
  } catch { return { ok: false, reason: "unavailable" }; }
  return { ok: true, steamId: m[1] };
}

export const STEAM_MESSAGES: Record<SteamFailure | "saved" | "already" | "replaced" | "has_games" | "taken" | "error", string> = {
  saved: "Your Steam account is verified. Victress will match you in replays by this SteamID only.",
  already: "This Steam account was already verified on your Victress account.",
  replaced: "Your Rocket League ID is now your verified Steam account.",
  has_games: "Delete your saved Rocket League games before switching to a different account, so old games are never attached to a different player.",
  taken: "This Steam account is already verified on another Victress account. Nothing was changed.",
  error: "Something went wrong. Nothing was changed. Try again.",
  denied: "Steam sign in was cancelled. Nothing was changed.",
  state: "That Steam sign in link expired or was opened in a different session. Start again from this page.",
  invalid: "Steam did not confirm the sign in. Nothing was changed.",
  unavailable: "Steam did not answer. Nothing was changed. Try again in a minute.",
};
