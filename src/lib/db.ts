import { getSupabase, type Database } from "./supabase";

export type ProjectRow = {
  id: string;
  name: string;
  prompt: string;
  category: string;
  status: "live" | "draft" | "building" | "error";
  url: string | null;
  thumbnail: string;
  generated_html: string;
  visits: number;
  score: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectMessageRow = {
  id: string;
  project_id: string;
  who: "you" | "ai";
  text: string;
  created_at: string;
};

export type ProjectVersionRow = {
  id: string;
  project_id: string;
  label: string;
  author: string;
  html_snapshot: string;
  created_at: string;
};

const PALETTE_THUMBNAILS: Record<string, string> = {
  candlelit: "from-amber-500/40 via-rose-500/30 to-fuchsia-500/30",
  lime: "from-lime-400/40 via-emerald-500/30 to-teal-500/30",
  marble: "from-stone-300/30 via-zinc-400/30 to-neutral-500/30",
  ocean: "from-sky-300/40 via-cyan-400/30 to-blue-500/30",
};

export function thumbnailForPalette(palette: string) {
  return PALETTE_THUMBNAILS[palette] ?? PALETTE_THUMBNAILS.candlelit;
}

function deriveName(prompt: string) {
  const words = prompt.trim().split(/\s+/).slice(0, 5).join(" ");
  return words.length > 0 ? words : "Untitled site";
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadProjectImage(input: {
  base64: string;
  fileName: string;
  contentType: string;
}) {
  if (!input.contentType.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }
  const bytes = Uint8Array.from(atob(input.base64), (c) => c.charCodeAt(0));
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 5MB).");
  }

  const supabase = getSupabase();
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from("project-images")
    .upload(path, bytes, { contentType: input.contentType, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from("project-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function createProjectRecord(input: {
  prompt: string;
  category: string;
  palette: string;
  html: string;
}) {
  const supabase = getSupabase();
  const name = deriveName(input.prompt);
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name,
      prompt: input.prompt,
      category: input.category,
      status: "live",
      url: null,
      thumbnail: thumbnailForPalette(input.palette),
      generated_html: input.html,
      visits: 0,
    })
    .select()
    .single();
  if (error) throw error;

  const projectRow = project as ProjectRow;

  await supabase.from("project_messages").insert({
    project_id: projectRow.id,
    who: "ai",
    text: `Generated ${projectRow.name}. What should we polish next?`,
  });

  await supabase.from("project_versions").insert({
    project_id: projectRow.id,
    label: "Initial generation",
    author: "AI",
    html_snapshot: input.html,
  });

  return projectRow;
}

export async function getProject(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select()
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) return null;
  return data as ProjectRow;
}

export async function listProjects() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select()
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as ProjectRow[];
}

export async function getProjectMessages(projectId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_messages")
    .select()
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as ProjectMessageRow[];
}

export async function addProjectMessage(projectId: string, who: "you" | "ai", text: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("project_messages")
    .insert({ project_id: projectId, who, text });
  if (error) throw error;
}

export async function reviseProjectRecord(
  projectId: string,
  newHtml: string,
  versionLabel: string,
) {
  const supabase = getSupabase();
  const { error: updateError } = await supabase
    .from("projects")
    .update({ generated_html: newHtml, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (updateError) throw updateError;

  const { error: versionError } = await supabase.from("project_versions").insert({
    project_id: projectId,
    label: versionLabel,
    author: "AI",
    html_snapshot: newHtml,
  });
  if (versionError) throw versionError;
}

export async function deployProjectRecord(projectId: string) {
  const supabase = getSupabase();
  const url = `/sites/${projectId}`;
  const { error: updateError } = await supabase
    .from("projects")
    .update({ status: "live", url })
    .eq("id", projectId);
  if (updateError) throw updateError;

  const { error: deployError } = await supabase.from("deployments").insert({
    project_id: projectId,
    env: "production",
    status: "success",
    target: "lumen",
    commit_message: "Manual deploy",
  });
  if (deployError) throw deployError;

  return url;
}

// ---- Trash ----

export async function listTrashedProjects() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select()
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return data as ProjectRow[];
}

export async function softDeleteProject(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function restoreProject(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("projects").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}

export async function deleteProjectForever(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

// ---- Settings ----

export type SettingsRow = Database["public"]["Tables"]["settings"]["Row"];

export async function getSettings() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("settings").select().eq("id", 1).single();
  if (error) throw error;
  return data as SettingsRow;
}

export async function updateSettings(patch: Partial<Omit<SettingsRow, "id">>) {
  const supabase = getSupabase();
  const { error } = await supabase.from("settings").update(patch).eq("id", 1);
  if (error) throw error;
}

// ---- Profile ----

export type ProfileRow = Database["public"]["Tables"]["profile"]["Row"];

export async function getProfile() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("profile").select().eq("id", 1).single();
  if (error) throw error;
  return data as ProfileRow;
}

export async function updateProfile(patch: Partial<Omit<ProfileRow, "id">>) {
  const supabase = getSupabase();
  const { error } = await supabase.from("profile").update(patch).eq("id", 1);
  if (error) throw error;
}

// ---- API keys ----

export type ApiKeyRow = Database["public"]["Tables"]["api_keys"]["Row"];

export async function listApiKeys() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("api_keys")
    .select()
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as ApiKeyRow[];
}

