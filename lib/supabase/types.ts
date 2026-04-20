export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          owner_user_id: string;
          logo_url: string | null;
          settings: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          owner_user_id: string;
          logo_url?: string | null;
          settings?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspaces"]["Insert"]>;
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: "owner" | "admin" | "editor" | "viewer";
          display_name: string | null;
          avatar_url: string | null;
          joined_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["workspace_members"]["Row"],
          "id" | "joined_at"
        > & { id?: string; joined_at?: string };
        Update: Partial<Database["public"]["Tables"]["workspace_members"]["Insert"]>;
      };
      invites: {
        Row: {
          id: string;
          workspace_id: string;
          invited_by_user_id: string;
          email: string;
          role: "admin" | "editor" | "viewer";
          token: string;
          status: "pending" | "accepted" | "revoked" | "expired";
          expires_at: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["invites"]["Row"],
          "id" | "created_at" | "expires_at"
        > & { id?: string; created_at?: string; expires_at?: string };
        Update: Partial<Database["public"]["Tables"]["invites"]["Insert"]>;
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          created_by_user_id: string | null;
          name: string;
          client: string | null;
          product: string | null;
          brief: Json | null;
          aspect: string;
          status: string;
          cover_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["projects"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
      };
      boards: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          is_default: boolean;
          order_index: number;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["boards"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["boards"]["Insert"]>;
      };
      node_groups: {
        Row: {
          id: string;
          board_id: string;
          name: string;
          color: string | null;
          order_index: number;
          seed_concept_id: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["node_groups"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["node_groups"]["Insert"]>;
      };
      nodes: {
        Row: {
          id: string;
          board_id: string;
          group_id: string | null;
          type: "source" | "shot" | "continuation" | "note" | "concept_card" | "budget_tracker";
          x: number;
          y: number;
          w: number;
          h: number;
          order_index: number;
          image_url: string | null;
          thumbnail_url: string | null;
          prompt: string | null;
          prompt_enhanced: string | null;
          title: string | null;
          status: "pending" | "generating" | "ready" | "error";
          quality_score: number | null;
          metadata: Json | null;
          animation_prompt: string | null;
          animation_model_hint: string | null;
          used_ref_ids: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["nodes"]["Row"],
          "id" | "created_at" | "updated_at" | "animation_prompt" | "animation_model_hint" | "used_ref_ids"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          animation_prompt?: string | null;
          animation_model_hint?: string | null;
          used_ref_ids?: string[] | null;
        };
        Update: Partial<Database["public"]["Tables"]["nodes"]["Insert"]>;
      };
      edges: {
        Row: {
          id: string;
          board_id: string;
          source_node_id: string;
          target_node_id: string;
          style: "solid" | "dashed" | "arrow";
          label: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["edges"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["edges"]["Insert"]>;
      };
      concepts: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          tagline: string | null;
          avatar: Json | null;
          core_insight: string | null;
          hook_archetype: string | null;
          visual_spine: string | null;
          palette: string[] | null;
          mood_keywords: string[] | null;
          length_seconds: number | null;
          shot_count: number | null;
          creativity_level: string | null;
          moodboard_urls: string[] | null;
          shot_list: Json | null;
          applied_board_id: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["concepts"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["concepts"]["Insert"]>;
      };
      refs_library: {
        Row: {
          id: string;
          workspace_id: string;
          added_by_user_id: string | null;
          name: string | null;
          image_url: string;
          tags: string[] | null;
          dna: Json | null;
          times_used: number;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["refs_library"]["Row"],
          "id" | "created_at" | "times_used"
        > & { id?: string; created_at?: string; times_used?: number };
        Update: Partial<Database["public"]["Tables"]["refs_library"]["Insert"]>;
      };
      prompts_library: {
        Row: {
          id: string;
          workspace_id: string;
          added_by_user_id: string | null;
          name: string;
          prompt: string;
          tags: string[] | null;
          times_used: number;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["prompts_library"]["Row"],
          "id" | "created_at" | "times_used"
        > & { id?: string; created_at?: string; times_used?: number };
        Update: Partial<Database["public"]["Tables"]["prompts_library"]["Insert"]>;
      };
      generations_log: {
        Row: {
          id: string;
          workspace_id: string;
          project_id: string | null;
          node_id: string | null;
          user_id_ref: string | null;
          action: string;
          model: string;
          input_tokens: number | null;
          output_tokens: number | null;
          images_generated: number | null;
          cost_usd: number | null;
          duration_ms: number | null;
          status: "ok" | "error" | "timeout" | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["generations_log"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["generations_log"]["Insert"]>;
      };
      presence: {
        Row: {
          id: string;
          workspace_id: string;
          board_id: string | null;
          user_id: string;
          cursor_x: number | null;
          cursor_y: number | null;
          color: string | null;
          last_seen_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["presence"]["Row"],
          "id" | "last_seen_at"
        > & { id?: string; last_seen_at?: string };
        Update: Partial<Database["public"]["Tables"]["presence"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience exports
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type WorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"];
export type Invite = Database["public"]["Tables"]["invites"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Board = Database["public"]["Tables"]["boards"]["Row"];
export type NodeGroup = Database["public"]["Tables"]["node_groups"]["Row"];
export type NodeRow = Database["public"]["Tables"]["nodes"]["Row"];
export type NodeInput = Database["public"]["Tables"]["nodes"]["Insert"];
export type EdgeRow = Database["public"]["Tables"]["edges"]["Row"];
export type EdgeInput = Database["public"]["Tables"]["edges"]["Insert"];
export type ConceptRow = Database["public"]["Tables"]["concepts"]["Row"];
export type RefLibrary = Database["public"]["Tables"]["refs_library"]["Row"];
export type PromptLibrary = Database["public"]["Tables"]["prompts_library"]["Row"];
export type GenerationLog = Database["public"]["Tables"]["generations_log"]["Row"];
export type Presence = Database["public"]["Tables"]["presence"]["Row"];

export type NodeType = NodeRow["type"];
export type NodeStatus = NodeRow["status"];
export type EdgeStyle = EdgeRow["style"];
export type Role = WorkspaceMember["role"];
