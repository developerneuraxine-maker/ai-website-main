import { createServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/db";

export const fetchDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  return getDashboardStats();
});
