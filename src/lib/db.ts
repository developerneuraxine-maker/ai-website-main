import { getSupabase, type Database } from "./supabase";

export type ProjectRow = {
  id: string;
  user_id: string | null;
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
  user_id: string | null;
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

  // Reject oversized payloads before decoding (base64 overhead ≈ 4/3×)
  if (input.base64.length > MAX_IMAGE_BYTES * 1.4) {
    throw new Error("Image is too large (max 5MB).");
  }

  // Strip data-URL prefix ("data:image/jpeg;base64,") if the client sent it
  const raw = input.base64.includes(",") ? input.base64.split(",")[1] : input.base64;

  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  } catch {
    throw new Error("Invalid image data. Please try selecting the file again.");
  }

  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 5MB).");
  }

  const supabase = getSupabase();

  // Auto-create bucket if it doesn't exist yet (service-role can always do this)
  await supabase.storage.createBucket("project-images", { public: true }).catch(() => undefined); // silently ignore "already exists" error

  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from("project-images")
    .upload(path, bytes, { contentType: input.contentType, upsert: false });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = supabase.storage.from("project-images").getPublicUrl(path);
  return data.publicUrl;
}

// ---- Projects ----

export async function createProjectRecord(input: {
  userId: string;
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
      user_id: input.userId,
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
    user_id: input.userId,
    label: "Initial generation",
    author: "AI",
    html_snapshot: input.html,
  });

  return projectRow;
}

// getProject does NOT filter by userId — ownership is validated at the server-fn level
// before this is called. This lets admins and the sites/$id route also access projects.
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

