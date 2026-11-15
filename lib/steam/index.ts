import "server-only";
import { steamConfig, steamFlagOn, type SteamConfig } from "./core";

export * from "./core";

/** Steam verification is shown only when VICTRESS_STEAM_SIGNIN_ENABLED is "true". It does not depend on Epic, and Epic does not depend on it. */
export const steamEnabled = () => steamFlagOn(process.env);
export function steamServerConfig(): SteamConfig | null {
  const cfg = steamConfig(process.env);
  if (!cfg && steamEnabled()) console.error("Steam verification is enabled but VICTRESS_STEAM_RETURN_URL is missing or invalid.");
  return cfg;
}
export const STEAM_STATE_COOKIE = "v_steam_state";
export const STEAM_COOKIE_PATH = "/dashboard/link/steam";
