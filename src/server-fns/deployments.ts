import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-server";
import { listDeployments } from "@/lib/db";

export const fetchDeployments = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  return listDeployments(user.id);
});
