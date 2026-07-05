import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fetchBroadcasts, createBroadcast, deleteBroadcast } from "@/server-fns/admin";
import { Megaphone, Trash2, Plus, X, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Announcement } from "@/lib/db";

export const Route = createFileRoute("/admin/announcements")({
  loader: async () => fetchBroadcasts(),
  head: () => ({ meta: [{ title: "Announcements · Admin · Lumen" }] }),
  component: AdminAnnouncements,
});

const TYPE_CONFIG = {
  info: { label: "Info", icon: Info, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/30" },
  warning: { label: "Warning", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  success: { label: "Success", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
};

function AnnouncementBadge({ type }: { type: "info" | "warning" | "success" }) {
  const cfg = TYPE_CONFIG[type];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <cfg.icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function AdminAnnouncements() {
  const initial = Route.useLoaderData();
  const [items, setItems] = useState<Announcement[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "warning" | "success">("info");
  const [expiresIn, setExpiresIn] = useState<"never" | "1d" | "3d" | "7d">("never");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const expiresAt =
        expiresIn === "never"
          ? null
          : new Date(
              Date.now() +
                (expiresIn === "1d" ? 1 : expiresIn === "3d" ? 3 : 7) * 24 * 60 * 60 * 1000,
            ).toISOString();
      const created = await createBroadcast({ data: { message: message.trim(), type, expiresAt } });
      setItems((prev) => [created, ...prev]);
      setMessage("");
      setShowForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    setDeleting(id);
    try {
      await deleteBroadcast({ data: { id } });
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed.");
    } finally {
      setDeleting(null);
    }
  };

  const isExpired = (a: Announcement) =>
    a.expires_at !== null && new Date(a.expires_at) < new Date();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Admin</div>
          <h1 className="font-display text-3xl">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Broadcast banners shown to all users when they open the app.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New announcement"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="panel mt-6 p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            New announcement
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. We're upgrading servers tonight at 10pm IST. Brief downtime expected."
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <div className="mt-3 flex flex-wrap gap-4">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Type
              </label>
              <div className="flex gap-2">
                {(["info", "warning", "success"] as const).map((t) => {
                  const cfg = TYPE_CONFIG[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                        type === t
                          ? `${cfg.color} ${cfg.bg} ${cfg.border}`
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <cfg.icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Expires
              </label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value as typeof expiresIn)}
                className="h-8 rounded-lg border border-border bg-surface px-2 text-sm outline-none"
              >
                <option value="never">Never</option>
                <option value="1d">After 1 day</option>
                <option value="3d">After 3 days</option>
                <option value="7d">After 7 days</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          {message.trim() && (
            <div className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${TYPE_CONFIG[type].bg} ${TYPE_CONFIG[type].border} ${TYPE_CONFIG[type].color}`}>
              {(() => { const Icon = TYPE_CONFIG[type].icon; return <Icon className="mt-0.5 h-4 w-4 shrink-0" />; })()}
              <span>{message}</span>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => void handleCreate()}
              disabled={!message.trim() || submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? "Publishing…" : "Publish announcement"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="mt-6 space-y-3">
        {items.length === 0 && (
          <div className="panel px-5 py-10 text-center text-sm text-muted-foreground">
            <Megaphone className="mx-auto mb-3 h-8 w-8 opacity-30" />
            No announcements yet. Create one to broadcast a message to all users.
          </div>
        )}
        {items.map((a) => {
          const cfg = TYPE_CONFIG[a.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.info;
          const expired = isExpired(a);
          return (
            <div key={a.id} className={`panel p-4 ${expired ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 shrink-0 rounded-lg p-2 ${cfg.bg} ${cfg.color}`}>
                  <cfg.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <AnnouncementBadge type={a.type as "info" | "warning" | "success"} />
                    {expired && (
                      <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                        Expired
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                    {a.expires_at && !expired && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        · expires {new Date(a.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm">{a.message}</p>
                </div>
                <button
                  onClick={() => void handleDelete(a.id)}
                  disabled={deleting === a.id}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-red-400 disabled:opacity-40 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
