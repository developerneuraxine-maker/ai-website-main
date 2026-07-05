import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleIntegrationRequest, CORS_HEADERS as INTEGRATION_CORS } from "./lib/integrate";
import {
  getUsersNeedingRenewalReminder,
  getUsersNeedingFreeUpgradeEmail,
  markRenewalReminderSent,
  markFreeReminderSent,
  logEmail,
} from "./lib/db";
import { sendReminderEmail } from "./lib/email";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Applied to every response from the Lumen app (not to /sites/$id which sets its own).
const APP_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

function applySecurityHeaders(response: Response): Response {
  const url = new URL(response.url || "http://localhost/");
  // /sites/* sets its own headers — don't double-set
  if (url.pathname.startsWith("/sites/")) return response;
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(APP_SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(response.body, { status: response.status, headers });
}

async function handleCronRenewalReminder(request: Request): Promise<Response> {
  // Verify Vercel Cron secret so random people can't trigger this
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const results = { proReminders: 0, freeReminders: 0, errors: 0 };

  try {
    // Pro users expiring in 2 days
    const proUsers = await getUsersNeedingRenewalReminder();
    for (const user of proUsers) {
      const { ok, subject, error } = await sendReminderEmail(user.email, "pro_expiring");
      await logEmail(user.id, user.email, "pro_expiring", subject, ok ? "sent" : "failed", error);
      if (ok) {
        await markRenewalReminderSent(user.id);
        results.proReminders++;
      } else {
        results.errors++;
      }
    }

    // Free users who hit their limit
    const freeUsers = await getUsersNeedingFreeUpgradeEmail();
    for (const user of freeUsers) {
      const { ok, subject, error } = await sendReminderEmail(user.email, "free_limit_reached");
      await logEmail(user.id, user.email, "free_limit_reached", subject, ok ? "sent" : "failed", error);
      if (ok) {
        await markFreeReminderSent(user.id);
        results.freeReminders++;
      } else {
        results.errors++;
      }
    }
  } catch (err) {
    console.error("[cron] renewal-reminder error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err), results }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("[cron] renewal-reminder done:", results);
  return new Response(JSON.stringify({ ok: true, ...results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // Cron — daily renewal reminder emails
    if (url.pathname === "/api/cron/renewal-reminder") {
      return handleCronRenewalReminder(request);
    }

    // Integration API — public CORS endpoints for generated websites
    if (url.pathname.startsWith("/api/integrate/")) {
      try {
        return await handleIntegrationRequest(url.pathname, request);
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...INTEGRATION_CORS },
        });
      }
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return applySecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8", ...APP_SECURITY_HEADERS },
      });
    }
  },
};
