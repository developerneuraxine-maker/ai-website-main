import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ArrowRight, Loader2, Wand2, Upload, X, Plus,
  Globe, ChevronDown, Check,
} from "lucide-react";
import { templates } from "@/lib/mock-data";
import { styleReferences } from "@/lib/style-references";
import { createProject } from "@/server-fns/projects";
import { uploadImage } from "@/server-fns/uploads";
import { enhancePrompt } from "@/server-fns/enhance-prompt";

// ─── Constants ───────────────────────────────────────────────────────────────
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 5;

type ImageItem = { id: string; preview: string; url: string | null; uploading: boolean };

const SUGGESTIONS = [
  { emoji: "🍕", label: "Restaurant",  category: "Restaurant",  prompt: "Create a premium restaurant website with an animated hero, online reservations, seasonal menu, chef profiles, photo gallery, customer reviews, and contact form." },
  { emoji: "💼", label: "Portfolio",   category: "Portfolio",   prompt: "Create a stunning creative portfolio with animated hero, interactive project showcase, about me section, skills, client testimonials, and contact form." },
  { emoji: "🏢", label: "Business",   category: "Startup",     prompt: "Create a professional business website with services overview, team section, case studies, pricing plans, and a contact form." },
  { emoji: "🚀", label: "AI Startup", category: "Startup",     prompt: "Create a cutting-edge AI startup landing page with animated hero, product demo section, feature highlights, pricing plans, testimonials, and a strong CTA." },
  { emoji: "⚖️", label: "Law Firm",  category: "Agency",      prompt: "Create a professional law firm website with practice areas, attorney profiles, case results, client testimonials, and consultation booking." },
  { emoji: "🏥", label: "Medical",    category: "Healthcare",  prompt: "Create a modern medical clinic website with services, doctor profiles, appointment booking, patient reviews, and contact information." },
  { emoji: "🏨", label: "Hotel",      category: "Hotel",       prompt: "Create a luxury hotel website with stunning rooms gallery, amenities, dining options, booking system, local attractions, and reviews." },
  { emoji: "🏡", label: "Real Estate",category: "Real Estate", prompt: "Create a premium real estate agency website with property listings, agent profiles, market insights, client testimonials, and contact." },
  { emoji: "💪", label: "Gym",        category: "Fitness",     prompt: "Create an energetic fitness gym website with class schedule, trainer profiles, membership plans, transformation stories, and sign-up form." },
  { emoji: "📚", label: "Education",  category: "Education",   prompt: "Create an online education platform with course catalog, instructor profiles, student success stories, pricing, and enrollment flow." },
  { emoji: "🛍️", label: "Ecommerce", category: "Ecommerce",   prompt: "Create a modern ecommerce store with featured products, category navigation, promotional banners, customer reviews, and checkout flow." },
  { emoji: "📊", label: "SaaS",       category: "Startup",     prompt: "Create a SaaS landing page with animated product walkthrough, feature grid, pricing tiers, integration logos, testimonials, and free trial CTA." },
];

const THEMES = [
  { id: "modern",        label: "Modern",      desc: "Clean & contemporary" },
  { id: "minimal",       label: "Minimal",     desc: "Less is more" },
  { id: "luxury",        label: "Luxury",      desc: "Premium & elegant" },
  { id: "corporate",     label: "Corporate",   desc: "Professional" },
  { id: "startup",       label: "Startup",     desc: "Bold & energetic" },
  { id: "glassmorphism", label: "Glass",       desc: "Frosted glass" },
  { id: "cyberpunk",     label: "Cyberpunk",   desc: "Neon & futuristic" },
  { id: "brutalist",     label: "Brutalist",   desc: "Bold & raw" },
  { id: "apple",         label: "Apple Style", desc: "Polished & refined" },
];

const PALETTES = [
  { id: "lime",   label: "Lime",   bg: "#09090b", accent: "#a3e635" },
  { id: "ocean",  label: "Ocean",  bg: "#06121c", accent: "#38bdf8" },
  { id: "purple", label: "Purple", bg: "#120726", accent: "#a855f7" },
  { id: "ember",  label: "Ember",  bg: "#140a00", accent: "#f97316" },
  { id: "forest", label: "Forest", bg: "#001a00", accent: "#22c55e" },
  { id: "gold",   label: "Gold",   bg: "#100c00", accent: "#eab308" },
  { id: "rose",   label: "Rose",   bg: "#1a0010", accent: "#f43f5e" },
  { id: "light",  label: "Light",  bg: "#f5f5f5", accent: "#1a1a1a" },
  { id: "mono",   label: "Mono",   bg: "#000000", accent: "#e5e5e5" },
];

