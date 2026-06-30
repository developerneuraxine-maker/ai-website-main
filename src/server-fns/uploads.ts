import { createServerFn } from "@tanstack/react-start";
import { uploadProjectImage } from "@/lib/db";

export const uploadImage = createServerFn({ method: "POST" })
  .validator((d: { base64: string; fileName: string; contentType: string }) => d)
  .handler(async ({ data }) => {
    const url = await uploadProjectImage(data);
    return { url };
  });
