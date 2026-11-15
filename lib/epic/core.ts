// Sign in with Epic, used only to VERIFY a player's Epic Games account for Rocket League. It is not a way to sign in to Victress.
// No imports and no server only guard, so tests can load it directly. Server code uses lib/epic/index.ts.
//
// Flow (Epic Account Services web authorization code flow, as documented on dev.epicgames.com, Web API reference: Authentication, and
// Epic Account Services: Getting Started, "Authenticate on a Web Site"; read 2026-11-15):
//   1. Redirect to https://www.epicgames.com/id/authorize?client_id&redirect_uri&response_type=code&scope=basic_profile&state
//   2. Epic redirects back with ?code&state. The state must match the one set in a cookie for this signed in player.
//   3. POST https://api.epicgames.dev/epic/oauth/v2/token, client credentials in a Basic Authorization header, form body
//      grant_type=authorization_code, code, redirect_uri (deployment_id when configured). The response carries account_id:
//      "The Epic Games account ID for the user that the token was generated for."
//   4. POST https://api.epicgames.dev/epic/oauth/v2/tokenInfo token=<access token> (RFC 7662): it must be active, issued to this client,
//      and name the same account_id. Only then is the account id used.
// Tokens are never stored or logged. Only the account id (and the time it was verified) is kept, and it is not sent to any other service. basic_profile is the only scope requested (Epic requires it; nothing
// from the profile is read or stored).
//
// Matching to Ballchasing: the verified account id is saved as the Rocket League identity with platform 'epic', and replays are matched by
// platform and id exactly, as for every other identity. Never by name.

export const EPIC_AUTHORIZE_URL = "https://www.epicgames.com/id/authorize";
export const EPIC_TOKEN_URL = "https://api.epicgames.dev/epic/oauth/v2/token";
export const EPIC_TOKEN_INFO_URL = "https://api.epicgames.dev/epic/oauth/v2/tokenInfo";
export const EPIC_SCOPE = "basic_profile";
export const EPIC_ACCOUNT_ID = /^[0-9a-f]{32}$/;

export const EPIC_ENV_NAMES = {
  enabled: "VICTRESS_EPIC_SIGNIN_ENABLED",
  clientId: "VICTRESS_EPIC_CLIENT_ID",
  clientSecret: "VICTRESS_EPIC_CLIENT_SECRET",
  redirectUri: "VICTRESS_EPIC_REDIRECT_URI",
  deploymentId: "VICTRESS_EPIC_DEPLOYMENT_ID",
} as const;

type Env = Record<string, string | undefined>;
export type EpicConfig = { clientId: string; clientSecret: string; redirectUri: string; deploymentId?: string };
const clean = (v: string | undefined) => (v ?? "").trim() || undefined;

/** The flag alone decides whether anything Epic is shown. Off (the default) means Victress behaves exactly as without this feature. */
export const epicFlagOn = (env: Env) => env[EPIC_ENV_NAMES.enabled] === "true";

/** Null unless the flag is on and the three required values are present and well formed. */
export function epicConfig(env: Env): EpicConfig | null {
  if (!epicFlagOn(env)) return null;
  const clientId = clean(env[EPIC_ENV_NAMES.clientId]);
  const clientSecret = clean(env[EPIC_ENV_NAMES.clientSecret]);
  const redirectUri = clean(env[EPIC_ENV_NAMES.redirectUri]);
  if (!clientId || !clientSecret || !redirectUri) return null;
  let u: URL;
  try { u = new URL(redirectUri); } catch { return null; }
  const local = u.hostname === "localhost" || u.hostname.endsWith(".localhost") || u.hostname === "127.0.0.1";
  if (u.protocol !== "https:" && !(local && u.protocol === "http:")) return null;
  if (!u.pathname.endsWith("/dashboard/link/epic/callback")) return null;
  return { clientId, clientSecret, redirectUri, deploymentId: clean(env[EPIC_ENV_NAMES.deploymentId]) };
}

