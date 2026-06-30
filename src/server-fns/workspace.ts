import { createServerFn } from "@tanstack/react-start";
import { addWorkspaceMember, listWorkspaceMembers, removeWorkspaceMember } from "@/lib/db";

export const fetchWorkspaceMembers = createServerFn({ method: "GET" }).handler(async () => {
  return listWorkspaceMembers();
});

export const inviteWorkspaceMember = createServerFn({ method: "POST" })
  .validator((d: { name: string; email: string; role: "Owner" | "Editor" | "Viewer" }) => d)
  .handler(async ({ data }) => {
    return addWorkspaceMember(data);
  });

export const removeWorkspaceMemberFn = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await removeWorkspaceMember(data.id);
    return { ok: true };
  });
