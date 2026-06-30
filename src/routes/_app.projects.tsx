import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { PageHeader, Chip } from "@/components/ui-bits";
import { fetchProjects, trashProject } from "@/server-fns/projects";
import type { ProjectRow } from "@/lib/db";

export const Route = createFileRoute("/_app/projects")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === "string" ? { q: search.q } : {},
  loader: async () => fetchProjects(),
  head: () => ({ meta: [{ title: "Projects · Lumen" }] }),
  component: Projects,
});

const filters = [
  { label: "All", status: null },
  { label: "Live", status: "live" },
  { label: "Draft", status: "draft" },
  { label: "Building", status: "building" },
  { label: "Error", status: "error" },
] as const;

function Projects() {
  // If a child route is matched (e.g. /projects/$id), render only it.
  const matches = useMatches();
  const hasChild = matches.some((m) => m.routeId.startsWith("/_app/projects/"));
  const initial = Route.useLoaderData();
  const { q } = Route.useSearch();
  const [projects, setProjects] = useState<ProjectRow[]>(initial);
  const [query, setQuery] = useState(q ?? "");
  const [statusFilter, setStatusFilter] = useState<(typeof filters)[number]["status"]>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesQuery =
        !needle || p.name.toLowerCase().includes(needle) || p.prompt.toLowerCase().includes(needle);
      const matchesStatus = !statusFilter || p.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [projects, query, statusFilter]);

  if (hasChild) return <Outlet />;

  const remove = async (id: string) => {
    setProjects((p) => p.filter((proj) => proj.id !== id));
    await trashProject({ data: { id } });
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <PageHeader
        eyebrow="All work"
        title="Projects"
        description="Every site you've generated, drafted, or shipped."
        actions={
          <Link
            to="/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> New website
          </Link>
        }
      />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 flex-1 bg-transparent text-sm outline-none"
            placeholder="Search projects"
          />
        </div>
        {filters.map((f) => (
          <button
            key={f.label}
            onClick={() => setStatusFilter(f.status)}
            className={`rounded-full border px-3 py-1.5 text-xs ${statusFilter === f.status ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16 text-center text-sm text-muted-foreground">
          {projects.length === 0 ? (
            <>
              No projects yet.{" "}
              <Link to="/new" className="text-primary hover:underline">
                Generate your first one
              </Link>
              .
            </>
          ) : (
            "No projects match your search."
          )}
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="panel group relative overflow-hidden p-0 transition hover:border-primary/40"
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                remove(p.id);
              }}
              className="absolute right-3 top-3 z-10 grid size-7 place-items-center rounded-md border border-border bg-background/80 text-muted-foreground opacity-0 backdrop-blur transition hover:text-destructive group-hover:opacity-100"
              title="Move to trash"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <Link to="/projects/$id" params={{ id: p.id }} className="block">
              <div className={`relative aspect-16/10 bg-linear-to-br ${p.thumbnail}`}>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="font-display text-3xl text-foreground/90">{p.name}</div>
                </div>
                <div className="absolute right-3 top-3 group-hover:opacity-0">
                  <StatusChip status={p.status} />
                </div>
              </div>
              <div className="space-y-3 p-5">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {p.category} · {new Date(p.updated_at).toLocaleDateString()}
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{p.prompt}</p>
                <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>{p.visits.toLocaleString()} visits</span>
                  <span>Score {p.score || "—"}</span>
                </div>
              </div>
            </Link>
          </div>
        ))}
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
