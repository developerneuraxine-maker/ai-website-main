import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fetchAdminUsers, toggleAdminRole } from "@/server-fns/admin";
import { ShieldCheck, ShieldOff, User } from "lucide-react";
import type { AdminUser } from "@/lib/db";

export const Route = createFileRoute("/admin/users")({
  loader: async () => fetchAdminUsers(),
  head: () => ({ meta: [{ title: "Users · Admin · Lumen" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const initial = Route.useLoaderData();
  const [users, setUsers] = useState<AdminUser[]>(initial);
  const [toggling, setToggling] = useState<string | null>(null);

  const toggle = async (u: AdminUser) => {
    setToggling(u.id);
    try {
      await toggleAdminRole({ data: { userId: u.id, isAdmin: !u.is_admin } });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_admin: !u.is_admin } : x)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed.");
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Admin
        </div>
        <h1 className="font-display text-3xl">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">{users.length} registered accounts</p>
      </div>

      <div className="panel mt-8 p-0">
        <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-b border-border bg-surface/60 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div />
          <div>Email</div>
          <div>Projects</div>
          <div>Role</div>
        </div>

        {users.map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-b border-border/60 px-5 py-4 text-sm last:border-0 hover:bg-surface/40"
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium">{u.email || "—"}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Joined {new Date(u.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="text-muted-foreground">{u.project_count}</div>
            <button
              onClick={() => toggle(u)}
              disabled={toggling === u.id}
              title={u.is_admin ? "Remove admin" : "Make admin"}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition disabled:opacity-50 ${
                u.is_admin
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
          </div>
        ))}

        {users.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No users yet.</div>
        )}
      </div>
    </div>
  );
}
