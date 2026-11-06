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
          id: string;
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
          id: string;
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
          id?: string;
          rank?: string | null;
          role?: string | null;
          team_id?: string | null;
        };
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
      handle_is_allowed: { Args: { h: string }; Returns: boolean };
      is_team_member: { Args: { _team_id: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Views<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"];
