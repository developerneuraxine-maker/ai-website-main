import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-server";
import { getSettings, updateSettings, type SettingsRow } from "@/lib/db";

export const fetchSettings = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  try {
    return await getSettings(user.id);
  } catch (e) {
    console.error("[settings] fetchSettings error:", JSON.stringify(e), e instanceof Error ? e.message : String(e));
    throw e;
  }
});

export const saveSettings = createServerFn({ method: "POST" })
  .validator((d: Partial<Omit<SettingsRow, "id" | "user_id">>) => d)
  .handler(async ({ data }) => {
    const user = await requireUser();
    await updateSettings(user.id, data);
    return { ok: true };
  });
