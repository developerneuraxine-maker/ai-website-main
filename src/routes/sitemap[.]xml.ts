import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

interface SitemapEntry {
  path: string;
  changefreq?: string;
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/dashboard", changefreq: "weekly", priority: "0.6" },
          { path: "/projects", changefreq: "weekly", priority: "0.6" },
          { path: "/templates", changefreq: "weekly", priority: "0.8" },
          { path: "/deployments", changefreq: "weekly", priority: "0.4" },
          { path: "/history", changefreq: "weekly", priority: "0.3" },
          { path: "/settings", changefreq: "monthly", priority: "0.2" },
          { path: "/profile", changefreq: "monthly", priority: "0.2" },
          { path: "/api-keys", changefreq: "monthly", priority: "0.3" },
          { path: "/workspace", changefreq: "monthly", priority: "0.3" },
          { path: "/new", changefreq: "monthly", priority: "0.6" },
        ];
        const urls = entries
          .map(
            (e) =>
              `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
