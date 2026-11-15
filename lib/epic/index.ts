import "server-only";
import { epicConfig, epicFlagOn, type EpicConfig } from "./core";

export * from "./core";

/** Epic verification is shown only when VICTRESS_EPIC_SIGNIN_ENABLED is "true". Steam and typed identities never depend on it. */
export const epicEnabled = () => epicFlagOn(process.env);

/** Server only: the client secret is read here at runtime and never mapped to the browser. Null when off or not configured. */
export function epicServerConfig(): EpicConfig | null {
  const cfg = epicConfig(process.env);
  if (!cfg && epicEnabled()) console.error("Epic verification is enabled but VICTRESS_EPIC_CLIENT_ID, VICTRESS_EPIC_CLIENT_SECRET or VICTRESS_EPIC_REDIRECT_URI is missing or invalid.");
  return cfg;
}

export const EPIC_STATE_COOKIE = "v_epic_state";
export const EPIC_COOKIE_PATH = "/dashboard/link/epic";