const FONTS = [
  { id: "inter",       label: "Inter" },
  { id: "poppins",     label: "Poppins" },
  { id: "outfit",      label: "Outfit" },
  { id: "manrope",     label: "Manrope" },
  { id: "montserrat",  label: "Montserrat" },
  { id: "dm-sans",     label: "DM Sans" },
  { id: "playfair",    label: "Playfair Display" },
  { id: "satoshi",     label: "Satoshi" },
];

const GENERATION_STEPS = [
  "Understanding your prompt",
  "Planning the layout",
  "Selecting components",
  "Writing content",
  "Building sections",
  "Applying styles & animations",
  "Optimizing & finalizing",
];

// ─── Generation Progress Overlay ─────────────────────────────────────────────
function GenerationOverlay({ active, prompt }: { active: boolean; prompt: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) { setStep(0); return; }
    const DELAYS = [2800, 2200, 3200, 3800, 3000, 2500];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cur = 0;
    const advance = () => {
      // Hold at second-to-last step; the actual API finishing will trigger navigation
      if (cur < GENERATION_STEPS.length - 2) {
        cur++;
        setStep(cur);
        timers.push(setTimeout(advance, DELAYS[cur - 1] ?? 2500));
      }
    };
    timers.push(setTimeout(advance, DELAYS[0]));
    return () => timers.forEach(clearTimeout);
  }, [active]);

  const progress = Math.round(((step + 1) / GENERATION_STEPS.length) * 100);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-2xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
            className="panel w-full max-w-sm p-8"
          >
            {/* Animated logo */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Sparkles className="h-8 w-8" strokeWidth={2} />
                </div>
                <div className="absolute inset-0 animate-ping rounded-2xl bg-primary/25" />
              </div>
            </div>

            <h2 className="mb-1 text-center font-display text-2xl font-semibold">
              Building your website
            </h2>
            <p className="mb-8 line-clamp-1 text-center text-sm text-muted-foreground">
              "{prompt}"
            </p>

            {/* Progress bar */}
            <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-surface">
              <motion.div
                className="h-full rounded-full bg-primary"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>

            {/* Steps list */}
            <div className="space-y-3">
              {GENERATION_STEPS.map((label, i) => {
                const done = i < step;
                const current = i === step;
                return (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: i <= step ? 1 : 0.3, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300 ${
                        done
                          ? "bg-primary text-primary-foreground"
                          : current
                          ? "border border-primary text-primary"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {done ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    <span className={`text-sm transition-colors ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
                      {label}
                      {current && (
                        <span className="ml-1 inline-flex gap-px">
                          {[0, 0.2, 0.4].map((delay) => (
                            <motion.span
                              key={delay}
                              animate={{ opacity: [1, 0, 1] }}
                              transition={{ duration: 1.2, repeat: Infinity, delay }}
                            >
                              .
                            </motion.span>
                          ))}
                        </span>
                      )}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ─── Route ───────────────────────────────────────────────────────────────────
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

// ─── Main Page ────────────────────────────────────────────────────────────────
function NewProject() {
  const { template: templateId, prompt: promptFromSearch } = Route.useSearch();
  const matchedTemplate = templates.find((t) => t.id === templateId);
  const navigate = useNavigate();

  // Core
  const [prompt, setPrompt] = useState(
    promptFromSearch ||
      (matchedTemplate
        ? `Build a ${matchedTemplate.category.toLowerCase()} website called "${matchedTemplate.name}"`
        : ""),
  );
  const [category, setCategory] = useState(matchedTemplate?.category ?? "Restaurant");
  const [palette, setPalette] = useState("lime");
  const [theme, setTheme] = useState("modern");
  const [font, setFont] = useState("inter");
  const [language, setLanguage] = useState("English (US)");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [styleRefId, setStyleRefId] = useState<string | undefined>(undefined);

  // Images
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);

  // Prompt enhancement
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  // Advanced options panel
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<"theme" | "colors" | "font" | "style">("theme");

  // Generation
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anyUploading = images.some((img) => img.uploading);
  const activePrompt = enhancedPrompt ?? prompt;

  // ── Image upload ──────────────────────────────────────────────────────────
  const onSelectImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) { setImageError(`Maximum ${MAX_IMAGES} images allowed.`); return; }
    const toAdd = fileArray.slice(0, remaining);
    for (const file of toAdd) {
      if (!file.type.startsWith("image/")) { setImageError("Please choose image files only."); return; }
      if (file.size > MAX_IMAGE_BYTES) { setImageError(`"${file.name}" exceeds 5 MB.`); return; }
    }
    setImageError(null);
    const newItems: ImageItem[] = toAdd.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      preview: URL.createObjectURL(file),
      url: null,
      uploading: true,
    }));
    setImages((prev) => [...prev, ...newItems]);
    await Promise.all(
      toAdd.map(async (file, i) => {
        const item = newItems[i];
        try {
          const base64 = await fileToBase64(file);
          const { url } = await uploadImage({ data: { base64, fileName: file.name, contentType: file.type } });
          setImages((prev) => prev.map((img) => img.id === item.id ? { ...img, url, uploading: false } : img));
        } catch (e) {
          setImages((prev) => prev.filter((img) => img.id !== item.id));
          setImageError(e instanceof Error ? e.message : "Upload failed.");
        }
      }),
    );
  };

  const removeImage = (id: string) => setImages((prev) => prev.filter((img) => img.id !== id));

  // ── Prompt enhancement ────────────────────────────────────────────────────
  const handleEnhance = async () => {
    const base = prompt.trim();
    if (!base) return;
    setIsEnhancing(true);
    setEnhanceError(null);
    try {
      const result = await enhancePrompt({ data: { prompt: base } });
      if (result.error) { setEnhanceError(result.error); return; }
      if (result.enhanced) setEnhancedPrompt(result.enhanced);
    } catch (e) {
      setEnhanceError(e instanceof Error ? e.message : "Enhancement failed.");
    } finally {
      setIsEnhancing(false);
    }
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!activePrompt.trim() || generating || anyUploading) return;
    setGenerating(true);
    setError(null);
    try {
      const { id } = await createProject({
        data: {
          prompt: activePrompt,
          category,
          palette,
          theme,
          font,
          referenceUrl: referenceUrl.trim() || undefined,
          motion: "Cinematic",
          language,
          imageUrls: images.filter((img) => img.url).map((img) => img.url!),
          styleReferenceId: styleRefId,
        },
      });
      navigate({ to: "/projects/$id", params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed. Check your API keys and try again.");
      setGenerating(false);
    }
  };

  const LANGUAGES = ["English (US)", "French", "Japanese", "Spanish", "Hindi", "Arabic", "Portuguese", "German"];

  return (
    <>
      <GenerationOverlay active={generating} prompt={activePrompt} />

      <div className="mx-auto max-w-3xl px-6 py-12">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" />
            AI Website Builder
          </div>
          <h1 className="font-display text-5xl leading-tight tracking-tight">
            What do you want<br />to build today?
          </h1>
          <p className="mt-3 text-muted-foreground">
            Describe your website in plain language — AI handles the rest.
          </p>
        </motion.div>

        {/* ── Main prompt card ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
          className="panel overflow-hidden"
        >
          <div className="p-4 pb-2">
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (enhancedPrompt) setEnhancedPrompt(null);
              }}
              rows={4}
              placeholder="A premium restaurant in New York with online reservations, a seasonal menu, chef profiles, and a warm atmosphere…"
              className="w-full resize-none bg-transparent text-lg leading-relaxed outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Enhanced prompt display */}
          <AnimatePresence>
            {enhancedPrompt && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mx-4 mb-3 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-start justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                          ✨ Enhanced prompt
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">{enhancedPrompt}</p>
                    </div>
                    <button
                      onClick={() => setEnhancedPrompt(null)}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex gap-3 border-t border-primary/10 px-3 py-2">
                    <button
                      onClick={() => { setPrompt(enhancedPrompt); setEnhancedPrompt(null); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Use as prompt
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      onClick={() => setEnhancedPrompt(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Keep original
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border/50 p-3">
            {/* Enhance */}
            <button
              type="button"
              onClick={handleEnhance}
              disabled={!prompt.trim() || isEnhancing}
              title="AI-enhance your prompt"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              {isEnhancing ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Enhancing…</>
              ) : (
                <><Wand2 className="h-3 w-3" /> Enhance</>
              )}
            </button>

            {/* Reference URL */}
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 focus-within:border-primary/40">
              <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
              <input
                type="url"
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="Paste reference URL (optional)"
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              />
              {referenceUrl && (
                <button
                  onClick={() => setReferenceUrl("")}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Generate */}
            <button
              onClick={generate}
              disabled={!prompt.trim() || generating || anyUploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {generating ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
              ) : (
                <>Generate <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </button>
          </div>

          {(enhanceError || error) && (
            <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              {enhanceError || error}
            </div>
          )}
        </motion.div>

        {/* ── Quick suggestions ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="mt-4"
        >
          <p className="mb-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Quick start
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => {
                  setPrompt(s.prompt);
                  setCategory(s.category);
                  setEnhancedPrompt(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
              >
                <span>{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Image upload ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="panel mt-4 p-4"
        >
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Inspiration images{" "}
            <span className="text-muted-foreground/50">· optional · up to {MAX_IMAGES}</span>
          </p>
          {images.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative">
                  <img
                    src={img.preview}
                    alt="Reference"
                    className="h-16 w-16 rounded-xl border border-border object-cover"
                  />
                  {img.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive shadow-lg"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border bg-surface hover:border-primary/40">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onSelectImages(e.target.files)}
                  />
                </label>
              )}
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface py-5 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
              <Upload className="h-4 w-4" />
              Upload inspiration images or logos
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onSelectImages(e.target.files)}
              />
            </label>
          )}
          {imageError && <p className="mt-2 text-xs text-destructive">{imageError}</p>}
        </motion.div>

        {/* ── Advanced options ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="panel mt-4 overflow-hidden"
        >
          {/* Toggle header */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-between p-4"
          >
            <span className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
              />
              Advanced options
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {THEMES.find((t) => t.id === theme)?.label} ·{" "}
              {PALETTES.find((p) => p.id === palette)?.label} ·{" "}
              {FONTS.find((f) => f.id === font)?.label}
            </span>
          </button>

          <AnimatePresence initial={false}>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="border-t border-border/50">
                  {/* Tab bar */}
                  <div className="flex gap-1 border-b border-border/50 px-4 pt-3">
                    {(["theme", "colors", "font", "style"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-2 text-xs font-mono uppercase tracking-widest transition ${
                          activeTab === tab
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {/* Theme tab */}
                    {activeTab === "theme" && (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                        {THEMES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`rounded-xl border p-3 text-left transition ${
                              theme === t.id
                                ? "border-primary/50 bg-primary/10"
                                : "border-border bg-surface hover:border-foreground/30"
                            }`}
                          >
                            <div className="text-sm font-medium">{t.label}</div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">{t.desc}</div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Colors tab */}
                    {activeTab === "colors" && (
                      <div className="flex flex-wrap gap-2">
                        {PALETTES.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setPalette(p.id)}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                              palette === p.id
                                ? "border-primary/50 bg-primary/10 text-foreground"
                                : "border-border bg-surface text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                            }`}
                          >
                            <span className="flex gap-0.5">
                              <span
                                className="block h-3.5 w-3.5 rounded-full border border-white/10"
                                style={{ background: p.bg }}
                              />
                              <span
                                className="block h-3.5 w-3.5 rounded-full border border-white/10"
                                style={{ background: p.accent }}
                              />
                            </span>
                            {p.label}
                            {palette === p.id && <Check className="h-3 w-3 text-primary" />}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Font tab */}
                    {activeTab === "font" && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {FONTS.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setFont(f.id)}
                            className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                              font === f.id
                                ? "border-primary/50 bg-primary/10 text-primary"
                                : "border-border bg-surface text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Style reference tab */}
                    {activeTab === "style" && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          onClick={() => setStyleRefId(undefined)}
                          className={`rounded-xl border p-3 text-left transition ${
                            styleRefId === undefined
                              ? "border-primary/50 bg-primary/5"
                              : "border-border bg-surface hover:border-foreground/30"
                          }`}
                        >
                          <div className="text-sm font-medium">None</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            Let AI design freely.
                          </div>
                        </button>
                        {styleReferences.map((ref) => (
                          <button
                            key={ref.id}
                            onClick={() => setStyleRefId(ref.id)}
                            className={`rounded-xl border p-3 text-left transition ${
                              styleRefId === ref.id
                                ? "border-primary/50 bg-primary/5"
                                : "border-border bg-surface hover:border-foreground/30"
                            }`}
                          >
                            <div className="text-sm font-medium">{ref.name}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {ref.description}
                            </div>
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
                    )}

                    {/* Language + motion (always visible inside advanced) */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border/50 pt-4">
                      <div className="flex items-center gap-2">
                        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="h-8 rounded-lg border border-border bg-surface px-2 text-xs outline-none"
                        >
                          {LANGUAGES.map((l) => (
                            <option key={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Large generate CTA (bottom) ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.36 }}
          className="mt-6 flex justify-center"
        >
          <button
            onClick={generate}
            disabled={!prompt.trim() || generating || anyUploading}
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Website
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </motion.div>

      </div>
    </>
  );
}
