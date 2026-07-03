import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Send,
  Copy,
  Rocket,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Code2,
  Eye,
  ExternalLink,
  Triangle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Chip } from "@/components/ui-bits";
import { fetchProjectDetail, reviseProject, deployProject } from "@/server-fns/projects";
import { fetchConnectors, deployToVercel } from "@/server-fns/connectors";
import type { ProjectMessageRow, ProjectRow } from "@/lib/db";

export const Route = createFileRoute("/_app/projects/$id")({
  loader: async ({ params }) => {
    const [result, connectors] = await Promise.all([
      fetchProjectDetail({ data: { id: params.id } }),
      fetchConnectors().catch(() => []),
    ]);
    if (!result) throw notFound();
    return { ...result, connectors };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.project.name ?? "Project"} · Lumen` }],
  }),
  component: Editor,
  notFoundComponent: () => (
    <div className="grid min-h-[60vh] place-items-center p-10">
      <div className="text-center">
        <h1 className="font-display text-3xl">Project not found</h1>
        <Link to="/projects" className="mt-4 inline-block text-primary hover:underline">
          ← All projects
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="grid min-h-[60vh] place-items-center p-10">
      <div className="text-center">
        <h1 className="font-display text-3xl">Couldn't open the project</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  ),
});

type Msg = { who: "you" | "ai"; text: string; working?: boolean };

function toMsg(row: ProjectMessageRow): Msg {
  return { who: row.who, text: row.text };
}

function Editor() {
  const { project: initialProject, messages: initialMessages, connectors } = Route.useLoaderData();
  const [project, setProject] = useState<ProjectRow>(initialProject);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [mode, setMode] = useState<"preview" | "code">("preview");
  const [messages, setMessages] = useState<Msg[]>(initialMessages.map(toMsg));
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [vercelDeploying, setVercelDeploying] = useState(false);
  const [vercelResult, setVercelResult] = useState<{ url: string } | { error: string } | null>(null);

  const hasVercel = connectors.some((c) => c.provider === "vercel");

  const send = async () => {
    if (!draft.trim() || sending) return;
    const instruction = draft;
    setDraft("");
    setSending(true);
    setMessages((m) => [
      ...m,
      { who: "you", text: instruction },
      { who: "ai", text: "Working on it…", working: true },
    ]);
    try {
      const { html, aiReply } = await reviseProject({ data: { id: project.id, instruction } });
      setProject((p) => ({ ...p, generated_html: html }));
      setMessages((m) => [...m.slice(0, -1), { who: "ai", text: aiReply }]);
    } catch {
      setMessages((m) => [
        ...m.slice(0, -1),
        { who: "ai", text: "Something went wrong applying that change. Try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const deploy = async () => {
    if (deploying) return;
    setDeploying(true);
    try {
      const { url } = await deployProject({ data: { id: project.id } });
      setProject((p) => ({ ...p, status: "live", url }));
    } finally {
      setDeploying(false);
    }
  };

  const deployViaVercel = async () => {
    if (vercelDeploying) return;
    setVercelDeploying(true);
    setVercelResult(null);
    try {
      const res = await deployToVercel({ data: { projectId: project.id } });
      if (res.ok) {
        setVercelResult({ url: res.url });
      } else {
        setVercelResult({ error: res.error });
      }
    } catch (e) {
      setVercelResult({ error: e instanceof Error ? e.message : "Deployment failed." });
    } finally {
      setVercelDeploying(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Project header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3">
        <Link
          to="/projects"
          className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface hover:border-foreground/40"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
        <div className={`h-8 w-8 shrink-0 rounded-md bg-gradient-to-br ${project.thumbnail}`} />
        <div className="min-w-0">
          <div className="truncate font-display text-lg leading-tight">{project.name}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {project.category} · {project.url ?? "not deployed"}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs hover:border-foreground/40"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
          )}

          {/* Deploy to Vercel button — only when Vercel connector is active */}
          {hasVercel && (
            <button
              onClick={deployViaVercel}
              disabled={vercelDeploying}
              className="inline-flex items-center gap-1.5 rounded-full border border-black bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              title="Deploy to Vercel"
            >
              <Triangle className="h-3 w-3 fill-white" />
              {vercelDeploying ? "Deploying…" : "Deploy to Vercel"}
            </button>
          )}

          <button
            onClick={deploy}
            disabled={deploying}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Rocket className="h-3.5 w-3.5" /> {deploying ? "Deploying…" : "Deploy"}
          </button>
        </div>
      </div>

      {/* Vercel deploy result banner */}
      {vercelResult && (
        <div className={`flex items-center gap-3 border-b px-4 py-2.5 text-sm ${
          "url" in vercelResult
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            : "border-red-500/20 bg-red-500/10 text-red-400"
        }`}>
          {"url" in vercelResult ? (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Deployed to Vercel!</span>
              <a
                href={vercelResult.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-medium underline underline-offset-2"
              >
                {vercelResult.url} <ExternalLink className="h-3 w-3" />
              </a>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 shrink-0" />
              {vercelResult.error}
            </>
          )}
          <button
            onClick={() => setVercelResult(null)}
            className="ml-auto text-current opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Split */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[380px_1fr]">
        {/* Chat */}
        <aside className="flex min-h-0 flex-col border-r border-border/60">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="font-display text-lg">Conversation</div>
            <Chip tone="primary">
              <span className="size-1.5 rounded-full bg-primary" /> Live
            </Chip>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {messages.map((m, i) => (
              <div key={i} className="flex gap-3">
                <div
                  className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md font-mono text-[10px] ${m.who === "ai" ? "bg-primary text-primary-foreground" : "border border-border bg-surface"}`}
                >
                  {m.who === "ai" ? "AI" : "U"}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                    {m.text}
                    {m.working && (
                      <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    )}
                  </div>
                  {m.who === "ai" && !m.working && (
                    <div className="flex gap-1.5 text-[11px] text-muted-foreground">
                      <button
                        onClick={() => navigator.clipboard.writeText(m.text)}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-2 py-0.5 hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border/60 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-elevated p-2 focus-within:border-primary/50">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder="Ask Lumen to change anything…"
                disabled={sending}
                className="min-h-[44px] flex-1 resize-none bg-transparent text-sm outline-none disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={sending}
                className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Make navbar sticky", "Add testimonials", "Dark mode", "Improve SEO"].map((s) => (
                <button
                  key={s}
                  onClick={() => setDraft(s)}
                  className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Preview */}
        <section className="flex min-h-0 flex-col bg-elevated/40">
          <div className="flex items-center gap-2 border-b border-border/60 bg-background/60 px-4 py-2.5">
            <div className="flex rounded-md border border-border bg-surface p-0.5">
              {[
                { id: "preview" as const, icon: Eye, label: "Preview" },
                { id: "code" as const, icon: Code2, label: "Code" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setMode(t.id)}
                  className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs ${mode === t.id ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="flex rounded-md border border-border bg-surface p-0.5">
                {[
                  { id: "desktop" as const, icon: Monitor },
                  { id: "tablet" as const, icon: Tablet },
                  { id: "mobile" as const, icon: Smartphone },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDevice(d.id)}
                    className={`grid h-7 w-7 place-items-center rounded ${device === d.id ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <d.icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  const blob = new Blob([project.generated_html], { type: "text/html" });
                  window.open(URL.createObjectURL(blob), "_blank");
                }}
                className="grid h-7 w-7 place-items-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground"
                title="Open fullscreen in a new tab"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-6">
            {mode === "preview" ? (
              <div
                className="mx-auto h-full"
                style={{
                  maxWidth: device === "desktop" ? "100%" : device === "tablet" ? 820 : 390,
                }}
              >
                <div className="panel h-full overflow-hidden p-0">
                  <iframe
                    key={project.generated_html.length}
                    srcDoc={project.generated_html}
                    title={project.name}
                    sandbox="allow-scripts"
                    className="h-full min-h-[500px] w-full border-0 bg-white"
                  />
                </div>
              </div>
            ) : (
              <div className="panel h-full overflow-hidden p-0">
                <pre className="h-full overflow-auto bg-background p-5 font-mono text-xs leading-relaxed text-foreground/90">
                  {project.generated_html}
                </pre>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
