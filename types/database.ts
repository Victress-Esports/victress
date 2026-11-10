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
      scrim_matches: {
        Row: { created_at: string; game: string; id: string; map: string | null; note: string | null; opponent: string | null; played_on: string; profile_id: string; result: "win" | "loss" | "draw"; score: string | null; source: string };
        Insert: { game: string; map?: string | null; note?: string | null; opponent?: string | null; played_on: string; profile_id: string; result: "win" | "loss" | "draw"; score?: string | null };
        Update: { game?: string; map?: string | null; note?: string | null; opponent?: string | null; played_on?: string; result?: "win" | "loss" | "draw"; score?: string | null };
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
      partner_organizations: {
        // stripe_customer_id, stripe_subscription_id and billing_event_at are not readable by the app roles (column grants).
        Row: {
          billing_interval: string | null; created_at: string; id: string; name: string; org_type: string; plan: string;
          subscription_status: string | null; terms_accepted_at: string; terms_version: string; updated_at: string;
          verified: boolean; verified_at: string | null; website: string | null;
        };
        Insert: never;
        Update: { name?: string; org_type?: string; website?: string | null };
        Relationships: [];
      };
      partner_members: {
        Row: { created_at: string; org_id: string; profile_id: string; role: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      partner_participation: {
        Row: { created_at: string; description: string; id: string; org_id: string; status: string; title: string; way: string };
        Insert: { description: string; org_id: string; title: string; way: string };
        Update: never;
        Relationships: [];
      };
      partner_opportunities: {
        Row: {
          created_at: string; id: string; org_id: string; organization_name: string; published_at: string | null; purpose: string;
          status: string; support_needed: string; title: string; type: string;
        };
        Insert: { org_id: string; purpose: string; support_needed: string; title: string; type: string };
        Update: never;
        Relationships: [];
      };
      partner_support_offers: {
        Row: { created_at: string; id: string; message: string; opportunity_id: string; org_id: string; status: string; support_type: string };
        Insert: { message: string; opportunity_id: string; org_id: string; support_type: string };
        Update: never;
        Relationships: [];
      };
      partner_exclusivity: {
        Row: {
          approved_at: string | null; activated_at: string | null; category: string; category_key: string; created_at: string; duration_months: number;
          ends_at: string | null; id: string; invoice_status: string | null; invoice_url: string | null; note: string | null; org_id: string;
          status: string; stripe_customer_id: string | null; stripe_invoice_id: string | null; updated_at: string;
        };
        Insert: { category: string; duration_months: number; note?: string | null; org_id: string };
        Update: never;
        Relationships: [];
      };
      partner_impact_records: {
        Row: {
          category: string; created_at: string; id: string; occurred_on: string; org_id: string; quantity: number | null;
          summary: string; title: string; unit: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      partner_findings: {
        Row: { area: string; created_at: string; id: string; published_at: string | null; source: string; summary: string; title: string };
        Insert: never;
        Update: never;
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
      create_partner_org: {
        Args: { p_name: string; p_type: string; p_website: string | null; p_terms_version: string; p_authorized: boolean };
        Returns: Json;
      };
      partner_org_id: { Args: Record<string, never>; Returns: string | null };
      partner_is_paid: { Args: { p_org: string }; Returns: boolean };
      partner_is_owner: { Args: { p_org: string }; Returns: boolean };
      partner_can_offer_on: { Args: { p_opp: string }; Returns: boolean };
      partner_ecosystem_summary: { Args: Record<string, never>; Returns: Json };
      partner_apply_billing: {
        Args: {
          p_org: string; p_plan: string | null; p_interval: string | null; p_status: string; p_customer: string | null;
          p_subscription: string | null; p_ended: boolean; p_event_at: string;
        };
        Returns: string;
      };
      partner_is_admin: { Args: Record<string, never>; Returns: boolean };
      partner_is_anchor_owner: { Args: { p_org: string }; Returns: boolean };
      partner_category_taken: { Args: { p_category: string }; Returns: boolean };
      partner_exclusivity_active: { Args: { p_org: string }; Returns: boolean };
      partner_exclusivity_withdraw: { Args: { p_request: string }; Returns: string };
      partner_exclusivity_attach_invoice: { Args: { p_request: string; p_customer: string; p_invoice: string; p_url: string }; Returns: string };
      partner_exclusivity_apply_invoice: { Args: { p_invoice: string; p_event: string; p_paid_at: string }; Returns: string };
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
