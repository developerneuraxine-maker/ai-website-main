import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-server";
import { createApiKey, deleteApiKey, listApiKeys } from "@/lib/db";

export const fetchApiKeys = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  return listApiKeys(user.id);
});

export const newApiKey = createServerFn({ method: "POST" })
  .validator((d: { label: string }) => {
    if (!d.label || d.label.trim().length === 0) throw new Error("Label is required.");
    if (d.label.length > 100) throw new Error("Label must be 100 characters or fewer.");
    return d;
  })
  .handler(async ({ data }) => {
    const user = await requireUser();
    return createApiKey(user.id, data.label.trim());
  });

export const removeApiKey = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser();
    await deleteApiKey(data.id, user.id);
    return { ok: true };
  });
