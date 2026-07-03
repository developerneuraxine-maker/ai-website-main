import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-server";
import { enhanceUserPrompt } from "@/lib/openai";

export const enhancePrompt = createServerFn({ method: "POST" })
  .validator((d: { prompt: string }) => {
    if (!d.prompt || d.prompt.trim().length === 0) throw new Error("Prompt is required.");
    if (d.prompt.length > 500) throw new Error("Prompt must be 500 characters or fewer.");
    return d;
  })
  .handler(
    async ({ data }): Promise<{ enhanced: string; error: null } | { enhanced: null; error: string }> => {
      try {
        await requireUser();
        const enhanced = await enhanceUserPrompt(data.prompt);
        return { enhanced, error: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Enhancement failed.";
        return { enhanced: null, error: msg };
      }
    },
  );
