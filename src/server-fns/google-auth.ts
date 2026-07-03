import { createServerFn } from "@tanstack/react-start";
import { getSupabase } from "@/lib/supabase";

type GoogleCodeResult =
  | { tokenHash: string; error: null }
  | { tokenHash: null; error: string };

// Creates a user_profiles row for new users.
// Replaces the DB trigger (on_auth_user_created) which was crashing due to
// NOT NULL columns without defaults — handling it in code is more reliable.
async function ensureUserProfile(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  email: string,
  metadata: { full_name?: string; avatar_url?: string },
) {
  // Skip if profile already exists (returning user)
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return;

  // First user ever becomes admin
  const { count } = await supabase
    .from("user_profiles")
    .select("*", { count: "exact", head: true });
  const isAdmin = email === "socialsprouts1@gmail.com" || (count ?? 0) === 0;

  const { error } = await supabase.from("user_profiles").insert({
    id: userId,
    email,
    is_admin: isAdmin,
    plan_type: "free",
    daily_cost_usd: 0,
    daily_reset_date: new Date().toISOString().split("T")[0],
  });
  if (error) console.error("[google-auth] ensureUserProfile error:", error.message);
  else console.log("[google-auth] user_profiles row created, isAdmin:", isAdmin);
}

// Exchanges a Google OAuth authorization code for a Supabase session token.
// Runs server-side so GOOGLE_CLIENT_SECRET is never exposed to the browser.
// Returns discriminated union — never throws — so TanStack Start's error
// serialization quirks don't mangle the error message to {} or 0.
export const exchangeGoogleCode = createServerFn({ method: "POST" })
  .validator((d: { code: string; redirectUri: string }) => d)
  .handler(async ({ data }): Promise<GoogleCodeResult> => {
    try {
      if (!data.code) return { tokenHash: null, error: "Missing OAuth code" };

      const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      console.log("[google-auth] clientId present:", !!clientId, "clientSecret present:", !!clientSecret);
      if (!clientId || !clientSecret) {
        return {
          tokenHash: null,
          error: `Google OAuth is not configured (clientId:${!!clientId} secret:${!!clientSecret}). Restart the dev server after editing .env.`,
        };
      }

      // Step 1: Exchange authorization code for Google access token
      console.log("[google-auth] step1: exchanging code, redirectUri:", data.redirectUri);
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: data.code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: data.redirectUri,
          grant_type: "authorization_code",
        }),
      });
      console.log("[google-auth] step1: tokenRes status:", tokenRes.status);

      if (!tokenRes.ok) {
        const errBody = (await tokenRes.json()) as { error_description?: string; error?: string };
        console.error("[google-auth] step1 failed:", errBody);
        return {
          tokenHash: null,
          error: errBody.error_description ?? errBody.error ?? `Google token exchange failed (${tokenRes.status})`,
        };
      }

      const { access_token: googleAccessToken } = (await tokenRes.json()) as {
        access_token: string;
      };
      console.log("[google-auth] step1: got access_token");

      // Step 2: Get the user's email and name from Google
      console.log("[google-auth] step2: fetching userinfo");
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });
      console.log("[google-auth] step2: userRes status:", userRes.status);
      if (!userRes.ok) return { tokenHash: null, error: "Failed to fetch Google user info" };

      const { email, name, picture } = (await userRes.json()) as {
        email: string;
        name: string;
        picture: string;
      };
      console.log("[google-auth] step2: email:", email ? email.split("@")[0] + "@..." : "MISSING");
      if (!email) return { tokenHash: null, error: "Google did not return an email address" };

      const supabase = getSupabase();
      const metadata = { full_name: name, avatar_url: picture };

      // Step 3: Create user in Supabase (may fail if already exists — handled below)
      console.log("[google-auth] step3: createUser");
      const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (createErr) {
        console.log("[google-auth] step3: createUser failed (status:", (createErr as { status?: number }).status ?? "?", ")");
      } else {
        console.log("[google-auth] step3: user created, id:", createData?.user?.id?.slice(0, 8) + "...");
      }

      // Step 4: Generate a one-time sign-in token
      console.log("[google-auth] step4: generateLink");
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

      if (linkErr || !linkData) {
        // generateLink can fail when the email belongs to a soft-deleted / zombie user.
        // Scan listUsers (returns ALL rows including soft-deleted) to find and delete it.
        console.log("[google-auth] step4 failed — scanning listUsers for zombie...");
        const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const zombie = allUsers?.users?.find((u) => u.email === email);

        if (zombie) {
          console.log("[google-auth] zombie found, id:", zombie.id.slice(0, 8) + "..., deleting...");
          await supabase.auth.admin.deleteUser(zombie.id);
          console.log("[google-auth] zombie deleted, recreating user...");
          await supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: metadata });
          const { data: freshLink, error: freshErr } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
          if (freshErr || !freshLink) {
            console.error("[google-auth] freshLink failed after zombie cleanup:", freshErr?.message);
            return { tokenHash: null, error: freshErr?.message ?? "Failed to regenerate sign-in token" };
          }
          console.log("[google-auth] fresh link for userId:", freshLink.user.id.slice(0, 8) + "...");
          await ensureUserProfile(supabase, freshLink.user.id, email, metadata);
          return { tokenHash: freshLink.properties.hashed_token, error: null };
        }

        console.error("[google-auth] no zombie found, generateLink error:", linkErr?.message);
        return { tokenHash: null, error: linkErr?.message ?? "Failed to generate sign-in token" };
      }

      // Step 5: Verify the generated user is retrievable (getUserById-zombie check)
      const generatedUserId = linkData.user.id;
      console.log("[google-auth] link generated for userId:", generatedUserId.slice(0, 8) + "...");
      const { error: userCheckErr } = await supabase.auth.admin.getUserById(generatedUserId);
      if (userCheckErr) {
        console.log("[google-auth] getUserById-zombie detected, healing...");
        await supabase.auth.admin.deleteUser(generatedUserId).catch(() => {});
        await supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: metadata });
        const { data: freshLink, error: freshErr } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
        if (freshErr || !freshLink) {
          return { tokenHash: null, error: freshErr?.message ?? "Failed to regenerate sign-in token" };
        }
        console.log("[google-auth] fresh link for userId:", freshLink.user.id.slice(0, 8) + "...");
        await ensureUserProfile(supabase, freshLink.user.id, email, metadata);
        return { tokenHash: freshLink.properties.hashed_token, error: null };
      }

      // Step 6: Ensure user_profiles row exists (replaces the dropped DB trigger)
      await ensureUserProfile(supabase, generatedUserId, email, metadata);

      return { tokenHash: linkData.properties.hashed_token, error: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { tokenHash: null, error: msg || "Unexpected server error during Google sign-in" };
    }
  });