export async function listProjects(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select()
    .eq("user_id", userId)
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
  userId?: string,
) {
  const supabase = getSupabase();
  const { error: updateError } = await supabase
    .from("projects")
    .update({ generated_html: newHtml, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (updateError) throw updateError;

  const { error: versionError } = await supabase.from("project_versions").insert({
    project_id: projectId,
    user_id: userId ?? null,
    label: versionLabel,
    author: "AI",
    html_snapshot: newHtml,
  });
  if (versionError) throw versionError;
}

export async function deployProjectRecord(projectId: string, userId: string) {
  const supabase = getSupabase();
  const url = `/sites/${projectId}`;
  const { error: updateError } = await supabase
    .from("projects")
    .update({ status: "live", url })
    .eq("id", projectId)
    .eq("user_id", userId);
  if (updateError) throw updateError;

  const { error: deployError } = await supabase.from("deployments").insert({
    project_id: projectId,
    user_id: userId,
    env: "production",
    status: "success",
    target: "lumen",
    commit_message: "Manual deploy",
  });
  if (deployError) throw deployError;

  return url;
}

// ---- Trash ----

export async function listTrashedProjects(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select()
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return data as ProjectRow[];
}

export async function softDeleteProject(id: string, userId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function restoreProject(id: string, userId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: null })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteProjectForever(id: string, userId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

// ---- Settings ----

export type SettingsRow = Database["public"]["Tables"]["settings"]["Row"];

const DEFAULT_SETTINGS = {
  dark_mode: true,
  reduce_motion: false,
  compact_density: false,
  autosave: true,
  show_grid: false,
  format_on_save: true,
  email_on_deploy_fail: true,
  weekly_digest: false,
};

export async function getSettings(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("settings").select().eq("user_id", userId).single();

  if (error?.code === "PGRST116") {
    // No row yet — create defaults for this user
    const { data: newRow, error: insertError } = await supabase
      .from("settings")
      .insert({ user_id: userId, ...DEFAULT_SETTINGS })
      .select()
      .single();
    if (insertError) throw insertError;
    return newRow as SettingsRow;
  }
  if (error) throw error;
  return data as SettingsRow;
}

export async function updateSettings(
  userId: string,
  patch: Partial<Omit<SettingsRow, "id" | "user_id">>,
) {
  const supabase = getSupabase();
  const { error } = await supabase.from("settings").update(patch).eq("user_id", userId);
  if (error) throw error;
}

// ---- Profile ----

export type ProfileRow = Database["public"]["Tables"]["profile"]["Row"];

export async function getProfile(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("profile").select().eq("user_id", userId).single();

  if (error?.code === "PGRST116") {
    const { data: newRow, error: insertError } = await supabase
      .from("profile")
      .insert({
        user_id: userId,
        full_name: "",
        email: "",
        username: "",
        role: "",
        bio: "",
      })
      .select()
      .single();
    if (insertError) throw insertError;
    return newRow as ProfileRow;
  }
  if (error) throw error;
  return data as ProfileRow;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Omit<ProfileRow, "id" | "user_id">>,
) {
  const supabase = getSupabase();
  const { error } = await supabase.from("profile").update(patch).eq("user_id", userId);
  if (error) throw error;
}

// ---- API keys ----

export type ApiKeyRow = Database["public"]["Tables"]["api_keys"]["Row"];

export async function listApiKeys(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("api_keys")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as ApiKeyRow[];
}

export async function createApiKey(userId: string, label: string) {
  const supabase = getSupabase();
  const key_value = `k_live_${crypto.randomUUID().replace(/-/g, "")}`;
  const { data, error } = await supabase
    .from("api_keys")
    .insert({ user_id: userId, label, key_value })
    .select()
    .single();
  if (error) throw error;
  return data as ApiKeyRow;
}

export async function deleteApiKey(id: string, userId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("api_keys").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

// ---- Workspace members ----

export type WorkspaceMemberRow = Database["public"]["Tables"]["workspace_members"]["Row"];

export async function listWorkspaceMembers(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("workspace_members")
    .select()
    .eq("user_id", userId)
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

export async function addWorkspaceMember(
  userId: string,
  input: { name: string; email: string; role: "Owner" | "Editor" | "Viewer" },
) {
  const supabase = getSupabase();
  const avatar_gradient = MEMBER_GRADIENTS[Math.floor(Math.random() * MEMBER_GRADIENTS.length)];
  const { data, error } = await supabase
    .from("workspace_members")
    .insert({ user_id: userId, ...input, avatar_gradient })
    .select()
    .single();
  if (error) throw error;
  return data as WorkspaceMemberRow;
}

export async function removeWorkspaceMember(id: string, userId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ---- Deployments ----

export type DeploymentRow = Database["public"]["Tables"]["deployments"]["Row"];
export type DeploymentWithProject = DeploymentRow & { project_name: string };

export async function listDeployments(userId: string): Promise<DeploymentWithProject[]> {
  const supabase = getSupabase();
  const { data: deployments, error } = await supabase
    .from("deployments")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const projectIds = [...new Set((deployments as DeploymentRow[]).map((d) => d.project_id))];
  const nameById = await projectNameMap(projectIds);

  return (deployments as DeploymentRow[]).map((d) => ({
    ...d,
    project_name: nameById.get(d.project_id) ?? "Unknown",
  }));
}

// ---- Version history ----

export type VersionWithProject = ProjectVersionRow & { project_name: string };

export async function listAllVersions(userId: string): Promise<VersionWithProject[]> {
  const supabase = getSupabase();

  // Get user's owned projects first, then query only those versions in DB
  const { data: userProjects } = await supabase
    .from("projects")
    .select("id,name")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (!userProjects || userProjects.length === 0) return [];

  const ownedIds = userProjects.map((p) => p.id);
  const nameById = new Map(userProjects.map((p) => [p.id, p.name]));

  const { data: versions, error } = await supabase
    .from("project_versions")
    .select()
    .in("project_id", ownedIds)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return (versions as ProjectVersionRow[]).map((v) => ({
    ...v,
    project_name: nameById.get(v.project_id) ?? "Unknown",
  }));
}

export async function restoreVersion(versionId: string, userId: string) {
  const supabase = getSupabase();
  const { data: version, error } = await supabase
    .from("project_versions")
    .select()
    .eq("id", versionId)
    .single();
  if (error) throw new Error("Version not found");
  const row = version as ProjectVersionRow;

  // Verify the version's project belongs to the requesting user
  const project = await getProject(row.project_id);
  if (!project || (project.user_id !== null && project.user_id !== userId)) {
    throw new Error("Version not found");
  }

  await reviseProjectRecord(row.project_id, row.html_snapshot, `Restored: ${row.label}`, userId);
}

async function projectNameMap(projectIds: string[]) {
  if (projectIds.length === 0) return new Map<string, string>();
  const supabase = getSupabase();
  const { data: projects } = await supabase.from("projects").select("id,name").in("id", projectIds);
  return new Map((projects ?? []).map((p) => [p.id, p.name]));
}

// ---- Dashboard stats (per-user) ----

export type DashboardStats = {
  projects: number;
  deployments: number;
  visits: number;
  statusCounts: Record<"live" | "draft" | "building" | "error", number>;
};

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const supabase = getSupabase();
  const [projectCountRes, deploymentCountRes, projectsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null),
    supabase.from("deployments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("projects").select("visits,status").eq("user_id", userId).is("deleted_at", null),
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

// ---- Admin functions (no user_id filter — service-role bypasses RLS) ----

export type AdminStats = {
  totalUsers: number;
  totalProjects: number;
  totalDeployments: number;
  totalVisits: number;
};

export async function adminGetStats(): Promise<AdminStats> {
  const supabase = getSupabase();
  const [users, projects, deployments, visitsRes] = await Promise.all([
    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("deployments").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("visits").is("deleted_at", null),
  ]);
  const totalVisits = (visitsRes.data ?? []).reduce((s, p) => s + (p.visits ?? 0), 0);
  return {
    totalUsers: users.count ?? 0,
    totalProjects: projects.count ?? 0,
    totalDeployments: deployments.count ?? 0,
    totalVisits,
  };
}

export type AdminUser = {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  project_count: number;
  plan_type?: "free" | "paid";
  daily_cost_usd?: number;
  suspended_at?: string | null;
  suspended_reason?: string | null;
};

export async function adminListUsers(): Promise<AdminUser[]> {
  const supabase = getSupabase();
  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select()
    .order("created_at", { ascending: false });
  if (error) throw error;

  // Count projects per user
  const ids = (profiles ?? []).map((p) => p.id);
  const { data: projectCounts } = await supabase
    .from("projects")
    .select("user_id")
    .in("user_id", ids)
    .is("deleted_at", null);

  const countMap = new Map<string, number>();
  for (const row of projectCounts ?? []) {
    countMap.set(row.user_id!, (countMap.get(row.user_id!) ?? 0) + 1);
  }

  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email ?? "",
    is_admin: p.is_admin,
    created_at: p.created_at,
    project_count: countMap.get(p.id) ?? 0,
  }));
}

export type AdminProject = ProjectRow & { user_email: string };

export async function adminListProjects(): Promise<AdminProject[]> {
  const supabase = getSupabase();
  const { data: projects, error } = await supabase
    .from("projects")
    .select()
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  const userIds = [...new Set((projects ?? []).map((p) => p.user_id).filter(Boolean))] as string[];
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id,email")
    .in("id", userIds);
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email ?? ""]));

  return (projects as ProjectRow[]).map((p) => ({
    ...p,
    user_email: emailById.get(p.user_id ?? "") ?? "—",
  }));
}

export async function adminToggleAdmin(userId: string, isAdmin: boolean) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("user_profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId);
  if (error) throw error;
}

export async function adminSuspendUser(userId: string, reason: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("user_profiles")
    .update({
      suspended_at: new Date().toISOString(),
      suspended_reason: reason || "Suspended by admin",
    })
    .eq("id", userId);
  if (error) throw error;
}

export async function adminUnsuspendUser(userId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("user_profiles")
    .update({ suspended_at: null, suspended_reason: null })
    .eq("id", userId);
  if (error) throw error;
}

export type AdminRevenueStats = {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  mrrInr: number;
  totalAiCostUsd: number;
  totalProjects: number;
  totalDeployments: number;
  totalVisits: number;
};

export async function adminGetRevenueStats(): Promise<AdminRevenueStats> {
  const supabase = getSupabase();
  const [profiles, projects, deployments, visitsRes] = await Promise.all([
    supabase.from("user_profiles").select("id,plan_type,daily_cost_usd"),
    supabase.from("projects").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("deployments").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("visits").is("deleted_at", null),
  ]);
  const rows = profiles.data ?? [];
  const proUsers = rows.filter((r) => r.plan_type === "paid").length;
  const totalAiCostUsd = rows.reduce((s, r) => s + (r.daily_cost_usd ?? 0), 0);
  const totalVisits = (visitsRes.data ?? []).reduce((s, p) => s + (p.visits ?? 0), 0);
  return {
    totalUsers: rows.length,
    proUsers,
    freeUsers: rows.length - proUsers,
    mrrInr: proUsers * 500,
    totalAiCostUsd: Math.round(totalAiCostUsd * 100) / 100,
    totalProjects: projects.count ?? 0,
    totalDeployments: deployments.count ?? 0,
    totalVisits,
  };
}

export type AdminUserDetail = AdminUser & {
  plan_type: "free" | "paid";
  daily_cost_usd: number;
  suspended_at: string | null;
  suspended_reason: string | null;
  projects: { id: string; name: string; status: string; created_at: string }[];
};

export async function adminListUsersDetailed(): Promise<AdminUserDetail[]> {
  const supabase = getSupabase();
  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select()
    .order("created_at", { ascending: false });
  if (error) throw error;

  const ids = (profiles ?? []).map((p) => p.id);
  const { data: projectRows } = await supabase
    .from("projects")
    .select("user_id,id,name,status,created_at")
    .in("user_id", ids)
    .is("deleted_at", null);

  const projectsByUser = new Map<
    string,
    { id: string; name: string; status: string; created_at: string }[]
  >();
  for (const p of projectRows ?? []) {
    if (!p.user_id) continue;
    const list = projectsByUser.get(p.user_id) ?? [];
    list.push({ id: p.id, name: p.name, status: p.status, created_at: p.created_at });
    projectsByUser.set(p.user_id, list);
  }

  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email ?? "",
    is_admin: p.is_admin,
    created_at: p.created_at,
    plan_type: p.plan_type ?? "free",
    daily_cost_usd: p.daily_cost_usd ?? 0,
    suspended_at: p.suspended_at ?? null,
    suspended_reason: p.suspended_reason ?? null,
    project_count: (projectsByUser.get(p.id) ?? []).length,
    projects: (projectsByUser.get(p.id) ?? []).slice(0, 5),
  }));
}

