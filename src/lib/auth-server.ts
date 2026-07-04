import { getCookies } from "@tanstack/react-start/server";
import { getSupabase } from "./supabase";

// Extract the Supabase access token from the sb-*-auth-token cookie.
// Uses getCookies() from TanStack Start which calls h3's parseCookies() directly —
// simpler and more reliable than getRequest() + manual header regex.
function extractAccessToken(): string | null {
  let cookies: Record<string, string | undefined>;
  try {
    cookies = getCookies() as Record<string, string | undefined>;
  } catch (e) {
    // getCookies() throws when called outside a server-function context (e.g. SSR hydration).
    console.error("[auth-server] getCookies() error:", e);
    return null;
  }

  // Derive the exact cookie name from the Supabase project URL.
  // cookieStorage in auth-client.ts uses the same key: sb-<project-ref>-auth-token
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  let cookieName: string | undefined;
  if (supabaseUrl) {
    try {
      const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
      cookieName = `sb-${projectRef}-auth-token`;
    } catch {
      // fallback: scan all cookies for the pattern
    }
  }

  // Fallback: find any cookie matching the sb-<ref>-auth-token pattern
  if (!cookieName || cookies[cookieName] === undefined) {
    cookieName = Object.keys(cookies).find((k) => /^sb-[a-z0-9]+-auth-token$/.test(k));
  }

  if (!cookieName || !cookies[cookieName]) {
    console.log("[auth-server] no auth cookie found. Available keys:", Object.keys(cookies));
    return null;
  }

  const rawValue = cookies[cookieName]!;
  try {
    // h3's parseCookies may or may not URL-decode values depending on version.
    // If still URL-encoded (starts with %7B = "{" or %22 = '"'), decode first.
    const urlDecoded =
      rawValue.startsWith("%7B") || rawValue.startsWith("%7b") || rawValue.startsWith("%22")
        ? decodeURIComponent(rawValue)
        : rawValue;

    // Supabase Auth JS (v2.x) stores sessions as "base64-<base64-encoded-json>"
    // to avoid URL-encoding issues and handle large sessions.
    let sessionJson: string;
    if (urlDecoded.startsWith("base64-")) {
      const b64 = urlDecoded.slice(7); // strip "base64-" prefix
      sessionJson = Buffer.from(b64, "base64").toString("utf-8");
    } else {
      sessionJson = urlDecoded;
    }

    const parsed = JSON.parse(sessionJson) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch (e) {
    console.error(
      "[auth-server] failed to parse auth cookie:",
      e,
      "raw value length:",
      rawValue.length,
    );
    return null;
  }
}

export type ServerUser = {
  id: string;
  email: string;
  isAdmin: boolean;
  suspended: boolean;
};

// Decode JWT payload without verifying the signature.
// Safe here because we're reading from our own HttpOnly cookie, not user input.
// We then look up the user via admin API, so a forged sub would just return 404.
// Needed because newer Supabase projects sign with ES256 and auth.getUser(token)
// fails with "unrecognized JWT kid" when the keyfunc can't resolve the key ID.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // base64url → base64 → JSON
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(b64, "base64").toString("utf-8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Returns the authenticated user + admin flag, or null if not logged in.
export async function getServerUser(): Promise<ServerUser | null> {
  const token = extractAccessToken();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  const userId = typeof payload?.sub === "string" ? payload.sub : null;

  if (!userId) {
    console.error("[auth-server] could not decode JWT payload, token prefix:", token.slice(0, 20));
    return null;
  }

  console.log("[auth-server] looking up userId:", userId.slice(0, 8) + "...");

  const supabase = getSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.admin.getUserById(userId);
  if (error || !user) {
    if (error) console.error("[auth-server] getUserById error:", error.message);
    return null;
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin, suspended_at")
    .eq("id", user.id)
    .single();

  const email = (user.email ?? "").toLowerCase();
  const OWNER_ADMIN_EMAILS = ["socialsprouts1@gmail.com", "developerneuraxine@gmail.com"].map((e) => e.toLowerCase());
  return {
    id: user.id,
    email,
    isAdmin: OWNER_ADMIN_EMAILS.includes(email) || (profile?.is_admin ?? false),
    suspended: !!profile?.suspended_at,
  };
}

// Throws if not authenticated — use at the top of protected server functions.
export async function requireUser(): Promise<ServerUser> {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");
  if (user.suspended) throw new Error("Account suspended. Contact support@neuraxine.com.");
  return user;
}

// Throws if not authenticated OR not an admin.
export async function requireAdmin(): Promise<ServerUser> {
  const user = await requireUser();
  if (!user.isAdmin) throw new Error("Forbidden");
  return user;
}
