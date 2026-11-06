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
          display_name: string | null;
          game: string | null;
          handle: string;
          handle_changed_at: string | null;
          id: string;
          is_demo: boolean;
          rank: string | null;
          role: string | null;
          team_id: string | null;
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
          team_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          game?: string | null;
          handle?: string;
          handle_changed_at?: string | null;
          id?: string;
          is_demo?: boolean;
          rank?: string | null;
          role?: string | null;
          team_id?: string | null;
        };
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
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string | null;
          display_name: string | null;
          game: string | null;
          handle: string | null;
          id: string | null;
          is_demo: boolean | null;
          rank: string | null;
          role: string | null;
          team_name: string | null;
          team_slug: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      claim_handle: { Args: { p_handle: string }; Returns: string };
      create_team: { Args: { p_name: string }; Returns: Json };
      handle_change_available_at: { Args: Record<string, never>; Returns: string | null };
      handle_is_allowed: { Args: { h: string }; Returns: boolean };
      is_team_member: { Args: { _team_id: string }; Returns: boolean };
      join_team: { Args: { p_code: string }; Returns: string };
      leaderboard: {
        Args: { p_game: string; p_metric: string; p_limit?: number; p_include_demo?: boolean };
        Returns: {
          place: number;
          handle: string;
          display_name: string | null;
          avatar_url: string | null;
          role: string | null;
          rank: string | null;
          value: number;
          matches: number | null;
          is_demo: boolean;
          season: string;
          updated_at: string;
        }[];
      };
      leaderboard_player_count: { Args: { p_game: string; p_include_demo?: boolean }; Returns: number };
      leave_team: { Args: Record<string, never>; Returns: string };
      metrics_are_valid: { Args: { m: Json }; Returns: boolean };
      regenerate_invite_code: { Args: Record<string, never>; Returns: string | null };
      remove_team_member: { Args: { p_profile: string }; Returns: string };
      set_primary_game: { Args: { p_game: string }; Returns: string };
      team_invite_code: { Args: Record<string, never>; Returns: string | null };
      team_invite_info: { Args: { p_code: string }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Views<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"];