// ---- Connectors ----

export type ConnectorRow = {
  id: string;
  user_id: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  metadata: Record<string, string>;
  connected_at: string;
};

export async function listConnectors(userId: string): Promise<ConnectorRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("connectors").select().eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as ConnectorRow[];
}

export async function upsertConnector(
  userId: string,
  provider: string,
  accessToken: string,
  metadata: Record<string, string> = {},
  refreshToken?: string,
  expiresAt?: string,
) {
  const supabase = getSupabase();
  const { error } = await supabase.from("connectors").upsert(
    {
      user_id: userId,
      provider,
      access_token: accessToken,
      refresh_token: refreshToken ?? null,
      token_expires_at: expiresAt ?? null,
      metadata,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw error;
}

export async function deleteConnector(userId: string, provider: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("connectors")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) throw error;
}

// ---- Plans & monthly usage ----

export const PLAN_MONTHLY_LIMIT_USD = {
  free: 0.1, // $0.10/month (~1-2 free generations to try the product)
  paid: 2.0, // $2.00/month for Pro plan (₹500/month)
} as const;

// Keep old name as alias so no other file needs changes
export const PLAN_DAILY_LIMIT_USD = PLAN_MONTHLY_LIMIT_USD;

export type PlanType = "free" | "paid";

export type UserPlan = {
  plan_type: PlanType;
  plan_expires_at: string | null;
  daily_cost_usd: number;
  daily_limit_usd: number;
  usage_pct: number; // 0–100
  limit_reached: boolean;
  is_paid_active: boolean;
};

// Returns "YYYY-MM" — used to detect a new month and reset usage
function currentMonthStr() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

export async function getUserPlan(userId: string): Promise<UserPlan> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("plan_type,plan_expires_at,daily_cost_usd,daily_reset_date")
    .eq("id", userId)
    .single();
  if (error) throw error;

  const thisMonth = currentMonthStr();
  let monthlyCost = data.daily_cost_usd ?? 0;

  // Reset counter when a new month starts (daily_reset_date stores YYYY-MM-DD or YYYY-MM)
  if ((data.daily_reset_date ?? "").slice(0, 7) < thisMonth) {
    await supabase
      .from("user_profiles")
      .update({ daily_cost_usd: 0, daily_reset_date: thisMonth })
      .eq("id", userId);
    monthlyCost = 0;
  }

  const isPaidActive =
    data.plan_type === "paid" &&
    (!data.plan_expires_at || new Date(data.plan_expires_at) > new Date());

  const effectivePlan: PlanType = isPaidActive ? "paid" : "free";
  const limit = PLAN_MONTHLY_LIMIT_USD[effectivePlan];
  // Use Math.ceil for non-zero usage so even tiny costs show as at least 1%
  const rawPct = (monthlyCost / limit) * 100;
  const usagePct = monthlyCost > 0 ? Math.min(100, Math.max(1, Math.ceil(rawPct))) : 0;

  return {
    plan_type: effectivePlan,
    plan_expires_at: data.plan_expires_at,
    daily_cost_usd: monthlyCost,
    daily_limit_usd: limit,
    usage_pct: usagePct,
    limit_reached: monthlyCost >= limit,
    is_paid_active: isPaidActive,
  };
}

