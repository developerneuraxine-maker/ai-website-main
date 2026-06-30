import { createServerFn } from "@tanstack/react-start";
import { listAllVersions, restoreVersion } from "@/lib/db";

export const fetchVersions = createServerFn({ method: "GET" }).handler(async () => {
  return listAllVersions();
});

export const restoreVersionFn = createServerFn({ method: "POST" })
  .validator((d: { versionId: string }) => d)
  .handler(async ({ data }) => {
    await restoreVersion(data.versionId);
    return { ok: true };
  });
