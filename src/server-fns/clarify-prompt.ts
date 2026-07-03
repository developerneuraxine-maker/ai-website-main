import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-server";
import { analyzePromptForClarification, type ClarificationResult } from "@/lib/openai";

export const clarifyPrompt = createServerFn({ method: "POST" })
  .validator((d: { prompt: string }) => {
    if (!d.prompt || d.prompt.trim().length === 0) throw new Error("Prompt is required.");
    return d;
  })
  .handler(async ({ data }): Promise<ClarificationResult> => {
    await requireUser();
    return analyzePromptForClarification(data.prompt);
  });