// Step 1: Check limit BEFORE the OpenAI call (throws immediately if at limit).
export async function checkDailyLimit(userId: string): Promise<{
  currentCost: number;
  limit: number;
  isPaidActive: boolean;
}> {
  const supabase = getSupabase();
  const thisMonth = currentMonthStr();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("plan_type,plan_expires_at,daily_cost_usd,daily_reset_date")
    .eq("id", userId)
    .single();
  if (error) throw error;

  let currentCost = data.daily_cost_usd ?? 0;
  if ((data.daily_reset_date ?? "").slice(0, 7) < thisMonth) {
    currentCost = 0;
    await supabase
      .from("user_profiles")
      .update({ daily_cost_usd: 0, daily_reset_date: thisMonth })
      .eq("id", userId);
  }

  const isPaidActive =
    data.plan_type === "paid" &&
    (!data.plan_expires_at || new Date(data.plan_expires_at) > new Date());
  const limit = PLAN_MONTHLY_LIMIT_USD[isPaidActive ? "paid" : "free"];

  if (currentCost >= limit) {
    const planName = isPaidActive ? "Pro" : "Free";
    const hint = isPaidActive
      ? "Your monthly limit resets on the 1st of next month."
      : "Upgrade to Pro for more, or wait until next month for the free limit to reset.";
    throw new Error(`You've reached this month's ${planName} plan usage limit. ${hint}`);
  }

  return { currentCost, limit, isPaidActive };
}

