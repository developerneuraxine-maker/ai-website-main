import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-server";
import { listAllVersions, restoreVersion } from "@/lib/db";

export const fetchVersions = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  return listAllVersions(user.id);
});

export const restoreVersionFn = createServerFn({ method: "POST" })
  .validator((d: { versionId: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser();
    await restoreVersion(data.versionId, user.id);
    return { ok: true };
  });
