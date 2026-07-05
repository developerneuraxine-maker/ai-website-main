import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fetchAdminProjects, deleteProject } from "@/server-fns/admin";
import { Trash2, ExternalLink, Search } from "lucide-react";
import type { AdminProject } from "@/lib/db";

export const Route = createFileRoute("/admin/projects")({
  loader: async () => fetchAdminProjects(),
  head: () => ({ meta: [{ title: "All Projects · Admin · Lumen" }] }),
  component: AdminProjects,
});

function AdminProjects() {
  const initial = Route.useLoaderData();
  const [projects, setProjects] = useState<AdminProject[]>(initial);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = projects.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.user_email.toLowerCase().includes(search.toLowerCase()) ||
      p.prompt.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (p: AdminProject) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setDeleting(p.id);
    try {
      await deleteProject({ data: { projectId: p.id } });
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Admin</div>
        <h1 className="font-display text-3xl">All Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">{projects.length} projects across all users</p>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, user, or prompt…"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="panel mt-4 overflow-hidden p-0">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-4 border-b border-border bg-surface/60 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div>Project</div>
          <div>User</div>
          <div>Category</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {filtered.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-border/60 px-5 py-4 text-sm last:border-0 hover:bg-surface/40"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{p.name}</div>
              <div className="truncate font-mono text-xs text-muted-foreground">{p.prompt}</div>
            </div>
            <div className="truncate text-muted-foreground">{p.user_email}</div>
            <div className="text-muted-foreground">{p.category}</div>
            <div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  p.status === "live"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : p.status === "error"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {p.status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Preview site"
                  className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                onClick={() => void handleDelete(p)}
                disabled={deleting === p.id}
                title="Delete project"
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            {search ? "No projects match your search." : "No projects yet."}
          </div>
        )}
      </div>
    </div>
  );
}
