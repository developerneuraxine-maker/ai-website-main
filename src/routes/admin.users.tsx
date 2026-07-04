import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  fetchAdminUsersDetailed,
  toggleAdminRole,
  suspendUser,
  unsuspendUser,
} from "@/server-fns/admin";
import {
  ShieldCheck,
  ShieldOff,
  User,
  Ban,
  CheckCircle,
  X,
  Download,
  Search,
  ChevronRight,
} from "lucide-react";
import type { AdminUserDetail } from "@/lib/db";

export const Route = createFileRoute("/admin/users")({
  loader: async () => fetchAdminUsersDetailed(),
  head: () => ({ meta: [{ title: "Users · Admin · Lumen" }] }),
  component: AdminUsers,
});

function planBadge(plan: "free" | "paid") {
  return plan === "paid" ? (
    <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-500">
      Pro
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      Free
    </span>
  );
}

function UserDetailModal({ user, onClose }: { user: AdminUserDetail; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="panel w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium">{user.email || "—"}</div>
              <div className="flex items-center gap-2 mt-0.5">
                {planBadge(user.plan_type ?? "free")}
                {user.is_admin && (
                  <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-amber-500">
                    Admin
                  </span>
                )}
                {user.suspended_at && (
                  <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-red-500">
                    Suspended
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Details */}
        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Joined
              </div>
              <div className="mt-1">{new Date(user.created_at).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                AI Cost (month)
              </div>
              <div className="mt-1">${(user.daily_cost_usd ?? 0).toFixed(4)}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Projects
              </div>
              <div className="mt-1">{user.project_count}</div>
            </div>
            {user.suspended_at && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Suspended
                </div>
                <div className="mt-1 text-red-400 text-xs">
                  {new Date(user.suspended_at).toLocaleDateString()}
                  {user.suspended_reason && ` · ${user.suspended_reason}`}
                </div>
              </div>
            )}
          </div>

          {/* Recent projects */}
          {user.projects.length > 0 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Recent projects
              </div>
              <div className="space-y-1">
                {user.projects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-surface/60 px-3 py-2 text-xs"
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span
                      className={`ml-2 shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${p.status === "live"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : p.status === "error"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-surface text-muted-foreground"
                        }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SuspendModal({
  user,
  onConfirm,
  onClose,
}: {
  user: AdminUserDetail;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="panel w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-lg">Suspend user</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Suspending <span className="font-medium text-foreground">{user.email}</span> will block
            their access until unsuspended.
          </p>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
              Reason (optional)
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. TOS violation"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(reason)}
              className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
            >
              Suspend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminUsers() {
  const initial = Route.useLoaderData();
  const [users, setUsers] = useState<AdminUserDetail[]>(initial);
  const [search, setSearch] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserDetail | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUserDetail | null>(null);

  const filtered = users.filter(
    (u) =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = async (u: AdminUserDetail) => {
    setWorking(u.id + ":admin");
    try {
      await toggleAdminRole({ data: { userId: u.id, isAdmin: !u.is_admin } });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_admin: !u.is_admin } : x)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed.");
    } finally {
      setWorking(null);
    }
  };

  const doSuspend = async (reason: string) => {
    if (!suspendTarget) return;
    const userId = suspendTarget.id;
    setSuspendTarget(null);
    setWorking(userId + ":suspend");
    try {
      await suspendUser({ data: { userId, reason } });
      setUsers((prev) =>
        prev.map((x) =>
          x.id === userId
            ? { ...x, suspended_at: new Date().toISOString(), suspended_reason: reason }
            : x,
        ),
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed.");
    } finally {
      setWorking(null);
    }
  };

  const doUnsuspend = async (u: AdminUserDetail) => {
    setWorking(u.id + ":suspend");
    try {
      await unsuspendUser({ data: { userId: u.id } });
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, suspended_at: null, suspended_reason: null } : x,
        ),
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed.");
    } finally {
      setWorking(null);
    }
  };

  const exportCsv = () => {
    const header = "email,plan,joined,projects,ai_cost_usd,is_admin,suspended\n";
    const rows = users
      .map((u) =>
        [
          u.email,
          u.plan_type ?? "free",
          new Date(u.created_at).toLocaleDateString(),
          u.project_count,
          (u.daily_cost_usd ?? 0).toFixed(4),
          u.is_admin ? "yes" : "no",
          u.suspended_at ? "yes" : "no",
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumen-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {detailUser && (
        <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} />
      )}
      {suspendTarget && (
        <SuspendModal
          user={suspendTarget}
          onConfirm={doSuspend}
          onClose={() => setSuspendTarget(null)}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Admin
          </div>
          <h1 className="font-display text-3xl">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">{users.length} registered accounts</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-surface/80"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or ID…"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="panel mt-4 p-0">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-center gap-3 border-b border-border bg-surface/60 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div />
          <div>Email</div>
          <div>Plan</div>
          <div>Projects</div>
          <div>AI Cost</div>
          <div>Role</div>
          <div>Actions</div>
        </div>

        {filtered.map((u) => (
          <div
            key={u.id}
            className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-center gap-3 border-b border-border/60 px-5 py-4 text-sm last:border-0 hover:bg-surface/40 ${u.suspended_at ? "opacity-60" : ""}`}
          >
            {/* Avatar */}
            <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>

            {/* Email + joined */}
            <button
              className="min-w-0 text-left"
              onClick={() => setDetailUser(u)}
            >
              <div className="flex items-center gap-1.5">
                <span className="truncate font-medium hover:text-primary transition-colors">
                  {u.email || "—"}
                </span>
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {new Date(u.created_at).toLocaleDateString()}
                {u.suspended_at && (
                  <span className="ml-2 text-red-400">· suspended</span>
                )}
              </div>
            </button>

            {/* Plan */}
            <div>{planBadge(u.plan_type ?? "free")}</div>

            {/* Projects */}
            <div className="text-center text-muted-foreground">{u.project_count}</div>

            {/* AI Cost */}
            <div className="font-mono text-xs text-muted-foreground">
              ${(u.daily_cost_usd ?? 0).toFixed(3)}
            </div>

            {/* Admin toggle */}
            <button
              onClick={() => toggle(u)}
              disabled={working === u.id + ":admin"}
              title={u.is_admin ? "Remove admin" : "Make admin"}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition disabled:opacity-50 ${u.is_admin
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}
            >
              {u.is_admin ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" /> Admin
                </>
              ) : (
                <>
                  <ShieldOff className="h-3.5 w-3.5" /> User
                </>
              )}
            </button>

            {/* Suspend / Unsuspend */}
            <button
              onClick={() => (u.suspended_at ? doUnsuspend(u) : setSuspendTarget(u))}
              disabled={working === u.id + ":suspend"}
              title={u.suspended_at ? "Unsuspend" : "Suspend"}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition disabled:opacity-50 ${u.suspended_at
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                  : "border-border bg-surface text-muted-foreground hover:border-red-500/40 hover:text-red-400"
                }`}
            >
              {u.suspended_at ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5" /> Restore
                </>
              ) : (
                <>
                  <Ban className="h-3.5 w-3.5" /> Suspend
                </>
              )}
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            {search ? "No users match your search." : "No users yet."}
          </div>
        )}
      </div>
    </div>
  );
}
