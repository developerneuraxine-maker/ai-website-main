import { createClient } from "@supabase/supabase-js";

type Table<Row, Insert> = { Row: Row; Insert: Insert; Update: Partial<Row>; Relationships: [] };

// Minimal hand-written schema (no generated types) covering the tables this app touches.
export type Database = {
  public: {
    Tables: {
      user_profiles: Table<
        {
          id: string;
          email: string;
          is_admin: boolean;
          created_at: string;
          plan_type: "free" | "paid";
          plan_expires_at: string | null;
          razorpay_order_id: string | null;
          daily_cost_usd: number;
          daily_reset_date: string;
          suspended_at: string | null;
          suspended_reason: string | null;
          renewal_reminder_sent_at: string | null;
          free_limit_reminder_sent_at: string | null;
        },
        {
          id: string;
          email?: string;
          is_admin?: boolean;
          plan_type?: "free" | "paid";
          plan_expires_at?: string | null;
          razorpay_order_id?: string | null;
          daily_cost_usd?: number;
          daily_reset_date?: string;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          renewal_reminder_sent_at?: string | null;
          free_limit_reminder_sent_at?: string | null;
        }
      >;
      email_logs: Table<
        {
          id: string;
          user_id: string | null;
          email: string;
          type: string;
          subject: string;
          status: string;
          error: string | null;
          sent_at: string;
        },
        {
          user_id?: string | null;
          email: string;
          type: string;
          subject: string;
          status?: string;
          error?: string | null;
        }
      >;
      announcements: Table<
        {
          id: string;
          message: string;
          type: "info" | "warning" | "success";
          created_at: string;
          expires_at: string | null;
          created_by: string | null;
        },
        {
          message: string;
          type?: "info" | "warning" | "success";
          expires_at?: string | null;
          created_by?: string | null;
        }
      >;
      connectors: Table<
        {
          id: string;
          user_id: string;
          provider: string;
          access_token: string | null;
          refresh_token: string | null;
          token_expires_at: string | null;
          metadata: Record<string, string>;
          connected_at: string;
        },
        {
          user_id: string;
          provider: string;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          metadata?: Record<string, string>;
          connected_at?: string;
        }
      >;
      projects: Table<
        {
          id: string;
          user_id: string | null;
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
          user_id: string | null;
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
          user_id: string | null;
          label: string;
          author: string;
          html_snapshot: string;
          created_at: string;
        },
        {
          project_id: string;
          label: string;
          html_snapshot: string;
          author?: string;
          user_id?: string | null;
        }
      >;
      deployments: Table<
        {
          id: string;
          project_id: string;
          user_id: string | null;
          env: "production" | "preview";
          status: "success" | "building" | "failed";
          target: string;
          commit_message: string;
          created_at: string;
        },
        { project_id: string } & Partial<{
          user_id: string | null;
          env: "production" | "preview";
          status: "success" | "building" | "failed";
          target: string;
          commit_message: string;
        }>
      >;
      api_keys: Table<
        {
          id: string;
          user_id: string | null;
          label: string;
          key_value: string;
          created_at: string;
          last_used_at: string | null;
        },
        { label: string; key_value: string; user_id?: string | null }
      >;
      workspace_members: Table<
        {
          id: string;
          user_id: string | null;
          name: string;
          email: string;
          role: "Owner" | "Editor" | "Viewer";
          avatar_gradient: string;
          created_at: string;
        },
        { name: string; email: string; user_id?: string | null } & Partial<{
          role: "Owner" | "Editor" | "Viewer";
          avatar_gradient: string;
        }>
      >;
      settings: Table<
        {
          id: number;
          user_id: string | null;
          dark_mode: boolean;
          reduce_motion: boolean;
          compact_density: boolean;
          autosave: boolean;
          show_grid: boolean;
          format_on_save: boolean;
          email_on_deploy_fail: boolean;
          weekly_digest: boolean;
        },
        { user_id?: string | null } & Partial<{
          dark_mode: boolean;
          reduce_motion: boolean;
          compact_density: boolean;
          autosave: boolean;
          show_grid: boolean;
          format_on_save: boolean;
          email_on_deploy_fail: boolean;
          weekly_digest: boolean;
        }>
      >;
      profile: Table<
        {
          id: number;
          user_id: string | null;
          full_name: string;
          email: string;
          username: string;
          role: string;
          bio: string;
          avatar_url: string | null;
        },
        { user_id?: string | null } & Partial<{
          full_name: string;
          email: string;
          username: string;
          role: string;
          bio: string;
          avatar_url: string | null;
        }>
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
        "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Copy .dev.vars.example to .env and fill in your Supabase project credentials.",
      );
    }
    client = createClient<Database>(url, key, { auth: { persistSession: false } });
  }
  return client;
}
