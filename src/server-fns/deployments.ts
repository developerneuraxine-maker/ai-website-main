import { createServerFn } from "@tanstack/react-start";
import { listDeployments } from "@/lib/db";

export const fetchDeployments = createServerFn({ method: "GET" }).handler(async () => {
  return listDeployments();
});
