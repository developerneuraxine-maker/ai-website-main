import { createServerFn } from "@tanstack/react-start";
import { getServerUser } from "@/lib/auth-server";
import { getSupabase } from "@/lib/supabase";

// Returns the logged-in user's id, email, and admin flag — or null if not signed in.
// Called from _app.tsx beforeLoad to gate the entire app section.
export const fetchCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  return getServerUser();
});

export type CurrentUser = Awaited<ReturnType<typeof getServerUser>>;

// Creates a user_profiles row for new users.
// Replaces the DB trigger (on_auth_user_created) which was crashing on NOT NULL columns.
async function ensureUserProfile(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  email: string,
) {
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return;

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
  if (error) console.error("[signup] ensureUserProfile error:", error.message);
  else console.log("[signup] user_profiles row created, isAdmin:", isAdmin);
}

// Server-side email signup using the admin API.
// Bypasses email confirmation entirely (email_confirm: true skips the confirmation email).
// Returns { tokenHash } on success or { error } on failure — never throws, so
// TanStack Start's error serialization quirks don't mangle the error message.
export const signUpWithEmail = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }): Promise<{ tokenHash: string; error: null } | { tokenHash: null; error: string }> => {
    try {
      const supabase = getSupabase();

      // Create the user — admin API marks email as confirmed, skipping confirmation emails
      console.log("[signup] createUser for", data.email.split("@")[0] + "@...");
      const { error: createErr } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });

      if (createErr) {
        const msg = createErr.message ?? "";
        const status = (createErr as { status?: number }).status ?? 0;
        console.log("[signup] createUser failed, status:", status, "msg:", msg);
        // Only continue if it's "already registered" — any other error (e.g. 500 trigger crash) is fatal
        const isExisting = /already|duplicate|exists|registered/i.test(msg);
        if (!isExisting && status !== 500) {
          return { tokenHash: null, error: msg || "Failed to create account" };
        }
        // status 500 here usually means the old DB trigger crashed — we proceed
        // and the zombie / generateLink path below handles it
      }

      // Generate a one-time sign-in token for this email
      console.log("[signup] generateLink");
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: data.email,
      });

      if (linkErr || !linkData) {
        // generateLink fails when the email belongs to a soft-deleted / zombie user.
        // Scan listUsers (returns ALL rows including soft-deleted) to find and delete it.
        console.log("[signup] generateLink failed — scanning listUsers for zombie...");
        const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const zombie = allUsers?.users?.find((u) => u.email === data.email);

        if (zombie) {
          console.log("[signup] zombie found, id:", zombie.id.slice(0, 8) + "..., deleting...");
          await supabase.auth.admin.deleteUser(zombie.id).catch(() => { });
          await supabase.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true });
          const { data: freshLink, error: freshErr } = await supabase.auth.admin.generateLink({ type: "magiclink", email: data.email });
          if (freshErr || !freshLink) {
            return { tokenHash: null, error: freshErr?.message ?? "Failed to regenerate sign-in token" };
          }
          console.log("[signup] fresh link for userId:", freshLink.user.id.slice(0, 8) + "...");
          await ensureUserProfile(supabase, freshLink.user.id, data.email);
          return { tokenHash: freshLink.properties.hashed_token, error: null };
        }

        return { tokenHash: null, error: linkErr?.message || "Failed to generate sign-in token" };
      }

      // Verify the generated user is retrievable (getUserById-zombie check)
      const generatedUserId = linkData.user.id;
      console.log("[signup] link generated for userId:", generatedUserId.slice(0, 8) + "...");

      // Always set the password — whether createUser succeeded (already has one)
      // or failed (generateLink created the user without a password).
      // This also acts as a password-reset when signing up with an existing email.
      console.log("[signup] setting password via updateUserById");
      const { error: pwErr } = await supabase.auth.admin.updateUserById(generatedUserId, {
        password: data.password,
      });
      if (pwErr) console.error("[signup] updateUserById error:", pwErr.message);
      else console.log("[signup] password set OK");

      const { error: userCheckErr } = await supabase.auth.admin.getUserById(generatedUserId);
      if (userCheckErr) {
        console.log("[signup] getUserById-zombie, healing...");
        await supabase.auth.admin.deleteUser(generatedUserId).catch(() => { });
        const { error: recreateErr } = await supabase.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true,
        });
        if (recreateErr) return { tokenHash: null, error: recreateErr.message || "Failed to recreate account" };
        const { data: freshLink, error: freshErr } = await supabase.auth.admin.generateLink({ type: "magiclink", email: data.email });
        if (freshErr || !freshLink) return { tokenHash: null, error: freshErr?.message ?? "Failed to regenerate sign-in token" };
        console.log("[signup] fresh link for userId:", freshLink.user.id.slice(0, 8) + "...");
        await ensureUserProfile(supabase, freshLink.user.id, data.email);
        return { tokenHash: freshLink.properties.hashed_token, error: null };
      }

      // Ensure user_profiles row exists (replaces the dropped DB trigger)
      await ensureUserProfile(supabase, generatedUserId, data.email);

      return { tokenHash: linkData.properties.hashed_token, error: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { tokenHash: null, error: msg || "Unexpected server error" };
    }
  });
