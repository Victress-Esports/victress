// Generated from the Supabase project schema (generate_typescript_types), generic helpers trimmed.
// Regenerate after every migration.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          directory_listed: boolean;
          display_name: string | null;
          game: string | null;
          handle: string;
          handle_changed_at: string | null;
          id: string;
          is_demo: boolean;
          rank: string | null;
          role: string | null;
          public_fields: Json;
          scoutable: boolean;
          search_indexable: boolean;
          show_on_leaderboards: boolean;
          team_id: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          game?: string | null;
          handle: string;
          handle_changed_at?: string | null;
          id: string;
          is_demo?: boolean;
          rank?: string | null;
          role?: string | null;
          public_fields?: Json;
          scoutable?: boolean;
          search_indexable?: boolean;
          show_on_leaderboards?: boolean;
          team_id?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          directory_listed?: boolean;
          display_name?: string | null;
          game?: string | null;
          handle?: string;
          handle_changed_at?: string | null;
          id?: string;
          is_demo?: boolean;
          rank?: string | null;
          role?: string | null;
          public_fields?: Json;
          scoutable?: boolean;
          search_indexable?: boolean;
          show_on_leaderboards?: boolean;
          team_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_share_links: {
        Row: {
          created_at: string; expires_at: string | null; fields: Json; id: string; label: string | null;
          last_viewed_at: string | null; profile_id: string; revoked_at: string | null; view_count: number;
        };
        // token_hash is write only: the database never returns it to the application.
        Insert: { expires_at?: string | null; fields?: Json; label?: string | null; profile_id: string; token_hash: string };
        Update: { expires_at?: string | null; fields?: Json; label?: string | null; revoked_at?: string | null };
        Relationships: [];
      };
      tournament_entries: {
        Row: { created_at: string; game: string; id: string; name: string; placement: string | null; played_on: string | null; profile_id: string; team_name: string | null };
        Insert: { game: string; name: string; placement?: string | null; played_on?: string | null; profile_id: string; team_name?: string | null };
        Update: { game?: string; name?: string; placement?: string | null; played_on?: string | null; team_name?: string | null };
        Relationships: [];
      };
      highlights: {
        Row: { created_at: string; game: string; id: string; note: string | null; profile_id: string; title: string; url: string };
        Insert: { game: string; note?: string | null; profile_id: string; title: string; url: string };
        Update: { game?: string; note?: string | null; title?: string; url?: string };
        Relationships: [];
      };
      scrim_uploads: {
        Row: { created_at: string; game: string; id: string; original_name: string; profile_id: string; size_bytes: number; status: string; storage_path: string };
        // Clients cannot insert: the server records uploads with the service role (migration 20261107000310).
        Insert: never;
        Update: Record<string, never>;
        Relationships: [];
      };
      age_confirmations: {
        Row: { birth_date: string; confirmed_at: string; profile_id: string };
        Insert: { birth_date: string; profile_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      legal_acceptances: {
        Row: { accepted_at: string; document: "terms" | "privacy"; id: string; profile_id: string; version: string };
        Insert: { document: "terms" | "privacy"; profile_id: string; version: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      scrim_matches: {
        Row: { created_at: string; game: string; id: string; map: string | null; note: string | null; opponent: string | null; played_on: string; profile_id: string; result: "win" | "loss" | "draw"; score: string | null; source: string };
        Insert: { game: string; map?: string | null; note?: string | null; opponent?: string | null; played_on: string; profile_id: string; result: "win" | "loss" | "draw"; score?: string | null };
        Update: { game?: string; map?: string | null; note?: string | null; opponent?: string | null; played_on?: string; result?: "win" | "loss" | "draw"; score?: string | null };
        Relationships: [];
      };
      // Migration 20261108000100. Clients can only read and delete; the server writes with the service role after calling the game API.
      discord_links: {
        Row: { consent_version: string; discord_user_id: string; linked_at: string; profile_id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      game_accounts: {
        Row: { created_at: string; display_name: string | null; external_id: string; game: string; id: string; last_imported_at: string | null; ownership_verified: boolean; platform: string | null; profile_id: string; provider: "riot" | "rocket_league"; region: "americas" | "europe" | "asia" | "sea" | null; tag: string | null };
        Insert: { display_name?: string | null; external_id: string; game: string; platform?: string | null; profile_id: string; provider: "riot" | "rocket_league"; region?: "americas" | "europe" | "asia" | "sea" | null; tag?: string | null; last_imported_at?: string | null };
        Update: { display_name?: string | null; external_id?: string; platform?: string | null; region?: "americas" | "europe" | "asia" | "sea" | null; tag?: string | null; last_imported_at?: string | null };
        Relationships: [];
      };
      game_matches: {
        Row: { account_id: string; duration_seconds: number; external_id: string; game: string; game_version: string | null; id: string; imported_at: string; me: Json; objectives: Json; participants: Json; played_at: string; profile_id: string; queue_id: number | null; queue_kind: "ranked" | "normal" | "custom" | "other"; queue_label: string | null; result: "win" | "loss" | "remake"; source: "api" | "demo_parsed"; source_detail: "riot_api" | "ballchasing_replay" | null; timeline: Json | null };
        Insert: { account_id: string; duration_seconds: number; external_id: string; game: string; game_version?: string | null; me: Json; objectives?: Json; participants: Json; played_at: string; profile_id: string; queue_id?: number | null; queue_kind: "ranked" | "normal" | "custom" | "other"; queue_label?: string | null; result: "win" | "loss" | "remake"; source: "api" | "demo_parsed"; source_detail?: "riot_api" | "ballchasing_replay" | null; timeline?: Json | null };
        Update: Record<string, never>;
        Relationships: [];
      };
      import_jobs: {
        Row: { consent_at: string | null; created_at: string; error_code: string | null; error_message: string | null; external_ref: string | null; failed_matches: number; finished_at: string | null; game: string; id: string; imported: number; profile_id: string; provider: "riot" | "ballchasing"; requested: number; submitted_via: "web" | "discord"; skipped_custom: number; skipped_existing: number; started_at: string | null; status: "queued" | "running" | "succeeded" | "failed" };
        Insert: { consent_at?: string | null; external_ref?: string | null; game: string; profile_id: string; provider: "riot" | "ballchasing"; requested: number; started_at?: string; submitted_via?: "web" | "discord"; status?: "queued" | "running" | "succeeded" | "failed" };
        Update: { error_code?: string | null; error_message?: string | null; failed_matches?: number; finished_at?: string; imported?: number; skipped_custom?: number; skipped_existing?: number; status?: "queued" | "running" | "succeeded" | "failed" };
        Relationships: [];
      };
      // Migration 20261113000100. Clients read (row level security) and delete; writes go through record_team_scrim / set_team_stat_sharing.
      team_scrims: {
        Row: { created_at: string; duration_seconds: number; game: "ROCKET_LEAGUE"; goals_against: number; goals_for: number; id: string; opponent_label: string | null; opponent_totals: Json; overtime: boolean; played_at: string; queue_kind: "ranked" | "normal" | "custom" | "other"; replay_id: string; result: "win" | "loss" | "no_result"; side: "blue" | "orange"; side_players: number; source: "api"; source_detail: "ballchasing_replay"; submitted_by: string | null; submitted_via: "web" | "discord"; team_id: string; team_totals: Json };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      team_scrim_lines: {
        Row: { profile_id: string; scrim_id: string; stats: Json };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      team_stat_sharing: {
        Row: { game: "ROCKET_LEAGUE"; granted_at: string; profile_id: string; team_id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      player_games: {
        Row: { created_at: string; game: string; is_primary: boolean; profile_id: string; rank: string | null; role: string | null };
        Insert: { created_at?: string; game: string; is_primary?: boolean; profile_id: string; rank?: string | null; role?: string | null };
        Update: { created_at?: string; game?: string; is_primary?: boolean; profile_id?: string; rank?: string | null; role?: string | null };
        Relationships: [];
      };
      stat_entries: {
        Row: {
          created_at: string;
          game: string;
          id: string;
          metrics: Json;
          profile_id: string;
          season: string;
          source: string;
        };
        Insert: {
          created_at?: string;
          game: string;
          id?: string;
          metrics: Json;
          profile_id: string;
          season: string;
          source?: string;
        };
        Update: {
          created_at?: string;
          game?: string;
          id?: string;
          metrics?: Json;
          profile_id?: string;
          season?: string;
          source?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: { joined_at: string; profile_id: string; role: string; team_id: string };
        Insert: { joined_at?: string; profile_id: string; role?: string; team_id: string };
        Update: { joined_at?: string; profile_id?: string; role?: string; team_id?: string };
        Relationships: [];
      };
      teams: {
        Row: { created_at: string; id: string; invite_code: string; name: string; owner_id: string; slug: string };
        Insert: { created_at?: string; id?: string; invite_code?: string; name: string; owner_id: string; slug: string };
        Update: { created_at?: string; id?: string; invite_code?: string; name?: string; owner_id?: string; slug?: string };
        Relationships: [];
      };
      waitlist: {
        Row: { created_at: string; email: string; id: string; interest: string };
        Insert: { created_at?: string; email: string; id?: string; interest: string };
        Update: { created_at?: string; email?: string; id?: string; interest?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      claim_handle: { Args: { p_handle: string }; Returns: string };
      create_team: { Args: { p_name: string }; Returns: Json };
      handle_change_available_at: { Args: Record<string, never>; Returns: string | null };
      handle_is_allowed: { Args: { h: string }; Returns: boolean };
      is_team_member: { Args: { _team_id: string }; Returns: boolean };
      join_team: { Args: { p_code: string }; Returns: string };
      board_entries: {
        Args: { p_game: string; p_metric: string; p_limit?: number; p_include_demo?: boolean };
        Returns: {
          place: number; handle: string; display_name: string | null; avatar_url: string | null; role: string | null; rank: string | null;
          value: number; matches: number | null; is_demo: boolean; season: string; updated_at: string;
        }[];
      };
      board_player_count: { Args: { p_game: string; p_include_demo?: boolean }; Returns: number };
      directory_profile: { Args: { p_handle: string }; Returns: Json };
      handle_available: { Args: { p_handle: string }; Returns: boolean };
      shared_profile: { Args: { p_hash: string }; Returns: Json };
      sitemap_directory_count: { Args: Record<string, never>; Returns: number };
      sitemap_directory_profiles: { Args: { p_limit?: number; p_offset?: number }; Returns: { handle: string; updated_at: string }[] };
      upload_allowed: { Args: Record<string, never>; Returns: boolean };
      team_roster: {
        Args: Record<string, never>;
        Returns: { profile_id: string; team_role: string; handle: string; display_name: string | null; avatar_url: string | null; game: string | null; rank: string | null; joined_at: string }[];
      };
      leave_team: { Args: Record<string, never>; Returns: string };
      set_team_stat_sharing: { Args: { p_on: boolean }; Returns: string };
      metrics_are_valid: { Args: { m: Json }; Returns: boolean };
      regenerate_invite_code: { Args: Record<string, never>; Returns: string | null };
      remove_team_member: { Args: { p_profile: string }; Returns: string };
      set_primary_game: { Args: { p_game: string }; Returns: string };
      team_invite_code: { Args: Record<string, never>; Returns: string | null };
      team_invite_info: { Args: { p_code: string }; Returns: Json };
      discord_link_preview: { Args: { p_code_hash: string }; Returns: Json };
      discord_complete_link: { Args: { p_code_hash: string; p_consent_version: string }; Returns: string };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Views<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"];
