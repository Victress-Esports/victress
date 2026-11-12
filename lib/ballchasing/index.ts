import "server-only";
import { createBallchasingClient, type BallchasingClient } from "./core";

export * from "./core";

let client: BallchasingClient | null | undefined;

/**
 * The shared Ballchasing client for server code only. BALLCHASING_API_TOKEN is read at runtime here and nowhere else; it is never
 * mapped to the browser. Replay links are READ through this client (the read limits), never uploaded, so Victress's own upload quota is
 * not used by a player submission. Returns null when the token is missing so callers can say "not configured".
 */
export function ballchasingClient(): BallchasingClient | null {
  if (client === undefined) {
    const token = process.env.BALLCHASING_API_TOKEN?.trim();
    client = token ? createBallchasingClient({ token }) : null;
    if (!client) console.error("BALLCHASING_API_TOKEN is not set; Rocket League replay import is unavailable.");
  }
  return client;
}
