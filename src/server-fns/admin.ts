import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/auth-server";
import {
  adminGetStats,
  adminListUsers,
  adminListProjects,
  adminToggleAdmin,
  adminSuspendUser,
  adminUnsuspendUser,
  adminGetRevenueStats,
  adminListUsersDetailed,
  adminSetPlan,
  adminDeleteProject,
  adminGetTopSpenders,
  adminCreateAnnouncement,
  adminListAnnouncements,
  adminDeleteAnnouncement,
  getActiveAnnouncements,
} from "@/lib/db";

export const fetchAdminStats = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return adminGetStats();
});

export const fetchAdminRevenue = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return adminGetRevenueStats();
});

export const fetchAdminUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return adminListUsers();
});

export const fetchAdminUsersDetailed = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return adminListUsersDetailed();
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
    if (data.userId === me.id && !data.isAdmin) {
      throw new Error("You cannot remove your own admin access.");
    }
    if (me.email === HARDCODED_ADMIN_EMAIL && data.userId === me.id) {
      throw new Error("The owner account cannot be modified.");
    }
    await adminToggleAdmin(data.userId, data.isAdmin);
    return { ok: true };
  });

export const suspendUser = createServerFn({ method: "POST" })
  .validator((d: { userId: string; reason: string }) => d)
  .handler(async ({ data }) => {
    const me = await requireAdmin();
    if (data.userId === me.id) throw new Error("You cannot suspend yourself.");
    await adminSuspendUser(data.userId, data.reason);
    return { ok: true };
  });

export const unsuspendUser = createServerFn({ method: "POST" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    await adminUnsuspendUser(data.userId);
    return { ok: true };
  });

export const changePlan = createServerFn({ method: "POST" })
  .validator((d: { userId: string; planType: "free" | "paid" }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    await adminSetPlan(data.userId, data.planType);
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .validator((d: { projectId: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    await adminDeleteProject(data.projectId);
    return { ok: true };
  });

export const fetchTopSpenders = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return adminGetTopSpenders(10);
});

export const fetchBroadcasts = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return adminListAnnouncements();
});

export const fetchActiveAnnouncements = createServerFn({ method: "GET" }).handler(async () => {
  return getActiveAnnouncements();
});

export const createBroadcast = createServerFn({ method: "POST" })
  .validator(
    (d: { message: string; type: "info" | "warning" | "success"; expiresAt: string | null }) => {
      if (!d.message.trim()) throw new Error("Message is required.");
      return d;
    },
  )
  .handler(async ({ data }) => {
    const me = await requireAdmin();
    return adminCreateAnnouncement(data.message, data.type, data.expiresAt, me.id);
  });

export const deleteBroadcast = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    await adminDeleteAnnouncement(data.id);
    return { ok: true };
  });
