import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-server";
import { getDashboardStats } from "@/lib/db";

export const fetchDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  return getDashboardStats(user.id);
});
