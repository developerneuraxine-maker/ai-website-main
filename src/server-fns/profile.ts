import { createServerFn } from "@tanstack/react-start";
import { getProfile, updateProfile, type ProfileRow } from "@/lib/db";

export const fetchProfile = createServerFn({ method: "GET" }).handler(async () => {
  return getProfile();
});

export const saveProfile = createServerFn({ method: "POST" })
  .validator((d: Partial<Omit<ProfileRow, "id">>) => d)
  .handler(async ({ data }) => {
    await updateProfile(data);
    return { ok: true };
  });
