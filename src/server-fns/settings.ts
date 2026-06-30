import { createServerFn } from "@tanstack/react-start";
import { getSettings, updateSettings, type SettingsRow } from "@/lib/db";

export const fetchSettings = createServerFn({ method: "GET" }).handler(async () => {
  return getSettings();
});

export const saveSettings = createServerFn({ method: "POST" })
  .validator((d: Partial<Omit<SettingsRow, "id">>) => d)
  .handler(async ({ data }) => {
    await updateSettings(data);
    return { ok: true };
  });
