import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, XCircle, ExternalLink } from "lucide-react";
import { PageHeader, Chip, Panel } from "@/components/ui-bits";
import { fetchDeployments } from "@/server-fns/deployments";

export const Route = createFileRoute("/_app/deployments")({
  loader: async () => fetchDeployments(),
  head: () => ({ meta: [{ title: "Deployments · Lumen" }] }),
  component: Deployments,
});

function statusIcon(s: string) {
  if (s === "success") return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
  if (s === "building") return <Clock className="h-3.5 w-3.5 animate-pulse text-accent" />;
  return <XCircle className="h-3.5 w-3.5 text-destructive" />;
}

function Deployments() {
  const deployments = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <PageHeader
        eyebrow="Pipelines"
        title="Deployments"
        description="Every release across every project."
      />
      <Panel className="mt-8 overflow-hidden p-0">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-4 border-b border-border bg-surface/60 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div>Project · Commit</div>
          <div>Env</div>
          <div>Target</div>
          <div>Time</div>
          <div className="text-right">Status</div>
        </div>
        {deployments.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No deployments yet. Deploy a project from its editor.
          </div>
        )}
        {deployments.map((d) => (
          <div
            key={d.id}
            className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-border/60 px-5 py-4 text-sm last:border-0 hover:bg-surface/50"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{d.project_name}</div>
              <div className="truncate font-mono text-xs text-muted-foreground">
                {d.commit_message}
              </div>
            </div>
            <div>
              <Chip tone={d.env === "production" ? "primary" : "muted"}>{d.env}</Chip>
            </div>
            <div className="text-muted-foreground">{d.target}</div>
            <div className="text-muted-foreground">{new Date(d.created_at).toLocaleString()}</div>
            <div className="flex items-center justify-end gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-2.5 py-0.5 text-xs">
                {statusIcon(d.status)} {d.status}
              </span>
              <a
                href={`/sites/${d.project_id}`}
                target="_blank"
                rel="noreferrer"
                className="grid h-7 w-7 place-items-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}
