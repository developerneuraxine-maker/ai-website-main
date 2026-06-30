import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GitBranch, RotateCcw, GitCompareArrows } from "lucide-react";
import { PageHeader, Panel, Chip } from "@/components/ui-bits";
import { fetchVersions, restoreVersionFn } from "@/server-fns/history";

export const Route = createFileRoute("/_app/history")({
  loader: async () => fetchVersions(),
  head: () => ({ meta: [{ title: "Version history · Lumen" }] }),
  component: History,
});

function History() {
  const versions = Route.useLoaderData();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  const restore = async (id: string) => {
    setRestoringId(id);
    try {
      await restoreVersionFn({ data: { versionId: id } });
      setRestoredId(id);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="All projects"
        title="Version history"
        description="Every prompt and edit is a checkpoint. Restore or compare."
      />

      <Panel className="mt-8 p-0">
        {versions.length === 0 && (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            No versions yet. Generate or revise a project to start a history.
          </div>
        )}
        <ol className="relative">
          {versions.map((v, i) => (
            <li
              key={v.id}
              className="relative flex gap-4 border-b border-border/60 px-6 py-5 last:border-0"
            >
              <div className="relative">
                <div
                  className={`mt-1 grid size-8 place-items-center rounded-full ${i === 0 ? "bg-primary text-primary-foreground" : "border border-border bg-surface text-muted-foreground"}`}
                >
                  <GitBranch className="h-3.5 w-3.5" />
                </div>
                {i !== versions.length - 1 && (
                  <span className="absolute left-1/2 top-9 h-[calc(100%-1rem)] w-px -translate-x-1/2 bg-border" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg">{v.label}</span>
                  {i === 0 && <Chip tone="primary">Latest</Chip>}
                  {restoredId === v.id && <Chip tone="muted">Restored</Chip>}
                </div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {v.project_name} · {v.author} · {new Date(v.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => restore(v.id)}
                  disabled={restoringId === v.id}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs hover:border-foreground/40 disabled:opacity-50"
                >
                  <RotateCcw className="h-3 w-3" />
                  {restoringId === v.id ? "Restoring…" : "Restore"}
                </button>
                <button
                  disabled
                  title="Coming soon"
                  className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground/50"
                >
                  <GitCompareArrows className="h-3 w-3" />
                  Diff
                </button>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
