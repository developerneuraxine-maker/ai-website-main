import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { PageHeader, Panel, Chip } from "@/components/ui-bits";
import {
  fetchWorkspaceMembers,
  inviteWorkspaceMember,
  removeWorkspaceMemberFn,
} from "@/server-fns/workspace";
import type { WorkspaceMemberRow } from "@/lib/db";

export const Route = createFileRoute("/_app/workspace")({
  loader: async () => fetchWorkspaceMembers(),
  head: () => ({ meta: [{ title: "Workspace · Lumen" }] }),
  component: Workspace,
});

function Workspace() {
  const initial = Route.useLoaderData();
  const [members, setMembers] = useState<WorkspaceMemberRow[]>(initial);
  const [inviting, setInviting] = useState(false);

  const invite = async () => {
    const name = window.prompt("Name");
    if (!name?.trim()) return;
    const email = window.prompt("Email");
    if (!email?.trim()) return;
    setInviting(true);
    try {
      const member = await inviteWorkspaceMember({ data: { name, email, role: "Editor" } });
      setMembers((m) => [...m, member]);
    } finally {
      setInviting(false);
    }
  };

  const remove = async (id: string) => {
    setMembers((m) => m.filter((x) => x.id !== id));
    await removeWorkspaceMemberFn({ data: { id } });
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Team"
        title="Studio Nord"
        description={`Shared workspace · ${members.length} member${members.length === 1 ? "" : "s"}`}
        actions={
          <button
            onClick={invite}
            disabled={inviting}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Invite member
          </button>
        }
      />
      <Panel className="mt-8 p-0">
        {members.map((m) => (
          <div
            key={m.id}
            className="group flex items-center gap-4 border-b border-border/60 px-5 py-4 last:border-0"
          >
            <div
              className={`grid size-10 place-items-center rounded-full bg-gradient-to-br ${m.avatar_gradient} font-display`}
            >
              {m.name[0]}
            </div>
            <div className="flex-1">
              <div className="font-medium">{m.name}</div>
              <div className="text-xs text-muted-foreground">{m.email}</div>
            </div>
            <Chip tone={m.role === "Owner" ? "primary" : "muted"}>{m.role}</Chip>
            {m.role !== "Owner" && (
              <button
                onClick={() => remove(m.id)}
                className="grid size-7 place-items-center rounded-md border border-border bg-surface text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </Panel>
    </div>
  );
}
