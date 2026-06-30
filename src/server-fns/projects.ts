import { createServerFn } from "@tanstack/react-start";
import { generateSite, reviseSite } from "@/lib/openai";
import { getStyleReference } from "@/lib/style-references";
import {
  addProjectMessage,
  createProjectRecord,
  deleteProjectForever,
  deployProjectRecord,
  getProject,
  getProjectMessages,
  listProjects,
  listTrashedProjects,
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
      imageUrl?: string;
      styleReferenceId?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const ref = getStyleReference(data.styleReferenceId);
    const { html } = await generateSite({
      ...data,
      styleReference: ref ? { name: ref.name, code: ref.codeExcerpt } : undefined,
    });
    const project = await createProjectRecord({
      prompt: data.prompt,
      category: data.category,
      palette: data.palette,
      html,
    });
    return { id: project.id };
  });

export const fetchProjects = createServerFn({ method: "GET" }).handler(async () => {
  return listProjects();
});

export const fetchProjectDetail = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const project = await getProject(data.id);
    if (!project) return null;
    const messages = await getProjectMessages(data.id);
    return { project, messages };
  });

export const reviseProject = createServerFn({ method: "POST" })
  .validator((d: { id: string; instruction: string }) => d)
  .handler(async ({ data }) => {
    const project = await getProject(data.id);
    if (!project) throw new Error("Project not found");

    await addProjectMessage(data.id, "you", data.instruction);
    const { html } = await reviseSite({
      currentHtml: project.generated_html,
      instruction: data.instruction,
    });
    await reviseProjectRecord(data.id, html, data.instruction.slice(0, 80));
    const aiReply = `Updated. ${data.instruction}`;
    await addProjectMessage(data.id, "ai", aiReply);
    return { html, aiReply };
  });

export const deployProject = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const url = await deployProjectRecord(data.id);
    return { url };
  });

export const trashProject = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await softDeleteProject(data.id);
    return { ok: true };
  });

export const fetchTrash = createServerFn({ method: "GET" }).handler(async () => {
  return listTrashedProjects();
});

export const restoreTrashedProject = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await restoreProject(data.id);
    return { ok: true };
  });

export const deleteTrashedProjectForever = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await deleteProjectForever(data.id);
    return { ok: true };
  });
