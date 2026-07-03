import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-server";
import { listConnectors, upsertConnector, deleteConnector } from "@/lib/db";

// ---- List all connectors for the current user ----
export const fetchConnectors = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  return listConnectors(user.id);
});

// ---- Delete a connector ----
export const disconnectConnector = createServerFn({ method: "POST" })
  .validator((d: { provider: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser();
    await deleteConnector(user.id, data.provider);
    return { ok: true };
  });

// ---- Razorpay: save key+secret after user-side verification ----
export const saveRazorpayConnector = createServerFn({ method: "POST" })
  .validator((d: { keyId: string; keySecret: string }) => {
    if (!d.keyId || !d.keySecret) throw new Error("Both Key ID and Key Secret are required.");
    return d;
  })
  .handler(async ({ data }): Promise<{ ok: true; error: null } | { ok: false; error: string }> => {
    try {
      const user = await requireUser();
      // Verify credentials by calling Razorpay's /v1/payments endpoint
      const creds = Buffer.from(`${data.keyId}:${data.keySecret}`).toString("base64");
      const res = await fetch("https://api.razorpay.com/v1/payments?count=1", {
        headers: { Authorization: `Basic ${creds}` },
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { description?: string } };
        return { ok: false, error: body?.error?.description ?? "Invalid Razorpay credentials." };
      }
      await upsertConnector(user.id, "razorpay", data.keyId, { key_secret: data.keySecret });
      return { ok: true, error: null };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Failed to connect Razorpay." };
    }
  });

// ---- Vercel: save API token after user-side verification ----
export const saveVercelConnector = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => {
    if (!d.token) throw new Error("Vercel API token is required.");
    return d;
  })
  .handler(async ({ data }): Promise<{ ok: true; teamName?: string; error: null } | { ok: false; error: string }> => {
    try {
      const user = await requireUser();
      const res = await fetch("https://api.vercel.com/v2/user", {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      if (!res.ok) {
        return { ok: false, error: "Invalid Vercel token. Check your API key." };
      }
      const body = (await res.json()) as { user?: { username?: string; email?: string } };
      const username = body?.user?.username ?? body?.user?.email ?? "Vercel";
      await upsertConnector(user.id, "vercel", data.token, { username });
      return { ok: true, teamName: username, error: null };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Failed to connect Vercel." };
    }
  });

// ---- GitHub OAuth: get authorization URL ----
export const getGitHubOAuthUrl = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error("GitHub OAuth is not configured. Set GITHUB_CLIENT_ID in .env.");
  }
  const state = Buffer.from(JSON.stringify({ userId: user.id, ts: Date.now() })).toString("base64url");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/auth/connector-callback`,
    scope: "read:user user:email repo",
    state: `github:${state}`,
  });
  return { url: `https://github.com/login/oauth/authorize?${params}` };
});

// ---- Google OAuth for connectors (Sheets/Calendar/Gmail): get authorization URL ----
export const getGoogleConnectorOAuthUrl = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Google OAuth is not configured. Set VITE_GOOGLE_CLIENT_ID in .env.");
  }
  const state = Buffer.from(JSON.stringify({ userId: user.id, ts: Date.now() })).toString("base64url");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/auth/connector-callback`,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/calendar",
      "https://mail.google.com/",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state: `google_connector:${state}`,
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
});

// ---- Exchange OAuth callback code (called from auth_.connector-callback route) ----
export const exchangeConnectorCode = createServerFn({ method: "POST" })
  .validator((d: { code: string; state: string; redirectUri: string }) => d)
  .handler(async ({ data }): Promise<{ ok: true; error: null } | { ok: false; error: string }> => {
    try {
      const user = await requireUser();
      const [provider] = data.state.split(":");

      if (provider === "github") {
        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;
        if (!clientId || !clientSecret) return { ok: false, error: "GitHub OAuth not configured." };

        const res = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code: data.code }),
        });
        const body = (await res.json()) as { access_token?: string; error_description?: string };
        if (!body.access_token) {
          return { ok: false, error: body.error_description ?? "GitHub token exchange failed." };
        }
        // Fetch user info
        const userRes = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${body.access_token}`, Accept: "application/vnd.github+json" },
        });
        const ghUser = (await userRes.json()) as { login?: string };
        await upsertConnector(user.id, "github", body.access_token, { login: ghUser.login ?? "" });
        return { ok: true, error: null };
      }

      if (provider === "google_connector") {
        const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (!clientId || !clientSecret) return { ok: false, error: "Google OAuth not configured." };

        const res = await fetch("https://oauth2.googleapis.com/token", {
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
        const body = (await res.json()) as {
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
          error_description?: string;
        };
        if (!body.access_token) {
          return { ok: false, error: body.error_description ?? "Google token exchange failed." };
        }
        const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${body.access_token}` },
        });
        const gUser = (await userRes.json()) as { email?: string };
        const expiresAt = body.expires_in
          ? new Date(Date.now() + body.expires_in * 1000).toISOString()
          : undefined;
        await upsertConnector(
          user.id,
          "google",
          body.access_token,
          { email: gUser.email ?? "" },
          body.refresh_token,
          expiresAt,
        );
        return { ok: true, error: null };
      }

      return { ok: false, error: `Unknown provider: ${provider}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "OAuth exchange failed." };
    }
  });
