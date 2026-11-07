// The complete list of events the code may send, with the parameters each may carry.
// Anything else is dropped before it reaches the data layer. This is the privacy guard for event data.
import type { SiteKey } from "./sanitize";

const SPEC: Record<string, { sites: SiteKey[]; params: string[] }> = {
  // Marketing site
  cta_click: { sites: ["m"], params: ["cta_text", "cta_location", "destination"] },
  sign_up_click: { sites: ["m"], params: ["cta_location"] },
  pricing_page_view: { sites: ["m"], params: [] },
  generate_lead: { sites: ["m"], params: ["lead_type", "interest"] },
  // Application
  login: { sites: ["a"], params: ["method"] },
  sign_up: { sites: ["a"], params: ["method"] },
  player_resume_created: { sites: ["a"], params: ["game", "role_selected", "rank_selected"] },
  player_resume_updated: { sites: ["a"], params: ["update_type"] },
  player_resume_shared: { sites: ["a"], params: ["method"] },
  team_created: { sites: ["a"], params: [] },
  team_joined: { sites: ["a"], params: [] },
  // Both: client side navigation (see lib/analytics/client.ts)
  spa_page_view: { sites: ["m", "a"], params: ["page_location", "page_path", "page_title"] },
};

export const EVENT_NAMES = Object.keys(SPEC);

const EMAIL = /\S+@\S+\.\S+/;
const TOKENISH = /[A-Za-z0-9_-]{32,}/;

/** Returns cleaned parameters, or null when the event is not allowed on this site. */
export function scrubParams(site: SiteKey, name: string, params: Record<string, unknown> = {}): Record<string, string | number | boolean> | null {
  const spec = SPEC[name];
  if (!spec || !spec.sites.includes(site)) return null;
  const out: Record<string, string | number | boolean> = {};
  for (const key of spec.params) {
    const v = params[key];
    if (typeof v === "boolean" || typeof v === "number") out[key] = v;
    else if (typeof v === "string") {
      const s = v.trim();
      if (s && s.length <= 120 && !EMAIL.test(s) && !TOKENISH.test(s)) out[key] = s;
    }
  }
  return out;
}
