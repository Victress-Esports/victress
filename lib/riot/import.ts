import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RiotError, type RiotRoute } from "./core";
import { riotClient } from "./index";
import { normalizeMatch, normalizeTimeline } from "./normalize";

/** Whether custom games may be stored. Off: Riot allows custom match data to reach a player only through Riot Sign On (production key). */
export const customGamesEnabled = () => process.env.RIOT_CUSTOM_GAMES_ENABLED === "true";

export type ImportSummary = { ok: boolean; jobId?: string; message: string; imported?: number; skippedExisting?: number; skippedCustom?: number; failedMatches?: number };

const DEADLINE_MS = 45_000;

/**
 * Imports recent League of Legends matches for one signed in player. Server only.
 * Every row is stored with source 'api' and owned by the player. Job status is written as it goes, and a failure is
 * recorded with a plain message and no key, URL or response body.
 */
export async function runLolImport(admin: SupabaseClient, userId: string, riotId: { gameName: string; tagLine: string }, route: RiotRoute, count: number): Promise<ImportSummary> {
  const riot = riotClient();
  if (!riot) return { ok: false, message: "League of Legends import is not configured yet." };

  // Close out a job that was left running (a crashed request) so it cannot block the player forever.
  await admin.from("import_jobs").update({ status: "failed", error_code: "stale", error_message: "The import did not finish.", finished_at: new Date().toISOString() })
    .eq("profile_id", userId).in("status", ["queued", "running"]).lt("created_at", new Date(Date.now() - 10 * 60_000).toISOString());

  const { data: job, error: jobError } = await admin.from("import_jobs")
    .insert({ profile_id: userId, game: "LOL", provider: "riot", requested: count, status: "running", started_at: new Date().toISOString() })
    .select("id").single();
  if (jobError || !job) {
    if (jobError?.code === "23505") return { ok: false, message: "An import is already running. Wait for it to finish." };
    return { ok: false, message: jobError?.message?.includes("import_limit") ? "Import history is full. Delete old import records first." : "Couldn't start the import. Try again." };
  }
  const finish = async (patch: Record<string, unknown>) => { await admin.from("import_jobs").update({ ...patch, finished_at: new Date().toISOString() }).eq("id", job.id); };
  let imported = 0, skippedExisting = 0, skippedCustom = 0, failedMatches = 0;

  try {
    const acct = await riot.accountByRiotId(riotId.gameName, riotId.tagLine, route);

    const { data: existingAcct } = await admin.from("game_accounts").select("id, external_id").eq("profile_id", userId).eq("game", "LOL").maybeSingle();
    if (existingAcct && existingAcct.external_id !== acct.puuid) {
      await finish({ status: "failed", error_code: "other_account", error_message: "A different Riot ID is already linked. Remove it first." });
      return { ok: false, jobId: job.id, message: "A different Riot ID is already linked. Remove it first." };
    }
    let accountId = existingAcct?.id as string | undefined;
    if (!accountId) {
      const { data: created, error } = await admin.from("game_accounts")
        .insert({ profile_id: userId, game: "LOL", provider: "riot", external_id: acct.puuid, display_name: acct.gameName, tag: acct.tagLine, region: route })
        .select("id").single();
      if (error || !created) throw new Error("account_insert");
      accountId = created.id;
    } else {
      await admin.from("game_accounts").update({ display_name: acct.gameName, tag: acct.tagLine, region: route }).eq("id", accountId);
    }

    const ids = await riot.matchIds(acct.puuid, route, { count });
    const { data: have } = ids.length ? await admin.from("game_matches").select("external_id").eq("profile_id", userId).eq("game", "LOL").in("external_id", ids) : { data: [] };
    const known = new Set((have ?? []).map((r: { external_id: string }) => r.external_id));
    const started = Date.now();
    let stoppedEarly = false;

    for (const id of ids) {
      if (known.has(id)) { skippedExisting++; continue; }
      if (Date.now() - started > DEADLINE_MS) { stoppedEarly = true; break; }
      try {
        const m = normalizeMatch(await riot.match(id, route), acct.puuid);
        if (!m.ok) { failedMatches++; continue; }
        if (m.row.queue_kind === "custom" && !customGamesEnabled()) { skippedCustom++; continue; }
        let timeline = null;
        try { timeline = normalizeTimeline(await riot.timeline(id, route), m.row.me.slot); } catch (e) { if (e instanceof RiotError && (e.code === "auth" || e.code === "rate_limited")) throw e; }
        const { error } = await admin.from("game_matches").insert({
          profile_id: userId, account_id: accountId, game: "LOL", source: "api", external_id: m.row.external_id, queue_id: m.row.queue_id, queue_kind: m.row.queue_kind,
          queue_label: m.row.queue_label, played_at: m.row.played_at, duration_seconds: m.row.duration_seconds, game_version: m.row.game_version, result: m.row.result,
          me: m.row.me, participants: m.row.participants, objectives: m.row.objectives, timeline,
        });
        if (error) { if (error.message.includes("import_limit")) { stoppedEarly = true; break; } failedMatches++; } else imported++;
      } catch (e) {
        if (e instanceof RiotError && (e.code === "auth" || e.code === "rate_limited" || e.code === "unavailable")) throw e;
        failedMatches++;
      }
    }
    await admin.from("game_accounts").update({ last_imported_at: new Date().toISOString() }).eq("id", accountId);
    const note = stoppedEarly ? "Stopped early to stay within time limits. Import again to continue." : null;
    await finish({ status: "succeeded", imported, skipped_existing: skippedExisting, skipped_custom: skippedCustom, failed_matches: failedMatches, error_message: note });
    const parts = [`${imported} imported`];
    if (skippedExisting) parts.push(`${skippedExisting} already imported`);
    if (skippedCustom) parts.push(`${skippedCustom} custom games not stored`);
    if (failedMatches) parts.push(`${failedMatches} could not be read`);
    return { ok: true, jobId: job.id, message: parts.join(", ") + "." + (note ? ` ${note}` : ""), imported, skippedExisting, skippedCustom, failedMatches };
  } catch (e) {
    const err = e instanceof RiotError ? e : null;
    const message = err ? (err.code === "not_found" ? "Riot has no player with that Riot ID in this region. Check the spelling, tag and region." : err.message) : "Something went wrong during the import. Nothing was lost; try again.";
    await finish({ status: "failed", imported, skipped_existing: skippedExisting, skipped_custom: skippedCustom, failed_matches: failedMatches, error_code: err?.code ?? "unexpected", error_message: message.slice(0, 200) });
    return { ok: false, jobId: job.id, message, imported };
  }
}
