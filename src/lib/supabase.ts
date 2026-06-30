import { createClient } from "@supabase/supabase-js";

type Table<Row, Insert> = { Row: Row; Insert: Insert; Update: Partial<Row>; Relationships: [] };

// Minimal hand-written schema (no generated types yet) covering the tables this app touches.
export type Database = {
  public: {
    Tables: {
      projects: Table<
        {
          id: string;
          name: string;
          prompt: string;
          category: string;
          status: "live" | "draft" | "building" | "error";
          url: string | null;
          thumbnail: string;
          generated_html: string;
          visits: number;
          score: number | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          name: string;
          prompt: string;
          category: string;
          thumbnail: string;
          generated_html: string;
        } & Partial<{
          status: "live" | "draft" | "building" | "error";
          url: string | null;
          visits: number;
          score: number | null;
        }>
      >;
      project_messages: Table<
        { id: string; project_id: string; who: "you" | "ai"; text: string; created_at: string },
        { project_id: string; who: "you" | "ai"; text: string }
      >;
      project_versions: Table<
        {
          id: string;
          project_id: string;
          label: string;
          author: string;
          html_snapshot: string;
          created_at: string;
        },
        { project_id: string; label: string; html_snapshot: string; author?: string }
      >;
      deployments: Table<
        {
          id: string;
          project_id: string;
          env: "production" | "preview";
          status: "success" | "building" | "failed";
          target: string;
          commit_message: string;
          created_at: string;
        },
        { project_id: string } & Partial<{
          env: "production" | "preview";
          status: "success" | "building" | "failed";
          target: string;
          commit_message: string;
        }>
      >;
      api_keys: Table<
        {
          id: string;
          label: string;
          key_value: string;
          created_at: string;
          last_used_at: string | null;
        },
        { label: string; key_value: string }
      >;
      workspace_members: Table<
        {
          id: string;
          name: string;
          email: string;
          role: "Owner" | "Editor" | "Viewer";
          avatar_gradient: string;
          created_at: string;
        },
        { name: string; email: string } & Partial<{
          role: "Owner" | "Editor" | "Viewer";
          avatar_gradient: string;
        }>
      >;
      settings: Table<
        {
          id: number;
          dark_mode: boolean;
          reduce_motion: boolean;
          compact_density: boolean;
          autosave: boolean;
          show_grid: boolean;
          format_on_save: boolean;
          email_on_deploy_fail: boolean;
          weekly_digest: boolean;
        },
        Record<string, never>
      >;
      profile: Table<
        {
          id: number;
          full_name: string;
          email: string;
          username: string;
          role: string;
          bio: string;
          avatar_url: string | null;
        },
        Record<string, never>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Server-only: uses the service-role key, never import this from client code.
let client: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill in your Supabase project credentials.",
      );
    }
    client = createClient<Database>(url, key, { auth: { persistSession: false } });
  }
  return client;
}
