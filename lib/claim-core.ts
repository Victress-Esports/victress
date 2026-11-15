import { createHmac } from "node:crypto";

// Keys for claimable snapshots (migration 20261116000100). The database stores only HMAC SHA-256("platform:id") made with
// VICTRESS_CLAIM_KEY, never the platform id itself, and never sees the secret. Matching is exact: the platform and id are used exactly as
// given (Ballchasing's values when storing, the VERIFIED identity's values when claiming). Nothing is lower cased or trimmed here.

const MIN_SECRET = 32;

/** Null when the secret is missing or too short: snapshots are then not created and nothing can be claimed. */
export function claimKeyFn(env: Record<string, string | undefined> = process.env): ((platform: string, id: string) => string) | null {
  const secret = env.VICTRESS_CLAIM_KEY;
  if (!secret || secret.length < MIN_SECRET) return null;
  return (platform, id) => createHmac("sha256", secret).update(`${platform}:${id}`).digest("hex");
}
