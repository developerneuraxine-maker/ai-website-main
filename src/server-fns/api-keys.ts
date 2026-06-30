import { createServerFn } from "@tanstack/react-start";
import { createApiKey, deleteApiKey, listApiKeys } from "@/lib/db";

export const fetchApiKeys = createServerFn({ method: "GET" }).handler(async () => {
  return listApiKeys();
});

export const newApiKey = createServerFn({ method: "POST" })
  .validator((d: { label: string }) => d)
  .handler(async ({ data }) => {
    return createApiKey(data.label);
  });

export const removeApiKey = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await deleteApiKey(data.id);
    return { ok: true };
  });
