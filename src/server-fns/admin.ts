import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/auth-server";
import { adminGetStats, adminListUsers, adminListProjects, adminToggleAdmin } from "@/lib/db";

export const fetchAdminStats = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return adminGetStats();
});

export const fetchAdminUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return adminListUsers();
});

export const fetchAdminProjects = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return adminListProjects();
});

const HARDCODED_ADMIN_EMAIL = "socialsprouts1@gmail.com";

export const toggleAdminRole = createServerFn({ method: "POST" })
  .validator((d: { userId: string; isAdmin: boolean }) => d)
  .handler(async ({ data }) => {
    const me = await requireAdmin();
    // Prevent self-demotion
    if (data.userId === me.id && !data.isAdmin) {
      throw new Error("You cannot remove your own admin access.");
    }
    // Prevent anyone from demoting the hardcoded owner account via the UI
    if (me.email === HARDCODED_ADMIN_EMAIL && data.userId === me.id) {
      throw new Error("The owner account cannot be modified.");
    }
    await adminToggleAdmin(data.userId, data.isAdmin);
    return { ok: true };
  });
