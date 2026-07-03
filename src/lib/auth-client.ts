import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cookie-based storage so the server-side auth (auth-server.ts) can read the
// session from the cookie header. Default Supabase storage uses localStorage
// which is browser-only and invisible to server functions.
const cookieStorage = {
  getItem(key: string): string | null {
    if (typeof document === "undefined") return null;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
    if (!match) return null;
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    if (typeof document === "undefined") return;
    console.log("[auth-client] setItem key:", key, "value length:", value.length);
    // Calculate max-age from the session's expires_at if available.
    // Supabase Auth JS v2.x may pass "base64-<b64-json>" — decode before parsing.
    let maxAge = 3600;
    try {
      let jsonStr = value;
      if (value.startsWith("base64-")) {
        jsonStr = atob(value.slice(7));
      }
      const parsed = JSON.parse(jsonStr) as { expires_at?: number };
      if (parsed.expires_at) {
        maxAge = Math.max(parsed.expires_at - Math.floor(Date.now() / 1000), 60);
      }
    } catch {
      // keep default 1 hour
    }
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  },
  removeItem(key: string): void {
    if (typeof document === "undefined") return;
    document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
  },
};

let _client: SupabaseClient | undefined;

export function getAuthClient(): SupabaseClient {
  if (!_client) {
    const url = import.meta.env.VITE_SUPABASE_URL as string;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    if (!url || !key) {
      throw new Error(
        "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — add them to your .env file.",
      );
    }
    // Derive the cookie name Supabase uses: sb-<project-ref>-auth-token
    // This must match the regex in auth-server.ts → extractAccessToken()
    const projectRef = new URL(url).hostname.split(".")[0];
    _client = createClient(url, key, {
      auth: {
        storage: cookieStorage,
        storageKey: `sb-${projectRef}-auth-token`,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        // Use implicit flow so server-generated magic link tokens (admin.generateLink)
        // work in verifyOtp. PKCE (the default) requires a code_verifier stored in the
        // browser at link-generation time — which is impossible when we generate tokens
        // server-side and hand them directly to verifyOtp without an email round-trip.
        flowType: "implicit",
      },
    });
  }
  return _client;
}