export async function createApiKey(label: string) {
  const supabase = getSupabase();
  const key_value = `k_live_${crypto.randomUUID().replace(/-/g, "")}`;
  const { data, error } = await supabase
    .from("api_keys")
    .insert({ label, key_value })
    .select()
    .single();
  if (error) throw error;
  return data as ApiKeyRow;
}

export async function deleteApiKey(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("api_keys").delete().eq("id", id);
  if (error) throw error;
}

// ---- Workspace members ----

export type WorkspaceMemberRow = Database["public"]["Tables"]["workspace_members"]["Row"];

export async function listWorkspaceMembers() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("workspace_members")
    .select()
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as WorkspaceMemberRow[];
}

const MEMBER_GRADIENTS = [
  "from-amber-400 to-rose-500",
  "from-lime-400 to-emerald-500",
  "from-sky-400 to-indigo-500",
  "from-fuchsia-400 to-purple-500",
];

export async function addWorkspaceMember(input: {
  name: string;
  email: string;
  role: "Owner" | "Editor" | "Viewer";
}) {
  const supabase = getSupabase();
  const avatar_gradient = MEMBER_GRADIENTS[Math.floor(Math.random() * MEMBER_GRADIENTS.length)];
  const { data, error } = await supabase
    .from("workspace_members")
    .insert({ ...input, avatar_gradient })
    .select()
    .single();
  if (error) throw error;
  return data as WorkspaceMemberRow;
}

export async function removeWorkspaceMember(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("workspace_members").delete().eq("id", id);
  if (error) throw error;
}

// ---- Deployments ----

export type DeploymentRow = Database["public"]["Tables"]["deployments"]["Row"];
export type DeploymentWithProject = DeploymentRow & { project_name: string };

export async function listDeployments(): Promise<DeploymentWithProject[]> {
  const supabase = getSupabase();
  const { data: deployments, error } = await supabase
    .from("deployments")
    .select()
    .order("created_at", { ascending: false });
  if (error) throw error;

  const projectIds = [...new Set((deployments as DeploymentRow[]).map((d) => d.project_id))];
  const nameById = await projectNameMap(projectIds);

  return (deployments as DeploymentRow[]).map((d) => ({
    ...d,
    project_name: nameById.get(d.project_id) ?? "Unknown",
  }));
}

// ---- Version history (global feed) ----

export type VersionWithProject = ProjectVersionRow & { project_name: string };

export async function listAllVersions(): Promise<VersionWithProject[]> {
  const supabase = getSupabase();
  const { data: versions, error } = await supabase
    .from("project_versions")
    .select()
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  const projectIds = [...new Set((versions as ProjectVersionRow[]).map((v) => v.project_id))];
  const nameById = await projectNameMap(projectIds);

  return (versions as ProjectVersionRow[]).map((v) => ({
    ...v,
    project_name: nameById.get(v.project_id) ?? "Unknown",
  }));
}

export async function restoreVersion(versionId: string) {
  const supabase = getSupabase();
  const { data: version, error } = await supabase
    .from("project_versions")
    .select()
    .eq("id", versionId)
    .single();
  if (error) throw error;
  const row = version as ProjectVersionRow;

  await reviseProjectRecord(row.project_id, row.html_snapshot, `Restored: ${row.label}`);
}

async function projectNameMap(projectIds: string[]) {
  if (projectIds.length === 0) return new Map<string, string>();
  const supabase = getSupabase();
  const { data: projects } = await supabase.from("projects").select("id,name").in("id", projectIds);
  return new Map((projects ?? []).map((p) => [p.id, p.name]));
}

// ---- Dashboard stats ----

export type DashboardStats = {
  projects: number;
  deployments: number;
  visits: number;
  statusCounts: Record<"live" | "draft" | "building" | "error", number>;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabase();
  const [projectCountRes, deploymentCountRes, projectsRes] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("deployments").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("visits,status").is("deleted_at", null),
  ]);

  const rows = projectsRes.data ?? [];
  const visits = rows.reduce((sum, p) => sum + (p.visits ?? 0), 0);
  const statusCounts = { live: 0, draft: 0, building: 0, error: 0 };
  for (const row of rows) {
    statusCounts[row.status as keyof typeof statusCounts] += 1;
  }

  return {
    projects: projectCountRes.count ?? 0,
    deployments: deploymentCountRes.count ?? 0,
    visits,
    statusCounts,
  };
}
