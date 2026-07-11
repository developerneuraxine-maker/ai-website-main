import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Send, Copy, Rocket, Monitor, Tablet, Smartphone,
  Maximize2, Code2, Eye, ExternalLink, Triangle, CheckCircle2,
  AlertCircle, Github, PenLine, Save, X, ImageIcon, Loader2,
} from "lucide-react";
import { Chip } from "@/components/ui-bits";
import { UpgradeModal } from "@/components/upgrade-modal";
import { fetchProjectDetail, reviseProject, deployProject, saveProjectHtml } from "@/server-fns/projects";
import { fetchConnectors, deployToVercel, pushToGitHub } from "@/server-fns/connectors";
import { uploadImage } from "@/server-fns/uploads";
import type { ProjectMessageRow, ProjectRow } from "@/lib/db";

function isLimitError(e: unknown) {
  return e instanceof Error && e.message.includes("reached this month's");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ─── Editor injection ────────────────────────────────────────────────────────
// Injected into the iframe when in "Edit" mode.
// Enables: click-to-edit text, click-to-replace images, watermark protection.
const EDITOR_INJECTION = `
<style id="__lmn_s__">
  [data-lmn-text]:hover{outline:2px dashed rgba(124,58,237,.45)!important;cursor:text!important;outline-offset:3px;border-radius:4px}
  [data-lmn-text][contenteditable="true"]{outline:2px solid #7c3aed!important;outline-offset:3px;border-radius:4px;background:rgba(124,58,237,.05)!important}
  [data-lmn-img-el]{cursor:pointer!important;position:relative}
  [data-lmn-img-el]:hover{outline:2px dashed rgba(124,58,237,.5)!important;outline-offset:3px;border-radius:4px}
  [data-lmn-img-el]:hover::before{content:"Click to replace image";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.8);color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;font-family:sans-serif;pointer-events:none;z-index:99999;white-space:nowrap}
</style>
<script id="__lmn_e__">
(function(){
  const TEXT_TAGS=new Set(['P','H1','H2','H3','H4','H5','H6','SPAN','LI','BUTTON','TD','TH','LABEL','STRONG','EM','B','I','SMALL']);
  document.querySelectorAll('*').forEach(function(el){
    var t=(el.innerText||'').toLowerCase();
    if(t.includes('neuraxine')||t.includes('made by')||t.includes('built with lumen')||t.includes('powered by lumen'))el.setAttribute('data-lmn-prot','1');
    if(el.tagName==='A'&&(el.getAttribute('href')||'').toLowerCase().includes('neuraxine'))el.setAttribute('data-lmn-prot','1');
  });
  document.querySelectorAll('img').forEach(function(img,i){
    if(!img.closest('[data-lmn-prot]')){img.setAttribute('data-lmn-img',String(i));img.setAttribute('data-lmn-img-el','1');}
  });
  document.addEventListener('click',function(e){
    var el=e.target;
    if(el.closest('[data-lmn-prot]')){e.preventDefault();e.stopPropagation();return;}
    if(el.hasAttribute('data-lmn-img')||el.closest('[data-lmn-img]')){
      var img=el.hasAttribute('data-lmn-img')?el:el.closest('[data-lmn-img]');
      e.preventDefault();e.stopPropagation();
      window.parent.postMessage({type:'LMN_IMG',idx:img.getAttribute('data-lmn-img')},'*');
      return;
    }
    if(TEXT_TAGS.has(el.tagName)&&!el.closest('[data-lmn-prot]')){
      var hasText=Array.from(el.childNodes).some(function(n){return n.nodeType===3&&n.textContent.trim();});
      if(hasText||(el.textContent.trim().length>0&&el.textContent.trim().length<400)){
        el.setAttribute('data-lmn-text','1');el.contentEditable='true';el.focus();e.stopPropagation();
      }
    }
  },true);
  document.addEventListener('blur',function(e){
    var el=e.target;
    if(el.contentEditable==='true'){el.contentEditable='false';el.removeAttribute('data-lmn-text');}
  },true);
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&document.activeElement&&document.activeElement.contentEditable==='true')document.activeElement.blur();
  });
  window.addEventListener('message',function(e){
    if(!e.data||!e.data.type)return;
    if(e.data.type==='LMN_GET'){
      document.querySelectorAll('[contenteditable="true"]').forEach(function(el){el.contentEditable='false';el.removeAttribute('data-lmn-text');});
      document.querySelectorAll('[data-lmn-img]').forEach(function(el){el.removeAttribute('data-lmn-img');el.removeAttribute('data-lmn-img-el');});
      document.querySelectorAll('[data-lmn-prot]').forEach(function(el){el.removeAttribute('data-lmn-prot');});
      var s=document.getElementById('__lmn_s__');var sc=document.getElementById('__lmn_e__');
      if(s)s.remove();if(sc)sc.remove();
      window.parent.postMessage({type:'LMN_HTML',html:'<!DOCTYPE html>\n'+document.documentElement.outerHTML},'*');
    }
    if(e.data.type==='LMN_SETIMG'){
      var img=document.querySelector('img[data-lmn-img="'+e.data.idx+'"]');
      if(img){img.src=e.data.url;img.removeAttribute('srcset');}
    }
  });
})();
</script>`;

function injectEditor(html: string): string {
  if (html.includes("</body>")) return html.replace("</body>", EDITOR_INJECTION + "</body>");
  return html + EDITOR_INJECTION;
}

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
        <Link to="/projects" className="mt-4 inline-block text-primary hover:underline">← All projects</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="grid min-h-[60vh] place-items-center p-10">
      <div className="text-center">
        <h1 className="font-display text-3xl">Couldn't open the project</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="mt-4 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Try again</button>
      </div>
    </div>
  ),
});

