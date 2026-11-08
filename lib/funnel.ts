import "server-only";
import { isMissingTable } from "@/lib/db-errors";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * First party funnel events, stored in our own database (public.funnel_events, migration 20261108000200).
 * No third party, no cookie, no IP address, no user agent, no page URL. Anonymous events carry no identity.
 * Recording never blocks or breaks a page: every failure is swallowed (and the table may not exist yet).
 */
export type FunnelEvent = "registration_started" | "registration_completed" | "profile_completed" | "first_import_started" | "first_analysis_viewed" | "return_visit";
export type FunnelProps = { method?: "email" | "discord" | "google"; game?: "LOL" | "ROCKET_LEAGUE" };

export async function recordFunnelEvent(name: FunnelEvent, profileId: string | null, props: FunnelProps = {}): Promise<void> {
  try {
    const admin = supabaseAdmin();
    if (!admin) return;
    const clean: FunnelProps = {};
    if (props.method === "email" || props.method === "discord" || props.method === "google") clean.method = props.method;
    if (props.game === "LOL" || props.game === "ROCKET_LEAGUE") clean.game = props.game;
    const { error } = await admin.from("funnel_events").insert({ name, profile_id: profileId, props: clean });
    // 23505: this once-only event (or today's return visit) is already recorded. A missing table means the migration is not applied.
    if (error && error.code !== "23505" && !isMissingTable(error)) console.error("funnel event failed", name, error.code);
  } catch {
    // never let analytics break a request
  }
}

/** Profile completed = a name the player chose (not the placeholder) and at least one game. Checked after the steps that can finish it. */
export async function recordProfileCompletedIfDone(sb: import("@supabase/supabase-js").SupabaseClient<import("@/types/database").Database>, userId: string): Promise<void> {
  try {
    const [{ data: profile }, { count }] = await Promise.all([
      sb.from("profiles").select("handle").eq("id", userId).maybeSingle(),
      sb.from("player_games").select("game", { count: "exact", head: true }).eq("profile_id", userId),
    ]);
    if (profile && !/^p[0-9a-f]{12}$/.test(profile.handle) && (count ?? 0) > 0) await recordFunnelEvent("profile_completed", userId);
  } catch {
    // ignore
  }
}

/** A return visit is a signed in visit on a UTC day after the day the account was created. At most one per player per day (the database enforces it). */
export async function recordReturnVisit(userId: string, createdAt: string | undefined): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  if (!createdAt || createdAt.slice(0, 10) >= today) return;
  await recordFunnelEvent("return_visit", userId);
}
