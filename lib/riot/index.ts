import "server-only";
import { createRiotClient, type RiotClient } from "./core";

export * from "./core";

let client: RiotClient | null | undefined;

/**
 * The shared Riot client for server code only. RIOT_API_KEY is read at runtime here and nowhere else;
 * it is never mapped to the browser or any built file (npm run test:riot checks this).
 * Returns null when the key is missing so callers can show "not configured" instead of crashing.
 */
export function riotClient(): RiotClient | null {
  if (client === undefined) {
    const key = process.env.RIOT_API_KEY?.trim();
    client = key ? createRiotClient({ apiKey: key }) : null;
    if (!client) console.error("RIOT_API_KEY is not set; Riot import is unavailable.");
  }
  return client;
}
