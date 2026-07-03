import { getSupabase } from "./supabase";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonErr(msg: string, status = 400): Response {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function jsonOk(data: object): Response {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function getConnector(userId: string, provider: string) {
  const { data } = await getSupabase()
    .from("connectors")
    .select()
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();
  return data;
}

async function getGoogleToken(userId: string): Promise<string | null> {
  const connector = await getConnector(userId, "google");
  if (!connector?.access_token) return null;

  // Refresh if expired (60s buffer)
  if (connector.token_expires_at) {
    const expiresMs = new Date(connector.token_expires_at).getTime();
    if (Date.now() + 60_000 > expiresMs) {
      if (!connector.refresh_token) return null;
      const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: connector.refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
        }),
      });
      const body = (await res.json()) as { access_token?: string; expires_in?: number };
      if (!body.access_token) return null;

      const expiresAt = body.expires_in
        ? new Date(Date.now() + body.expires_in * 1000).toISOString()
        : null;
      await getSupabase()
        .from("connectors")
        .update({ access_token: body.access_token, token_expires_at: expiresAt })
        .eq("user_id", userId)
        .eq("provider", "google");

      return body.access_token;
    }
  }

  return connector.access_token;
}

export async function handleGmail(userId: string, body: unknown): Promise<Response> {
  const b = body as { to?: string; subject?: string; body?: string };
  if (!b.to || !b.subject || !b.body) return jsonErr("Missing fields: to, subject, body");

  const token = await getGoogleToken(userId);
  if (!token) return jsonErr("Gmail not connected or token expired.", 401);

  // RFC 2822 message
  const raw = Buffer.from(
    [`To: ${b.to}`, `Subject: ${b.subject}`, `MIME-Version: 1.0`, `Content-Type: text/plain; charset=utf-8`, ``, b.body].join("\r\n"),
  ).toString("base64url");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    return jsonErr(err?.error?.message ?? `Gmail API error ${res.status}`, 502);
  }

  const data = (await res.json()) as { id?: string };
  return jsonOk({ messageId: data.id });
}

export async function handleSheets(userId: string, body: unknown): Promise<Response> {
  const b = body as { spreadsheetId?: string; values?: unknown };
  if (!b.spreadsheetId || !Array.isArray(b.values))
    return jsonErr("Missing fields: spreadsheetId, values (array)");

  const token = await getGoogleToken(userId);
  if (!token) return jsonErr("Google Sheets not connected or token expired.", 401);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${b.spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [b.values] }),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    return jsonErr(err?.error?.message ?? `Sheets API error ${res.status}`, 502);
  }

  const data = (await res.json()) as { updates?: unknown };
  return jsonOk({ updates: data.updates });
}

export async function handleCalendar(userId: string, body: unknown): Promise<Response> {
  const b = body as { title?: string; start?: string; end?: string; description?: string };
  if (!b.title || !b.start || !b.end) return jsonErr("Missing fields: title, start, end");

  const token = await getGoogleToken(userId);
  if (!token) return jsonErr("Google Calendar not connected or token expired.", 401);

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: b.title,
      description: b.description ?? "",
      start: { dateTime: new Date(b.start).toISOString(), timeZone: "Asia/Kolkata" },
      end: { dateTime: new Date(b.end).toISOString(), timeZone: "Asia/Kolkata" },
    }),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    return jsonErr(err?.error?.message ?? `Calendar API error ${res.status}`, 502);
  }

  const data = (await res.json()) as { id?: string; htmlLink?: string };
  return jsonOk({ eventId: data.id, htmlLink: data.htmlLink });
}

export async function handleRazorpay(userId: string, body: unknown): Promise<Response> {
  const b = body as { amount?: number; currency?: string; receipt?: string };
  if (typeof b.amount !== "number" || b.amount <= 0)
    return jsonErr("Missing or invalid field: amount (positive number in paise, e.g. 49900 = ₹499)");

  const connector = await getConnector(userId, "razorpay");
  if (!connector?.access_token || !connector.metadata?.key_secret)
    return jsonErr("Razorpay not connected.", 401);

  const creds = Buffer.from(`${connector.access_token}:${connector.metadata.key_secret}`).toString("base64");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: b.amount,
      currency: b.currency ?? "INR",
      receipt: b.receipt ?? `rcpt_${Date.now()}`,
    }),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error?: { description?: string } };
    return jsonErr(err?.error?.description ?? `Razorpay API error ${res.status}`, 502);
  }

  const data = (await res.json()) as { id?: string; amount?: number; currency?: string };
  return jsonOk({ orderId: data.id, amount: data.amount, currency: data.currency, key: connector.access_token });
}

// Route dispatcher: /api/integrate/{userId}/{action}
export async function handleIntegrationRequest(pathname: string, request: Request): Promise<Response> {
  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  // Parse /api/integrate/{userId}/{action}
  const match = pathname.match(/^\/api\/integrate\/([^/]+)\/([^/]+)$/);
  if (!match) return jsonErr("Invalid integration URL", 404);
  const [, userId, action] = match;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErr("Request body must be valid JSON");
  }

  switch (action) {
    case "gmail":
      return handleGmail(userId, body);
    case "sheets":
      return handleSheets(userId, body);
    case "calendar":
      return handleCalendar(userId, body);
    case "razorpay-order":
      return handleRazorpay(userId, body);
    default:
      return jsonErr(`Unknown action: ${action}. Valid actions: gmail, sheets, calendar, razorpay-order`, 404);
  }
}
