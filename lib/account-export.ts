import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isMissingTable } from "@/lib/db-errors";
import type { Database } from "@/types/database";

/**
 * Everything Victress holds about one signed in player, read with that player's own session, so row level security decides
 * what is returned (only their own rows). Nothing about other people: a team shows its name and the player's own role, not the
 * roster. Share link tokens are not included (only a hash is stored and even the owner cannot read it). Tables that do not
 * exist in this database yet are skipped, never faked.
 */
/** `events` reads this account's product events (server only table); pass null when the server cannot read them. */
export async function buildAccountExport(sb: SupabaseClient<Database>, user: User, events: (() => Promise<unknown[] | null>) | null = null) {
  const own = async (table: string, columns: string, key = "profile_id") => {
    // The table names are fixed below; the client is untyped here on purpose so one helper can read them all.
    const { data, error } = await (sb as unknown as SupabaseClient).from(table).select(columns).eq(key, user.id);
    if (isMissingTable(error)) return null;
    if (error) throw new Error(`export failed reading ${table}`);
    return data ?? [];
  };

  const profile = await own("profiles", "handle, display_name, bio, avatar_url, game, role, team_id, search_indexable, directory_listed, show_on_leaderboards, public_fields, created_at, updated_at", "id");
  const membership = await own("team_members", "team_id, role, joined_at");
  let team: unknown = null;
  const teamId = (profile?.[0] as { team_id?: string } | undefined)?.team_id;
  if (teamId) {
    const { data } = await (sb as unknown as SupabaseClient).from("teams").select("name, created_at").eq("id", teamId).maybeSingle();
    team = data ?? null;
  }

  return {
    exported_at: new Date().toISOString(),
    about: "Everything Victress holds about this account, read with your own sign in. It contains nothing about other people.",
    account: { email: user.email ?? null, created_at: user.created_at ?? null, account_type: user.user_metadata?.account_type ?? null },
    profile: profile?.[0] ?? null,
    games: await own("player_games", "game, role, is_primary, created_at"),
    highlights: await own("highlights", "game, title, url, note, created_at"),
    team: team ? { ...(team as object), your_role: (membership?.[0] as { role?: string } | undefined)?.role ?? null } : null,
    share_links: await own("profile_share_links", "label, fields, created_at, expires_at, revoked_at, last_viewed_at, view_count"),
    practice_files: await own("scrim_uploads", "game, original_name, size_bytes, created_at"),
    discord_link: await own("discord_links", "discord_user_id, linked_at, consent_version"),
    game_imports: {
      accounts: await own("game_accounts", "game, provider, platform, external_id, display_name, tag, region, ownership_verified, created_at, last_imported_at"),
      matches: await own("game_matches", "game, source, source_detail, external_id, queue_kind, queue_label, played_at, duration_seconds, result, me, participants, objectives, imported_at"),
      submissions: await own("import_jobs", "game, provider, status, external_ref, submitted_via, consent_at, imported, skipped_existing, failed_matches, error_message, created_at, finished_at"),
    },
    team_scrims: {
      sharing: await own("team_stat_sharing", "team_id, game, granted_at"),
      your_lines: await own("team_scrim_lines", "scrim_id, stats"),
    },
    product_events: events ? await events() : null,
    consents: {
      age_confirmation: await own("age_confirmations", "birth_date, confirmed_at"),
      legal_acceptances: await own("legal_acceptances", "document, version, accepted_at"),
    },
    // Retired features: entered earlier by the player, no longer collected or shown anywhere, still held until deleted.
    retired: {
      stat_entries: await own("stat_entries", "game, season, metrics, source, created_at"),
      scrim_matches: await own("scrim_matches", "game, played_on, opponent, result, score, map, note, created_at"),
      tournament_entries: await own("tournament_entries", "game, name, placement, team_name, played_on, created_at"),
    },
  };
}
