import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, RotateCcw } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-bits";
import {
  fetchTrash,
  restoreTrashedProject,
  deleteTrashedProjectForever,
} from "@/server-fns/projects";
import type { ProjectRow } from "@/lib/db";

export const Route = createFileRoute("/_app/trash")({
  loader: async () => fetchTrash(),
  head: () => ({ meta: [{ title: "Trash · Lumen" }] }),
  component: Trash,
});

function Trash() {
  const initial = Route.useLoaderData();
  const [items, setItems] = useState<ProjectRow[]>(initial);

  const restore = async (id: string) => {
    setItems((i) => i.filter((p) => p.id !== id));
    await restoreTrashedProject({ data: { id } });
  };

  const destroy = async (id: string) => {
    if (!window.confirm("Permanently delete this project? This can't be undone.")) return;
    setItems((i) => i.filter((p) => p.id !== id));
    await deleteTrashedProjectForever({ data: { id } });
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        eyebrow="Bin"
        title="Trash"
        description="Deleted projects are kept here until you remove them for good."
      />
      <Panel className="mt-8 p-0">
        {items.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Trash is empty.</div>
        )}
        {items.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-4 border-b border-border/60 px-5 py-4 last:border-0"
          >
            <div className="grid size-9 place-items-center rounded-lg border border-border bg-elevated text-muted-foreground">
              <Trash2 className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="font-medium">{p.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Deleted {p.deleted_at ? new Date(p.deleted_at).toLocaleDateString() : ""}
              </div>
            </div>
            <button
              onClick={() => restore(p.id)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs hover:border-foreground/40"
            >
              <RotateCcw className="h-3 w-3" />
              Restore
            </button>
            <button
              onClick={() => destroy(p.id)}
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
            >
              Delete forever
            </button>
          </div>
        ))}
      </Panel>
    </div>
  );
}
