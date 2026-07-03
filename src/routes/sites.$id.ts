import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getProject } from "@/lib/db";

const SITE_SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none';",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

export const Route = createFileRoute("/sites/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        // Only allow valid UUID-shaped IDs to avoid path traversal
        if (!/^[0-9a-f-]{36}$/.test(params.id)) {
          return new Response("Not found", { status: 404 });
        }
        const project = await getProject(params.id);
        if (!project) {
          return new Response("Site not found", {
            status: 404,
            headers: { "Content-Type": "text/plain", ...SITE_SECURITY_HEADERS },
          });
        }
        return new Response(project.generated_html, {
          headers: { "Content-Type": "text/html; charset=utf-8", ...SITE_SECURITY_HEADERS },
        });
      },
    },
  },
});
