import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fetchEmailLogs, triggerReminderEmails } from "@/server-fns/admin";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Zap,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import type { EmailLogRow } from "@/lib/db";

export const Route = createFileRoute("/admin/emails")({
  loader: async () => fetchEmailLogs(),
  head: () => ({ meta: [{ title: "Email Logs · Admin · Lumen" }] }),
  component: AdminEmails,
});

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pro_expiring: {
    label: "Pro renewal",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  free_limit_reached: {
    label: "Free limit",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function AdminEmails() {
  const initial = Route.useLoaderData();
  const [logs, setLogs] = useState<EmailLogRow[]>(initial);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ proReminders: number; freeReminders: number; errors: number } | null>(null);

  const sent = logs.filter((l) => l.status === "sent").length;
  const failed = logs.filter((l) => l.status === "failed").length;
  const proCount = logs.filter((l) => l.type === "pro_expiring").length;
  const freeCount = logs.filter((l) => l.type === "free_limit_reached").length;

  const handleTrigger = async () => {
    if (!confirm("Send reminder emails now to all eligible users?")) return;
    setTriggering(true);
    setTriggerResult(null);
    try {
      const result = await triggerReminderEmails();
      setTriggerResult(result);
      // Reload logs after sending
      const updated = await fetchEmailLogs();
      setLogs(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to trigger emails.");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Admin</div>
          <h1 className="font-display text-3xl">Email Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track all reminder emails sent to users. Cron runs daily at 9am UTC.
          </p>
        </div>
        <button
          onClick={() => void handleTrigger()}
          disabled={triggering}
          className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary hover:bg-primary/20 disabled:opacity-50 transition"
        >
          {triggering ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {triggering ? "Sending…" : "Send now (manual trigger)"}
        </button>
      </div>

      {/* Manual trigger result */}
      {triggerResult && (
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-500">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            Done — <strong>{triggerResult.proReminders}</strong> Pro renewal emails,{" "}
            <strong>{triggerResult.freeReminders}</strong> Free upgrade emails sent.
            {triggerResult.errors > 0 && (
              <span className="ml-2 text-red-400">{triggerResult.errors} failed.</span>
            )}
          </span>
        </div>
      )}

      {/* Stats cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total sent", value: sent, icon: Mail, color: "text-primary", bg: "bg-primary/10" },
          { label: "Failed", value: failed, icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Pro renewal", value: proCount, icon: Zap, color: "text-violet-500", bg: "bg-violet-500/10" },
          { label: "Free upgrade", value: freeCount, icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((c) => (
          <div key={c.label} className="panel flex items-center gap-4 p-5">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${c.bg} ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div>
              <div className={`font-display text-2xl ${c.color}`}>{c.value}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Logs table */}
      <div className="panel mt-8 p-0">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-border bg-surface/60 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div>User / Subject</div>
          <div>Type</div>
          <div>Status</div>
          <div>Sent</div>
          <div />
        </div>

        {logs.length === 0 && (
          <div className="px-5 py-10 text-center">
            <Mail className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No emails sent yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The cron job runs daily at 9am UTC, or use the manual trigger above.
            </p>
          </div>
        )}

        {logs.map((log) => {
          const typeInfo = TYPE_LABELS[log.type] ?? { label: log.type, color: "text-muted-foreground", bg: "bg-surface" };
          return (
            <div
              key={log.id}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-border/60 px-5 py-3.5 text-sm last:border-0 hover:bg-surface/40"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{log.email}</div>
                <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{log.subject}</div>
              </div>

              <span className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest ${typeInfo.color} ${typeInfo.bg}`}>
                {typeInfo.label}
              </span>

              <div className="shrink-0">
                {log.status === "sent" ? (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="font-mono text-[10px] uppercase tracking-widest">Sent</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400" title={log.error ?? ""}>
                    <XCircle className="h-3.5 w-3.5" />
                    <span className="font-mono text-[10px] uppercase tracking-widest">Failed</span>
                  </span>
                )}
              </div>

              <div className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {timeAgo(log.sent_at)}
              </div>

              <div className="shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                {new Date(log.sent_at).toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Cron schedule: <code className="rounded bg-surface px-1.5 py-0.5">0 9 * * *</code> (daily at 9:00 AM UTC = 2:30 PM IST)
      </p>
    </div>
  );
}
