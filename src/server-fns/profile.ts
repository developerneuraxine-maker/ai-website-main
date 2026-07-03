import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-server";
import { getProfile, updateProfile, type ProfileRow } from "@/lib/db";

export const fetchProfile = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  try {
    return await getProfile(user.id);
  } catch (e) {
    console.error("[profile] fetchProfile error:", JSON.stringify(e), e instanceof Error ? e.message : String(e));
    throw e;
  }
});

export const saveProfile = createServerFn({ method: "POST" })
  .validator((d: Partial<Omit<ProfileRow, "id" | "user_id">>) => d)
  .handler(async ({ data }) => {
    const user = await requireUser();
    await updateProfile(user.id, data);
    return { ok: true };
  });
