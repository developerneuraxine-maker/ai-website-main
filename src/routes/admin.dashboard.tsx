import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchAdminRevenue, fetchTopSpenders } from "@/server-fns/admin";
import { fetchVersions } from "@/server-fns/history";
import {
  Users,
  FolderKanban,
  Rocket,
  Globe,
  IndianRupee,
  DollarSign,
  UserCheck,
  TrendingUp,
  Flame,
} from "lucide-react";
import type { TopSpender } from "@/lib/db";

export const Route = createFileRoute("/admin/dashboard")({
  loader: async () => {
    const [revenue, recentActivity, topSpenders] = await Promise.all([
      fetchAdminRevenue(),
      fetchVersions(),
      fetchTopSpenders(),
    ]);
    return { revenue, recentActivity: recentActivity.slice(0, 10), topSpenders };
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

function CostBar({ cost, max }: { cost: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (cost / max) * 100) : 0;
  const color =
    pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-orange-500" : pct >= 30 ? "bg-amber-400" : "bg-primary";
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function AdminDashboard() {
  const { revenue, recentActivity, topSpenders } = Route.useLoaderData();

  const maxCost = Math.max(...topSpenders.map((s) => s.daily_cost_usd), 0.001);

  // Estimate profit: MRR (in USD at ~83 INR/USD) minus total AI cost
  const mrrUsd = revenue.mrrInr / 83;
  const profitUsd = mrrUsd - revenue.totalAiCostUsd;

  const topCards = [
    {
      label: "Monthly Revenue",
      value: `₹${revenue.mrrInr.toLocaleString("en-IN")}`,
      sub: `${revenue.proUsers} Pro users · ₹500/mo each`,
      icon: IndianRupee,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Total AI Cost",
      value: `$${revenue.totalAiCostUsd.toFixed(2)}`,
      sub: "Cumulative OpenAI spend across all users",
      icon: DollarSign,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Est. Profit",
      value: `$${profitUsd.toFixed(2)}`,
      sub: profitUsd >= 0 ? "Revenue minus AI cost" : "Currently at a loss",
      icon: TrendingUp,
      color: profitUsd >= 0 ? "text-emerald-500" : "text-red-400",
      bg: profitUsd >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: "Pro / Free",
      value: `${revenue.proUsers} / ${revenue.freeUsers}`,
      sub: `${revenue.totalUsers} total accounts`,
      icon: UserCheck,
      color: "text-primary",
      bg: "bg-primary/10",
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
    {
      label: "Total Users",
      value: revenue.totalUsers,
      icon: Users,
      href: "/admin/users",
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

      {/* Top metric cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {topCards.map((c) => {
          const inner = (
            <div className={`panel flex flex-col gap-3 p-5 transition ${c.href ? "hover:border-primary/40" : ""}`}>
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${c.bg} ${c.color}`}>
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
            <Link key={c.label} to={c.href}>{inner}</Link>
          ) : (
            <div key={c.label}>{inner}</div>
          );
        })}
      </div>

      {/* Bottom stat cards */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Top API spenders */}
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <h2 className="font-display text-xl">Top API spenders</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Users consuming the most OpenAI cost this month</p>
          <div className="panel mt-4 p-0">
            {topSpenders.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No usage yet.</div>
            )}
            {topSpenders.map((s: TopSpender, i) => (
              <div
                key={s.id}
                className="flex items-center gap-3 border-b border-border/60 px-5 py-3 text-sm last:border-0"
              >
                <span className="w-5 shrink-0 text-center font-mono text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{s.email || "—"}</span>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                        s.plan_type === "paid"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-surface text-muted-foreground"
                      }`}
                    >
                      {s.plan_type === "paid" ? "Pro" : "Free"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <CostBar cost={s.daily_cost_usd} max={maxCost} />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ${s.daily_cost_usd.toFixed(4)}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-xs text-muted-foreground">{s.project_count} sites</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="font-display text-xl">Recent activity</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Latest website builds across all users</p>
          <div className="panel mt-4 p-0">
            {recentActivity.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No activity yet.</div>
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
    </div>
  );
}