type Msg = { who: "you" | "ai"; text: string; working?: boolean };
function toMsg(row: ProjectMessageRow): Msg { return { who: row.who, text: row.text }; }

function Editor() {
  const { project: initialProject, messages: initialMessages, connectors } = Route.useLoaderData();
  const [project, setProject] = useState<ProjectRow>(initialProject);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [mode, setMode] = useState<"preview" | "code" | "edit">("preview");
  const [messages, setMessages] = useState<Msg[]>(initialMessages.map(toMsg));
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [vercelDeploying, setVercelDeploying] = useState(false);
  const [vercelResult, setVercelResult] = useState<{ url: string } | { error: string } | null>(null);
  const [githubPushing, setGithubPushing] = useState(false);
  const [githubResult, setGithubResult] = useState<{ repoUrl: string } | { error: string } | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Visual editor state
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editSaved, setEditSaved] = useState(false);
  const [imgPickIdx, setImgPickIdx] = useState<string | null>(null);
  const imgPickRef = useRef<HTMLInputElement>(null);
  const [imgUploading, setImgUploading] = useState(false);

  const hasVercel = connectors.some((c) => c.provider === "vercel");
  const hasGitHub = connectors.some((c) => c.provider === "github");

  // Listen for postMessage from editor iframe
  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (!e.data?.type) return;
      if (e.data.type === "LMN_IMG") {
        setImgPickIdx(e.data.idx as string);
        setTimeout(() => imgPickRef.current?.click(), 50);
      }
      if (e.data.type === "LMN_HTML") {
        const html = e.data.html as string;
        setEditSaving(true);
        try {
          await saveProjectHtml({ data: { id: project.id, html } });
          setProject((p) => ({ ...p, generated_html: html }));
          setEditSaved(true);
          setTimeout(() => setEditSaved(false), 3000);
        } catch {
          alert("Failed to save changes. Try again.");
        } finally {
          setEditSaving(false);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [project.id]);

  const requestSaveFromIframe = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "LMN_GET" }, "*");
  }, []);

  const handleImageReplace = async (files: FileList | null) => {
    if (!files || !files[0] || imgPickIdx === null) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;
    setImgUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const { url } = await uploadImage({ data: { base64, fileName: file.name, contentType: file.type } });
      iframeRef.current?.contentWindow?.postMessage({ type: "LMN_SETIMG", idx: imgPickIdx, url }, "*");
    } catch {
      alert("Image upload failed.");
    } finally {
      setImgUploading(false);
      setImgPickIdx(null);
    }
  };

  const send = async () => {
    if (!draft.trim() || sending) return;
    const instruction = draft;
    setDraft("");
    setSending(true);
    setMessages((m) => [...m, { who: "you", text: instruction }, { who: "ai", text: "Working on it…", working: true }]);
    try {
      const { html, aiReply } = await reviseProject({ data: { id: project.id, instruction } });
      setProject((p) => ({ ...p, generated_html: html }));
      setMessages((m) => [...m.slice(0, -1), { who: "ai", text: aiReply }]);
    } catch (e) {
      if (isLimitError(e)) {
        setMessages((m) => m.slice(0, -2));
        setShowUpgrade(true);
      } else {
        setMessages((m) => [...m.slice(0, -1), { who: "ai", text: "Something went wrong applying that change. Try again." }]);
      }
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
      setVercelResult(res.ok ? { url: res.url } : { error: res.error });
    } catch (e) {
      setVercelResult({ error: e instanceof Error ? e.message : "Deployment failed." });
    } finally {
      setVercelDeploying(false);
    }
  };

  const pushViaGitHub = async () => {
    if (githubPushing) return;
    setGithubPushing(true);
    setGithubResult(null);
    try {
      const res = await pushToGitHub({ data: { projectId: project.id } });
      setGithubResult(res.ok ? { repoUrl: res.repoUrl } : { error: res.error });
    } catch (e) {
      setGithubResult({ error: e instanceof Error ? e.message : "GitHub push failed." });
    } finally {
      setGithubPushing(false);
    }
  };

  // Hidden file input for image replacement in editor
  const imgPickerEl = (
    <input
      ref={imgPickRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => void handleImageReplace(e.target.files)}
    />
  );

  return (
    <>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      {imgPickerEl}

      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3">
          <Link to="/projects" className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface hover:border-foreground/40">
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
              <a href={project.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs hover:border-foreground/40">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </a>
            )}
            {hasGitHub && (
              <button onClick={pushViaGitHub} disabled={githubPushing} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
                <Github className="h-3.5 w-3.5" />
                {githubPushing ? "Pushing…" : "Push to GitHub"}
              </button>
            )}
            {hasVercel && (
              <button onClick={deployViaVercel} disabled={vercelDeploying} className="inline-flex items-center gap-1.5 rounded-full border border-black bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
                <Triangle className="h-3 w-3 fill-white" />
                {vercelDeploying ? "Deploying…" : "Deploy to Vercel"}
              </button>
            )}
            <button onClick={deploy} disabled={deploying} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              <Rocket className="h-3.5 w-3.5" /> {deploying ? "Deploying…" : "Deploy"}
            </button>
          </div>
        </div>

        {/* Banners */}
        {githubResult && (
          <div className={`flex items-center gap-3 border-b px-4 py-2.5 text-sm ${"repoUrl" in githubResult ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>
            {"repoUrl" in githubResult ? (<><CheckCircle2 className="h-4 w-4 shrink-0" /><span>Pushed!</span><a href={githubResult.repoUrl} target="_blank" rel="noreferrer" className="font-medium underline">{githubResult.repoUrl}</a></>) : (<><AlertCircle className="h-4 w-4 shrink-0" />{githubResult.error}</>)}
            <button onClick={() => setGithubResult(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
          </div>
        )}
        {vercelResult && (
          <div className={`flex items-center gap-3 border-b px-4 py-2.5 text-sm ${"url" in vercelResult ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>
            {"url" in vercelResult ? (<><CheckCircle2 className="h-4 w-4 shrink-0" /><span>Deployed!</span><a href={vercelResult.url} target="_blank" rel="noreferrer" className="font-medium underline">{vercelResult.url}</a></>) : (<><AlertCircle className="h-4 w-4 shrink-0" />{vercelResult.error}</>)}
            <button onClick={() => setVercelResult(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Split */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[380px_1fr]">
          {/* Chat sidebar */}
          <aside className="flex min-h-0 flex-col border-r border-border/60">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="font-display text-lg">Conversation</div>
              <Chip tone="primary"><span className="size-1.5 rounded-full bg-primary" /> Live</Chip>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
              {messages.map((m, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md font-mono text-[10px] ${m.who === "ai" ? "bg-primary text-primary-foreground" : "border border-border bg-surface"}`}>
                    {m.who === "ai" ? "AI" : "U"}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                      {m.text}{m.working && <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
                    </div>
                    {m.who === "ai" && !m.working && (
                      <div className="flex gap-1.5 text-[11px] text-muted-foreground">
                        <button onClick={() => navigator.clipboard.writeText(m.text)} className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-2 py-0.5 hover:text-foreground">
                          <Copy className="h-3 w-3" />Copy
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
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  rows={2}
                  placeholder="Ask Lumen to change anything…"
                  disabled={sending}
                  className="min-h-[44px] flex-1 resize-none bg-transparent text-sm outline-none disabled:opacity-50"
                />
                <button onClick={() => void send()} disabled={sending} className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["Make navbar sticky", "Add testimonials", "Dark mode", "Improve SEO"].map((s) => (
                  <button key={s} onClick={() => setDraft(s)} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground">{s}</button>
                ))}
              </div>
            </div>
          </aside>

          {/* Preview / Code / Edit */}
          <section className="flex min-h-0 flex-col bg-elevated/40">
            {/* Toolbar */}
            <div className="flex items-center gap-2 border-b border-border/60 bg-background/60 px-4 py-2.5">
              <div className="flex rounded-md border border-border bg-surface p-0.5">
                {[
                  { id: "preview" as const, icon: Eye, label: "Preview" },
                  { id: "edit" as const, icon: PenLine, label: "Edit" },
                  { id: "code" as const, icon: Code2, label: "Code" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setMode(t.id)}
                    className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition ${mode === t.id ? (t.id === "edit" ? "bg-primary/10 text-primary" : "bg-elevated text-foreground") : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <t.icon className="h-3.5 w-3.5" />{t.label}
                  </button>
                ))}
              </div>

              {/* Edit mode notice */}
              {mode === "edit" && (
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] text-primary">
                    Click text to edit · Click images to replace
                  </span>
                  {imgUploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                </div>
              )}

              <div className="ml-auto flex items-center gap-1.5">
                <div className="flex rounded-md border border-border bg-surface p-0.5">
                  {[{ id: "desktop" as const, icon: Monitor }, { id: "tablet" as const, icon: Tablet }, { id: "mobile" as const, icon: Smartphone }].map((d) => (
                    <button key={d.id} onClick={() => setDevice(d.id)} className={`grid h-7 w-7 place-items-center rounded ${device === d.id ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      <d.icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { const blob = new Blob([project.generated_html], { type: "text/html" }); window.open(URL.createObjectURL(blob), "_blank"); }}
                  className="grid h-7 w-7 place-items-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground"
                  title="Open fullscreen"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="relative min-h-0 flex-1 overflow-auto p-6">
              {mode === "preview" && (
                <div className="mx-auto h-full" style={{ maxWidth: device === "desktop" ? "100%" : device === "tablet" ? 820 : 390 }}>
                  <div className="panel h-full overflow-hidden p-0">
                    <iframe
                      key={`preview-${project.generated_html.length}`}
                      srcDoc={project.generated_html}
                      title={project.name}
                      sandbox="allow-scripts"
                      className="h-full min-h-[500px] w-full border-0 bg-white"
                    />
                  </div>
                </div>
              )}

              {mode === "edit" && (
                <div className="mx-auto h-full" style={{ maxWidth: device === "desktop" ? "100%" : device === "tablet" ? 820 : 390 }}>
                  <div className="panel h-full overflow-hidden p-0">
                    <iframe
                      ref={iframeRef}
                      key={`edit-${project.generated_html.slice(0, 40)}`}
                      srcDoc={injectEditor(project.generated_html)}
                      title={project.name}
                      sandbox="allow-scripts"
                      className="h-full min-h-[500px] w-full border-0 bg-white"
                    />
                  </div>

                  {/* Floating save bar */}
                  <div className="sticky bottom-4 mt-4 flex items-center justify-center">
                    <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 px-5 py-2.5 shadow-xl backdrop-blur">
                      {editSaved ? (
                        <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                          <CheckCircle2 className="h-4 w-4" /> Changes saved!
                        </span>
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground">Edit text or replace images directly in the preview</span>
                          <div className="h-3.5 w-px bg-border" />
                          <button
                            onClick={requestSaveFromIframe}
                            disabled={editSaving}
                            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                          >
                            {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            {editSaving ? "Saving…" : "Save changes"}
                          </button>
                          <button
                            onClick={() => setMode("preview")}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" /> Discard
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Replace image hint */}
                  <div className="mt-2 flex justify-center">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ImageIcon className="h-3 w-3" /> To replace an image, click on it in the preview
                    </span>
                  </div>
                </div>
              )}

              {mode === "code" && (
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
    </>
  );
}
