import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Sparkles, Upload, X } from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { examplePrompts, templates } from "@/lib/mock-data";
import { styleReferences } from "@/lib/style-references";
import { createProject } from "@/server-fns/projects";
import { uploadImage } from "@/server-fns/uploads";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const Route = createFileRoute("/_app/new")({
  validateSearch: (search: Record<string, unknown>): { template?: string; prompt?: string } => {
    const result: { template?: string; prompt?: string } = {};
    if (typeof search.template === "string") result.template = search.template;
    if (typeof search.prompt === "string") result.prompt = search.prompt;
    return result;
  },
  head: () => ({ meta: [{ title: "New website · Lumen" }] }),
  component: NewProject,
});

const palettes = [
  { id: "candlelit", label: "Candlelit", colors: ["#1b1108", "#3b1f12", "#c69468", "#f2e3c7"] },
  { id: "lime", label: "Electric Lime", colors: ["#0d0f0a", "#1f2415", "#a8ff2a", "#eafce0"] },
  { id: "marble", label: "Marble", colors: ["#0f0f0f", "#1f1f1f", "#cfcfcf", "#f7f7f5"] },
  { id: "ocean", label: "Deep Ocean", colors: ["#06121c", "#0d2235", "#3aa9d6", "#cfeaf6"] },
];

const categories = [
  "Restaurant",
  "Portfolio",
  "Ecommerce",
  "Healthcare",
  "Real Estate",
  "Startup",
  "Travel",
  "Hotel",
  "Agency",
  "Fitness",
];

const motionLevels = ["Subtle", "Cinematic", "Playful", "None"];
const languages = ["English (US)", "French", "Japanese", "Spanish", "Hindi"];

function NewProject() {
  const { template: templateId, prompt: promptFromSearch } = Route.useSearch();
  const matchedTemplate = templates.find((t) => t.id === templateId);
  const [prompt, setPrompt] = useState(
    promptFromSearch ||
      (matchedTemplate
        ? `Build a ${matchedTemplate.category.toLowerCase()} website called "${matchedTemplate.name}"`
        : ""),
  );
  const [category, setCategory] = useState(matchedTemplate?.category ?? "Restaurant");
  const [palette, setPalette] = useState("candlelit");
  const [motionLevel, setMotionLevel] = useState("Cinematic");
  const [language, setLanguage] = useState("English (US)");
  const [styleRefId, setStyleRefId] = useState<string | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSelectImage = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image is too large (max 5MB).");
      return;
    }
    setImageError(null);
    setImagePreview(URL.createObjectURL(file));
    setImageUrl(null);
    setUploadingImage(true);
    try {
      const base64 = await fileToBase64(file);
      const { url } = await uploadImage({
        data: { base64, fileName: file.name, contentType: file.type },
      });
      setImageUrl(url);
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "Upload failed. Try again.");
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageUrl(null);
    setImageError(null);
  };

  const generate = async () => {
    if (!prompt.trim() || generating || uploadingImage) return;
    setGenerating(true);
    setError(null);
    try {
      const { id } = await createProject({
        data: {
          prompt,
          category,
          palette,
          motion: motionLevel,
          language,
          imageUrl: imageUrl ?? undefined,
          styleReferenceId: styleRefId,
        },
      });
      navigate({ to: "/projects/$id", params: { id } });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Generation failed. Check your API keys and try again.",
      );
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="New"
        title="What should we build?"
        description="Describe the website in plain language. We'll handle the rest."
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel mt-8 p-3"
      >
        <div className="flex items-start gap-3 p-3">
          <Sparkles className="mt-2 h-5 w-5 shrink-0 text-primary" />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="A candlelit French bistro in Brooklyn with online reservations, a seasonal menu, and a wine list…"
            className="min-h-30 flex-1 resize-none bg-transparent text-lg outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 p-3">
          <button
            onClick={generate}
            disabled={generating || uploadingImage || !prompt.trim()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {generating ? (
              <>
                Generating… <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </>
            ) : (
              <>
                Generate website <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="border-t border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}
      </motion.div>

      <div className="panel mt-4 p-4">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Reference image (optional)
          </div>
          {imagePreview && (
            <button
              onClick={removeImage}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          )}
        </div>
        <div className="mt-3">
          {imagePreview ? (
            <div className="flex items-center gap-3">
              <img
                src={imagePreview}
                alt="Reference"
                className="h-16 w-16 rounded-lg border border-border object-cover"
              />
              <div className="text-xs text-muted-foreground">
                {uploadingImage
                  ? "Uploading…"
                  : imageUrl
                    ? "Ready — your site will use this image."
                    : "—"}
              </div>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface py-6 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground">
              <Upload className="h-4 w-4" />
              Upload a photo or logo from your device
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onSelectImage(e.target.files?.[0])}
              />
            </label>
          )}
        </div>
        {imageError && <div className="mt-2 text-xs text-destructive">{imageError}</div>}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground self-center mr-2">
          Try
        </span>
        {examplePrompts.map((p) => (
          <button
            key={p}
            onClick={() => setPrompt(p)}
            className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        <div className="panel p-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Category
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-xs ${c === category ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="panel p-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Palette
          </div>
          <div className="mt-4 grid gap-2">
            {palettes.map((p) => (
              <button
                key={p.id}
                onClick={() => setPalette(p.id)}
                className={`flex items-center justify-between rounded-xl border p-2.5 transition ${p.id === palette ? "border-primary/50 bg-primary/5" : "border-border bg-surface hover:border-foreground/40"}`}
              >
                <span className="text-sm">{p.label}</span>
                <span className="flex gap-1">
                  {p.colors.map((c) => (
                    <span
                      key={c}
                      className="size-4 rounded-full border border-border"
                      style={{ background: c }}
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="panel p-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Motion
          </div>
          <div className="mt-4 grid gap-2">
            {motionLevels.map((m) => (
              <button
                key={m}
                onClick={() => setMotionLevel(m)}
                className={`rounded-xl border p-2.5 text-left text-sm ${m === motionLevel ? "border-primary/50 bg-primary/5 text-primary" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="mt-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Language
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-2 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none"
          >
            {languages.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel mt-6 p-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Match the style of (optional)
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Anchor the design to one of your own past projects instead of a generic AI look.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => setStyleRefId(undefined)}
            className={`rounded-xl border p-3 text-left transition ${styleRefId === undefined ? "border-primary/50 bg-primary/5" : "border-border bg-surface hover:border-foreground/40"}`}
          >
            <div className="text-sm font-medium">None</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Let the AI design freely.</div>
          </button>
          {styleReferences.map((ref) => (
            <button
              key={ref.id}
              onClick={() => setStyleRefId(ref.id)}
              className={`rounded-xl border p-3 text-left transition ${styleRefId === ref.id ? "border-primary/50 bg-primary/5" : "border-border bg-surface hover:border-foreground/40"}`}
            >
              <div className="text-sm font-medium">{ref.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{ref.description}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {ref.categories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
