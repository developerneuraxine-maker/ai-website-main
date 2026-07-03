import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchAdminStats } from "@/server-fns/admin";
import { fetchVersions } from "@/server-fns/history";
import { Users, FolderKanban, Rocket, Globe } from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({
  loader: async () => {
    const [stats, recentActivity] = await Promise.all([fetchAdminStats(), fetchVersions()]);
    return { stats, recentActivity: recentActivity.slice(0, 8) };
  },
  head: () => ({ meta: [{ title: "Admin Overview · Lumen" }] }),
  component: AdminDashboard,
});

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function AdminDashboard() {
  const { stats, recentActivity } = Route.useLoaderData();

  const cards = [
    { label: "Total users", value: stats.totalUsers, icon: Users, href: "/admin/users" },
    {
      label: "Total projects",
      value: stats.totalProjects,
      icon: FolderKanban,
      href: "/admin/projects",
    },
    {
      label: "Total deployments",
      value: stats.totalDeployments,
      icon: Rocket,
      href: "/admin/projects",
    },
    {
      label: "Total visits",
      value: stats.totalVisits.toLocaleString(),
      icon: Globe,
      href: "/admin/projects",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Admin
        </div>
        <h1 className="font-display text-3xl">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Across all users and workspaces.</p>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.href}
            className="panel flex items-center gap-4 p-5 transition hover:border-primary/40"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <c.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl">{c.value}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {c.label}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="mt-10">
        <h2 className="font-display text-xl">Recent activity (all users)</h2>
        <div className="panel mt-4 p-0">
          {recentActivity.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No activity yet.
            </div>
          )}
          {recentActivity.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-4 border-b border-border/60 px-5 py-3 text-sm last:border-0"
            >
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <span className="font-medium">{v.project_name}</span>
                <span className="text-muted-foreground">: {v.label}</span>
              </div>
              <div className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {timeAgo(v.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