export function authorizeUrl(cfg: EpicConfig, state: string): string {
  const p = new URLSearchParams({ client_id: cfg.clientId, redirect_uri: cfg.redirectUri, response_type: "code", scope: EPIC_SCOPE, state });
  return `${EPIC_AUTHORIZE_URL}?${p}`;
}

/** Constant time comparison of two short strings. */
export function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** The cookie value binds the state to the signed in player, so a callback cannot complete for a different Victress account. */
export const stateCookieValue = (state: string, profileId: string) => `${state}.${profileId}`;

export type EpicFailure = "denied" | "state" | "exchange" | "token_info" | "mismatch" | "unavailable";
export type EpicResult = { ok: true; accountId: string } | { ok: false; reason: EpicFailure };

const basic = (id: string, secret: string) => `Basic ${btoa(`${id}:${secret}`)}`;

/**
 * Checks the callback and returns the verified Epic Account ID. Nothing here trusts the browser beyond the code: the account id comes
 * from Epic's token endpoint (server to server, with the client secret) and is confirmed by Epic's token info endpoint.
 */
export async function verifyEpicCallback(args: {
  cfg: EpicConfig; profileId: string; query: { code?: string | null; state?: string | null; error?: string | null }; cookie?: string | null;
  fetch?: typeof fetch; timeoutMs?: number;
}): Promise<EpicResult> {
  const { cfg, profileId, query } = args;
  const doFetch = args.fetch ?? fetch;
  const timeoutMs = args.timeoutMs ?? 10_000;
  if (query.error) return { ok: false, reason: "denied" };
  const state = query.state ?? "";
  if (!/^[0-9a-f]{64}$/.test(state) || !args.cookie || !sameString(args.cookie, stateCookieValue(state, profileId))) return { ok: false, reason: "state" };
  const code = query.code ?? "";
  if (!/^[A-Za-z0-9._~-]{8,512}$/.test(code)) return { ok: false, reason: "exchange" };

  const form = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: cfg.redirectUri });
  if (cfg.deploymentId) form.set("deployment_id", cfg.deploymentId);
  let token: { access_token?: unknown; account_id?: unknown; client_id?: unknown };
  try {
    const res = await doFetch(EPIC_TOKEN_URL, {
      method: "POST", body: form, cache: "no-store", signal: AbortSignal.timeout(timeoutMs),
      headers: { Authorization: basic(cfg.clientId, cfg.clientSecret), "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) return { ok: false, reason: res.status >= 500 ? "unavailable" : "exchange" };
    token = await res.json();
  } catch { return { ok: false, reason: "unavailable" }; }
  const accountId = typeof token.account_id === "string" ? token.account_id.toLowerCase() : "";
  if (!EPIC_ACCOUNT_ID.test(accountId) || typeof token.access_token !== "string") return { ok: false, reason: "exchange" };
  if (typeof token.client_id === "string" && token.client_id !== cfg.clientId) return { ok: false, reason: "mismatch" };

  let info: { active?: unknown; account_id?: unknown; client_id?: unknown };
  try {
    const res = await doFetch(EPIC_TOKEN_INFO_URL, {
      method: "POST", body: new URLSearchParams({ token: token.access_token }), cache: "no-store", signal: AbortSignal.timeout(timeoutMs),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) return { ok: false, reason: res.status >= 500 ? "unavailable" : "token_info" };
    info = await res.json();
  } catch { return { ok: false, reason: "unavailable" }; }
  if (info.active !== true) return { ok: false, reason: "token_info" };
  if (typeof info.account_id !== "string" || info.account_id.toLowerCase() !== accountId) return { ok: false, reason: "mismatch" };
  if (typeof info.client_id === "string" && info.client_id !== cfg.clientId) return { ok: false, reason: "mismatch" };
  return { ok: true, accountId };
}

export type SaveOutcome = "saved" | "already" | "replaced" | "has_games" | "taken" | "error";

/** Minimal shape of the Supabase admin client used here, so tests can pass a stand in. */
type Admin = {
  from(t: string): any;
};

/**
 * Saves the verified Epic account as the player's Rocket League identity. Rules (same as typed identities): one identity per player;
 * an identity with saved games is never swapped for another (old games must never attach to a different player). One Epic account can
 * be verified on only one Victress account (the database enforces it too).
 */
export async function saveVerifiedEpic(admin: Admin, profileId: string, accountId: string, now = new Date()): Promise<SaveOutcome> {
  if (!EPIC_ACCOUNT_ID.test(accountId)) return "error";
  return saveVerifiedIdentity(admin, profileId, { platform: "epic", id: accountId, via: "epic_oauth" }, now);
}

/**
 * Saves a verified game identity (Epic sign in or Steam sign in) as the player's Rocket League identity. The same rules for every
 * provider: one identity per player; an identity with saved games is never swapped for another; one verified account per Victress account.
 */
export async function saveVerifiedIdentity(admin: Admin, profileId: string, who: { platform: "epic" | "steam"; id: string; via: "epic_oauth" | "steam_openid" }, now = new Date()): Promise<SaveOutcome> {
  const verified = { platform: who.platform, external_id: who.id, ownership_verified: true, verified_via: who.via, verified_at: now.toISOString() };
  const { data: other } = await admin.from("game_accounts").select("profile_id").eq("game", "ROCKET_LEAGUE").eq("platform", who.platform).eq("external_id", who.id).eq("ownership_verified", true).maybeSingle();
  if (other && other.profile_id !== profileId) return "taken";
  const { data: cur, error: readErr } = await admin.from("game_accounts").select("id, platform, external_id, ownership_verified").eq("profile_id", profileId).eq("game", "ROCKET_LEAGUE").maybeSingle();
  if (readErr) return "error";
  if (cur) {
    const same = cur.platform === who.platform && String(cur.external_id).toLowerCase() === who.id.toLowerCase();
    if (same && cur.ownership_verified) return "already";
    if (!same) {
      const { count } = await admin.from("game_matches").select("id", { count: "exact", head: true }).eq("profile_id", profileId).eq("game", "ROCKET_LEAGUE");
      if ((count ?? 0) > 0) return "has_games";
    }
    const { error } = await admin.from("game_accounts").update(verified).eq("id", cur.id);
    if (error) return error.code === "23505" ? "taken" : "error";
    return same ? "saved" : "replaced";
  }
  const { error } = await admin.from("game_accounts").insert({ profile_id: profileId, game: "ROCKET_LEAGUE", provider: "rocket_league", ...verified });
  if (error) return error.code === "23505" ? "taken" : "error";
  return "saved";
}

/** What the Rocket League page says after the callback. Fixed texts only; nothing from Epic or the URL is echoed. */
export const EPIC_MESSAGES: Record<SaveOutcome | EpicFailure | "off", string> = {
  saved: "Your Epic Games account is verified. Victress will match you in replays by this Epic account ID only. Submit an Unlisted or Public replay you played on Epic to check that it matches.",
  already: "This Epic Games account was already verified on your Victress account.",
  replaced: "Your Rocket League ID is now your verified Epic Games account.",
  has_games: "Delete your saved Rocket League games before switching to a different account, so old games are never attached to a different player.",
  taken: "This Epic Games account is already verified on another Victress account. Nothing was changed.",
  error: "Something went wrong. Nothing was changed. Try again.",
  denied: "Epic sign in was cancelled. Nothing was changed.",
  state: "That Epic sign in link expired or was opened in a different session. Start again from this page.",
  exchange: "Epic did not confirm the sign in. Nothing was changed. Try again.",
  token_info: "Epic did not confirm the sign in. Nothing was changed. Try again.",
  mismatch: "Epic returned details that did not match. Nothing was changed.",
  unavailable: "Epic did not answer. Nothing was changed. Try again in a minute.",
  off: "Epic verification is not available.",
};
