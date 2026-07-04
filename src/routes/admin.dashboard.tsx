import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchAdminRevenue } from "@/server-fns/admin";
import { fetchVersions } from "@/server-fns/history";
import {
  Users,
  FolderKanban,
  Rocket,
  Globe,
  IndianRupee,
  DollarSign,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({
  loader: async () => {
    const [revenue, recentActivity] = await Promise.all([fetchAdminRevenue(), fetchVersions()]);
    return { revenue, recentActivity: recentActivity.slice(0, 10) };
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
  const { revenue, recentActivity } = Route.useLoaderData();

  const topCards = [
    {
      label: "Monthly Revenue",
      value: `₹${revenue.mrrInr.toLocaleString("en-IN")}`,
      sub: "MRR · Pro plan ₹500/mo",
      icon: IndianRupee,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Total AI Cost",
      value: `$${revenue.totalAiCostUsd.toFixed(2)}`,
      sub: "Cumulative OpenAI spend",
      icon: DollarSign,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Pro Users",
      value: revenue.proUsers,
      sub: `${revenue.freeUsers} on free plan`,
      icon: UserCheck,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/admin/users",
    },
    {
      label: "Total Users",
      value: revenue.totalUsers,
      sub: "All registered accounts",
      icon: Users,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      href: "/admin/users",
    },
  ];

  const bottomCards = [
    {
      label: "Total Projects",
      value: revenue.totalProjects,
      icon: FolderKanban,
      href: "/admin/projects",
    },
    {
      label: "Deployments",
      value: revenue.totalDeployments,
      icon: Rocket,
      href: "/admin/projects",
    },
    {
      label: "Total Visits",
      value: revenue.totalVisits.toLocaleString(),
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
        <p className="mt-1 text-sm text-muted-foreground">Revenue, AI costs, and platform stats.</p>
      </div>

      {/* Revenue cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {topCards.map((c) => {
          const inner = (
            <div
              className={`panel flex flex-col gap-3 p-5 transition ${c.href ? "hover:border-primary/40" : ""}`}
            >
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${c.bg} ${c.color}`}
              >
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <div className={`font-display text-3xl ${c.color}`}>{c.value}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {c.label}
                </div>
                {c.sub && <div className="mt-1 text-xs text-muted-foreground">{c.sub}</div>}
              </div>
            </div>
          );
          return c.href ? (
            <Link key={c.label} to={c.href}>
              {inner}
            </Link>
          ) : (
            <div key={c.label}>{inner}</div>
          );
        })}
      </div>

      {/* Stat cards */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {bottomCards.map((c) => (
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
        <h2 className="font-display text-xl">Recent activity</h2>
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
