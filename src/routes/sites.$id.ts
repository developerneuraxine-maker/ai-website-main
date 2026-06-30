import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getProject } from "@/lib/db";

export const Route = createFileRoute("/sites/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const project = await getProject(params.id);
        if (!project) {
          return new Response("Site not found", {
            status: 404,
            headers: { "Content-Type": "text/plain" },
          });
        }
        return new Response(project.generated_html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
