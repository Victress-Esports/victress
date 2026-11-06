import { z } from "zod";

export const RESERVED_HANDLES = [
  "admin", "api", "login", "app", "www", "support", "victress",
  // other routes and obvious impersonation targets
  "dashboard", "onboarding", "join", "settings", "pricing", "teams", "team", "about", "privacy", "terms",
  "staff", "help", "mod", "moderator", "official", "root", "null", "undefined", "auth",
  "leaderboard", "leaderboards", "games", "stats", "profile", "profiles", "signup", "logout",
];

/** Signup-generated placeholder handles look like p + 12 hex characters. Nobody can pick one. */
export const PLACEHOLDER_HANDLE = /^p[0-9a-f]{12}$/;

// Short, deliberately conservative list. Matched as substrings after stripping underscores.
const OFFENSIVE_FRAGMENTS = [
  "fuck", "shit", "bitch", "cunt", "nigg", "fagg", "retard", "rapist", "nazi", "hitler", "slut", "whore",
];

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "Use 3 to 20 letters, numbers or underscores.");

export type HandleVerdict = "ok" | "invalid" | "reserved";

export function checkHandle(raw: string): { verdict: HandleVerdict; handle: string } {
  const parsed = handleSchema.safeParse(raw);
  if (!parsed.success) return { verdict: "invalid", handle: raw.trim().toLowerCase() };
  const handle = parsed.data;
  const flat = handle.replaceAll("_", "");
  if (RESERVED_HANDLES.includes(handle) || PLACEHOLDER_HANDLE.test(handle)) return { verdict: "reserved", handle };
  if (OFFENSIVE_FRAGMENTS.some((f) => flat.includes(f))) return { verdict: "reserved", handle };
  return { verdict: "ok", handle };
}
