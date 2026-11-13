import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

// First party product events, stored in our own database (public.events, migration 20261113000100). No outside analytics service.
// Extra data is limited to a source, a referral code and a game name, and the database refuses anything else. Never pass replay
// numbers, replay or match ids, platform ids, names, emails, IP addresses or page paths. Recording never blocks or fails the caller.

export type EventName =
  | "registration_completed" | "discord_linked" | "game_identity_linked" | "team_created" | "team_joined"
  | "first_scrim_submitted" | "scrim_processing_completed" | "repeat_scrim_submitted";
export type EventProps = { source?: "web" | "discord" | "email" | "google" | "invite"; referral?: string; game?: "ROCKET_LEAGUE" | "LOL" | "VALORANT" | "CS2" | "APEX" | "OVERWATCH2" };

const REFERRAL = /^[a-z0-9][a-z0-9_-]{0,31}$/;
/** A referral code as the database accepts it, or undefined. Lower cased; anything else is dropped rather than stored. */
export function cleanReferral(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().toLowerCase();
  return REFERRAL.test(s) ? s : undefined;
}

export async function recordEvent(profileId: string, name: EventName, props: EventProps = {}, admin: any = supabaseAdmin()): Promise<void> {
  if (!admin || !profileId) return;
  const clean: EventProps = { ...props };
  if (props.referral !== undefined) { const r = cleanReferral(props.referral); if (r) clean.referral = r; else delete clean.referral; }
  try {
    const { error } = await admin.rpc("record_event", { p_profile: profileId, p_name: name, p_props: clean });
    if (error) console.error(JSON.stringify({ src: "events", event: "record_failed", code: error.code ?? "unknown" }));
  } catch {
    console.error(JSON.stringify({ src: "events", event: "record_failed", code: "exception" }));
  }
}
