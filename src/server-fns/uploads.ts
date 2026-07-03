import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-server";
import { uploadProjectImage } from "@/lib/db";

export const uploadImage = createServerFn({ method: "POST" })
  .validator((d: { base64: string; fileName: string; contentType: string }) => d)
  .handler(async ({ data }) => {
    await requireUser();
    const url = await uploadProjectImage(data);
    return { url };
  });
