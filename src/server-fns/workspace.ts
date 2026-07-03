import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-server";
import { addWorkspaceMember, listWorkspaceMembers, removeWorkspaceMember } from "@/lib/db";

export const fetchWorkspaceMembers = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  return listWorkspaceMembers(user.id);
});

export const inviteWorkspaceMember = createServerFn({ method: "POST" })
  .validator((d: { name: string; email: string; role: "Owner" | "Editor" | "Viewer" }) => {
    if (!d.name || d.name.trim().length === 0) throw new Error("Name is required.");
    if (d.name.length > 100) throw new Error("Name must be 100 characters or fewer.");
    if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
      throw new Error("A valid email address is required.");
    if (d.email.length > 254) throw new Error("Email address is too long.");
    if (!["Owner", "Editor", "Viewer"].includes(d.role)) throw new Error("Invalid role.");
    return d;
  })
  .handler(async ({ data }) => {
    const user = await requireUser();
    return addWorkspaceMember(user.id, data);
  });

export const removeWorkspaceMemberFn = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser();
    await removeWorkspaceMember(data.id, user.id);
    return { ok: true };
  });
