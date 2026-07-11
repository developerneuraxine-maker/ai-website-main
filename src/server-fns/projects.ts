import { createServerFn } from "@tanstack/react-start";
import { generateSite, reviseSite } from "@/lib/openai";
import { getStyleReference } from "@/lib/style-references";
import { requireUser } from "@/lib/auth-server";
import { generateUserToken } from "@/lib/integrate";
import { isOwner } from "@/lib/owner";
import {
  addProjectMessage,
  checkDailyLimit,
  createProjectRecord,
  deleteProjectForever,
  deployProjectRecord,
  getProject,
  getProjectMessages,
  listConnectors,
  listProjects,
  listTrashedProjects,
  recordDailyUsage,
  restoreProject,
  reviseProjectRecord,
  softDeleteProject,
} from "@/lib/db";

export const createProject = createServerFn({ method: "POST" })
  .validator(
    (d: {
      prompt: string;
      category: string;
      palette: string;
      motion: string;
      language: string;
      theme?: string;
      font?: string;
      referenceUrl?: string;
      imageUrls?: string[];
      styleReferenceId?: string;
    }) => {
      if (!d.prompt || d.prompt.trim().length === 0) throw new Error("Prompt is required.");
      return d;
    },
  )
  .handler(async ({ data }) => {
    const user = await requireUser();

    const ownerAccount = isOwner(user.email);
    let freePreview = false;

    if (!ownerAccount) {
      // Check daily limit BEFORE calling OpenAI to avoid wasting API cost.
      // currentCost===0 + free plan → deliver a partial "preview" site to stay within $0.10.
      const { currentCost, isPaidActive } = await checkDailyLimit(user.id);
      freePreview = !isPaidActive && currentCost === 0;
    }

    const ref = getStyleReference(data.styleReferenceId);

    // Fetch connectors to pass integration context to the AI
    const connectors = await listConnectors(user.id);
    const hasGoogle = connectors.some((c) => c.provider === "google");
    const integrationToken = await generateUserToken(user.id);
    const integrations = {
      userId: user.id,
      hasGmail: hasGoogle,
      hasSheets: hasGoogle,
      hasCalendar: hasGoogle,
      hasRazorpay: connectors.some((c) => c.provider === "razorpay"),
      integrationToken: integrationToken || undefined,
    };

    const { html, costUsd } = await generateSite({
      ...data,
      styleReference: ref ? { name: ref.name, code: ref.codeExcerpt } : undefined,
      integrations,
      freePreview,
    });

    // Record actual cost after successful generation.
    await recordDailyUsage(user.id, costUsd);

    const project = await createProjectRecord({
      userId: user.id,
      prompt: data.prompt,
      category: data.category,
      palette: data.palette,
      html,
    });
    return { id: project.id };
  });

export const fetchProjects = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  return listProjects(user.id);
});

export const fetchProjectDetail = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser();
    const project = await getProject(data.id);
    if (!project || (project.user_id !== null && project.user_id !== user.id && !user.isAdmin)) {
      return null;
    }
    const messages = await getProjectMessages(data.id);
    return { project, messages };
  });

export const reviseProject = createServerFn({ method: "POST" })
  .validator((d: { id: string; instruction: string }) => {
    if (!d.instruction || d.instruction.trim().length === 0)
      throw new Error("Instruction is required.");
    if (d.instruction.length > 1000)
      throw new Error("Instruction must be 1000 characters or fewer.");
    return d;
  })
  .handler(async ({ data }) => {
    const user = await requireUser();
    const project = await getProject(data.id);
    if (!project || (project.user_id !== null && project.user_id !== user.id && !user.isAdmin)) {
      throw new Error("Project not found");
    }

    // Check daily limit BEFORE calling OpenAI (owner is exempt).
    if (!isOwner(user.email)) await checkDailyLimit(user.id);

    await addProjectMessage(data.id, "you", data.instruction);
    const { html, costUsd } = await reviseSite({
      currentHtml: project.generated_html,
      instruction: data.instruction,
    });
    await recordDailyUsage(user.id, costUsd);
    await reviseProjectRecord(data.id, html, data.instruction.slice(0, 80), user.id);
    const aiReply = `Updated. ${data.instruction}`;
    await addProjectMessage(data.id, "ai", aiReply);
    return { html, aiReply };
  });

export const deployProject = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser();
    const url = await deployProjectRecord(data.id, user.id);
    return { url };
  });

export const trashProject = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser();
    await softDeleteProject(data.id, user.id);
    return { ok: true };
  });

export const fetchTrash = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  return listTrashedProjects(user.id);
});

export const restoreTrashedProject = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser();
    await restoreProject(data.id, user.id);
    return { ok: true };
  });

export const deleteTrashedProjectForever = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser();
    await deleteProjectForever(data.id, user.id);
    return { ok: true };
  });

// Extract structured info from a business card or resume image using Vision AI
export const extractFromImage = createServerFn({ method: "POST" })
  .validator((d: { imageUrl: string; type: "business_card" | "resume" }) => d)
  .handler(async ({ data }) => {
    await requireUser();
    const { OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const instruction =
      data.type === "business_card"
        ? `Extract all information from this business card image and return ONLY a JSON object:
{
  "name": "full name",
  "title": "job title or profession",
  "company": "company or business name",
  "phone": "phone number",
  "email": "email address",
  "website": "website if visible",
  "address": "address if visible",
  "services": "services or tagline if visible",
  "prompt": "A detailed website generation prompt for this person/business"
}`
        : `Extract all key information from this resume/CV image and return ONLY a JSON object:
{
  "name": "full name",
  "title": "current job title",
  "summary": "professional summary in 1-2 sentences",
  "skills": "top 6-8 skills as comma-separated text",
  "experience": "2-3 key experiences summarized in 2 sentences",
  "education": "highest degree and institution",
  "email": "email if visible",
  "prompt": "A detailed portfolio website generation prompt for this person"
}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: data.imageUrl } },
            { type: "text", text: instruction },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    try {
      const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      return JSON.parse(cleaned) as Record<string, string>;
    } catch {
      return { prompt: "Create a professional website based on the uploaded information." };
    }
  });

// Save visually-edited HTML directly (no AI call, no credit charge)
export const saveProjectHtml = createServerFn({ method: "POST" })
  .validator((d: { id: string; html: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser();
    const { getSupabase } = await import("@/lib/supabase");
    const supabase = getSupabase();
    const { error } = await supabase
      .from("projects")
      .update({ generated_html: data.html })
      .eq("id", data.id)
      .eq("user_id", user.id);
    if (error) throw error;
    return { ok: true };
  });
