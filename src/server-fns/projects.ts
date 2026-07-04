import { createServerFn } from "@tanstack/react-start";
import { generateSite, reviseSite } from "@/lib/openai";
import { getStyleReference } from "@/lib/style-references";
import { requireUser } from "@/lib/auth-server";
import { generateUserToken } from "@/lib/integrate";
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

// Owner account — bypasses all usage limits and always gets full generation.
const OWNER_EMAIL = "socialsprouts1@gmail.com";

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
      if (d.prompt.length > 2000) throw new Error("Prompt must be 2000 characters or fewer.");
      return d;
    },
  )
  .handler(async ({ data }) => {
    const user = await requireUser();

    const isOwner = user.email === OWNER_EMAIL;
    let freePreview = false;

    if (!isOwner) {
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
    if (user.email !== OWNER_EMAIL) await checkDailyLimit(user.id);

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