// Step 2: Record the actual cost AFTER the OpenAI call succeeds.
export async function recordDailyUsage(userId: string, costUsd: number): Promise<void> {
  const supabase = getSupabase();
  const thisMonth = currentMonthStr();

  const { data, error: fetchError } = await supabase
    .from("user_profiles")
    .select("daily_cost_usd,daily_reset_date")
    .eq("id", userId)
    .single();

  if (fetchError) throw new Error(`Failed to fetch usage for user ${userId}: ${fetchError.message}`);

  const currentCost =
    (data?.daily_reset_date ?? "").slice(0, 7) < thisMonth ? 0 : (data?.daily_cost_usd ?? 0);

  // Enforce a minimum per-generation cost so the bar always moves visibly
  const effectiveCost = Math.max(costUsd, 0.001);

  const { error: updateError } = await supabase
    .from("user_profiles")
    .update({ daily_cost_usd: currentCost + effectiveCost, daily_reset_date: thisMonth })
    .eq("id", userId);

  if (updateError)
    throw new Error(`Failed to record usage for user ${userId}: ${updateError.message}`);
}

export async function upgradeToPaid(userId: string, razorpayOrderId: string): Promise<void> {
  const supabase = getSupabase();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  const { error } = await supabase
    .from("user_profiles")
    .update({
      plan_type: "paid",
      plan_expires_at: expiresAt,
      razorpay_order_id: razorpayOrderId,
    })
    .eq("id", userId);
  if (error) throw error;
}
