import { createFileRoute } from "@tanstack/react-router";
import { fetchAdminProjects } from "@/server-fns/admin";

export const Route = createFileRoute("/admin/projects")({
  loader: async () => fetchAdminProjects(),
  head: () => ({ meta: [{ title: "All Projects · Admin · Lumen" }] }),
  component: AdminProjects,
});

function AdminProjects() {
  const projects = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Admin
        </div>
        <h1 className="font-display text-3xl">All Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {projects.length} projects across all users
        </p>
      </div>

      <div className="panel mt-8 overflow-hidden p-0">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 border-b border-border bg-surface/60 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div>Project</div>
          <div>User</div>
          <div>Category</div>
          <div>Status</div>
        </div>
        {projects.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-[1.5fr_1fr_1fr_1fr] items-center gap-4 border-b border-border/60 px-5 py-4 text-sm last:border-0 hover:bg-surface/40"
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
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {p.status}
              </span>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No projects yet.
          </div>
        )}
      </div>
    </div>
  );
}
