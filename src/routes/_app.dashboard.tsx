import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Plus, Sparkles } from "lucide-react";
import { PageHeader, Panel, Stat, Chip } from "@/components/ui-bits";
import { examplePrompts } from "@/lib/mock-data";
import { fetchProjects } from "@/server-fns/projects";
import { fetchDashboardStats } from "@/server-fns/dashboard";
import { fetchVersions } from "@/server-fns/history";

export const Route = createFileRoute("/_app/dashboard")({
  loader: async () => {
    const [projects, stats, versions] = await Promise.all([
      fetchProjects(),
      fetchDashboardStats(),
      fetchVersions(),
    ]);
    return { projects, stats, recentActivity: versions.slice(0, 5) };
  },
  head: () => ({ meta: [{ title: "Dashboard · Lumen" }] }),
  component: Dashboard,
});

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Dashboard() {
  const { projects, stats, recentActivity } = Route.useLoaderData();
  const recent = projects.slice(0, 4);
  const [quickPrompt, setQuickPrompt] = useState("");
  const navigate = useNavigate();

  const goGenerate = () => {
    navigate({ to: "/new", search: quickPrompt.trim() ? { prompt: quickPrompt } : {} });
  };

  const statusEntries: {
    key: "live" | "draft" | "building" | "error";
    label: string;
    tone: "primary" | "muted" | "accent" | "danger";
  }[] = [
    { key: "live", label: "Live", tone: "primary" },
    { key: "draft", label: "Draft", tone: "muted" },
    { key: "building", label: "Building", tone: "accent" },
    { key: "error", label: "Error", tone: "danger" },
  ];
  const maxCount = Math.max(1, ...statusEntries.map((s) => stats.statusCounts[s.key]));

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <PageHeader
        eyebrow="Overview"
        title="Welcome back."
        description="Pick up a project, or start something new from a sentence."
        actions={
          <Link
            to="/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> New website
          </Link>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Projects" value={stats.projects} />
        <Stat label="Deployments" value={stats.deployments} />
        <Stat label="Total visits" value={formatCompact(stats.visits)} />
      </div>

      {/* Quick prompt */}
      <Panel className="mt-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Quick start
            </div>
            <div className="font-display text-2xl">Start a new website</div>
          </div>
          <Chip tone="primary">
            <Sparkles className="h-3 w-3" /> AI ready
          </Chip>
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-elevated p-2">
          <span className="ml-2 text-muted-foreground">›</span>
          <input
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goGenerate()}
            className="h-10 flex-1 bg-transparent text-sm outline-none"
            placeholder="A boutique hotel in the Dolomites with a booking widget…"
          />
          <button
            onClick={goGenerate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Generate <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {examplePrompts.slice(0, 4).map((p) => (
            <button
              key={p}
              onClick={() => setQuickPrompt(p)}
              className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
            >
              {p}
            </button>
          ))}
        </div>
      </Panel>

      {/* Recent projects */}
      <div className="mt-12 flex items-end justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Recent
          </div>
          <h2 className="font-display text-3xl">Your projects</h2>
        </div>
        <Link to="/projects" className="text-sm text-primary hover:underline">
          View all →
        </Link>
      </div>

      {recent.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No projects yet.{" "}
          <Link to="/new" className="text-primary hover:underline">
            Generate your first one
          </Link>
          .
        </div>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
        {recent.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              to="/projects/$id"
              params={{ id: p.id }}
              className="panel group block overflow-hidden p-0 transition hover:border-primary/40"
            >
              <div
                className={`relative aspect-[16/9] overflow-hidden bg-gradient-to-br ${p.thumbnail}`}
              >
                <div className="absolute inset-0 grid place-items-center">
                  <div className="font-display text-4xl text-foreground/90">{p.name}</div>
                </div>
                <div className="absolute right-3 top-3">
                  <StatusChip status={p.status} />
                </div>
              </div>
              <div className="flex items-center justify-between p-5">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {p.category} · {timeAgo(p.updated_at)}
                  </div>
                  <div className="mt-1 font-medium">{p.url ?? "not deployed"}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Activity */}
      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="font-display text-xl">Project status</div>
          <div className="mt-6 space-y-4">
            {statusEntries.map((s) => {
              const count = stats.statusCounts[s.key];
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <Chip tone={s.tone}>{s.label}</Chip>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-sm text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel>
          <div className="font-display text-xl">Latest activity</div>
          {recentActivity.length === 0 ? (
            <div className="mt-5 text-sm text-muted-foreground">
              Nothing yet — generate a project to get started.
            </div>
          ) : (
            <ul className="mt-5 space-y-4 text-sm">
              {recentActivity.map((v) => (
                <li key={v.id} className="flex items-start gap-3">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  <div className="flex-1">
                    <div>
                      {v.project_name}: {v.label}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {timeAgo(v.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { tone: "primary" | "muted" | "accent" | "danger"; label: string }> = {
    live: { tone: "primary", label: "Live" },
    draft: { tone: "muted", label: "Draft" },
    building: { tone: "accent", label: "Building" },
    error: { tone: "danger", label: "Error" },
  };
  const c = map[status] ?? map.draft;
  return <Chip tone={c.tone}>{c.label}</Chip>;
}
