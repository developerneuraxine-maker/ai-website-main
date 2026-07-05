import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowUp,
  Loader2,
  Wand2,
  X,
  Plus,
  Globe,
  ChevronDown,
  Check,
  Mic,
  MicOff,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import { templates } from "@/lib/mock-data";
import { styleReferences } from "@/lib/style-references";
import { createProject } from "@/server-fns/projects";
import { fetchMyPlan } from "@/server-fns/plans";
import { uploadImage } from "@/server-fns/uploads";
import { enhancePrompt } from "@/server-fns/enhance-prompt";
import { clarifyPrompt } from "@/server-fns/clarify-prompt";
import type { ClarificationQuestion } from "@/lib/openai";
import type { UserPlan } from "@/lib/db";
import { UpgradeModal } from "@/components/upgrade-modal";

function isLimitError(e: unknown) {
  return e instanceof Error && e.message.includes("reached this month's");
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ImageItem = { id: string; preview: string; url: string | null; uploading: boolean };

const SUGGESTIONS = [
  { emoji: "🍕", label: "Restaurant", category: "Restaurant", prompt: "Create a premium restaurant website with an animated hero, online reservations, seasonal menu, chef profiles, photo gallery, customer reviews, and contact form." },
  { emoji: "💼", label: "Portfolio", category: "Portfolio", prompt: "Create a stunning creative portfolio with animated hero, interactive project showcase, about me section, skills, client testimonials, and contact form." },
  { emoji: "🏢", label: "Business", category: "Startup", prompt: "Create a professional business website with services overview, team section, case studies, pricing plans, and a contact form." },
  { emoji: "🚀", label: "AI Startup", category: "Startup", prompt: "Create a cutting-edge AI startup landing page with animated hero, product demo section, feature highlights, pricing plans, testimonials, and a strong CTA." },
  { emoji: "⚖️", label: "Law Firm", category: "Agency", prompt: "Create a professional law firm website with practice areas, attorney profiles, case results, client testimonials, and consultation booking." },
  { emoji: "🏥", label: "Medical", category: "Healthcare", prompt: "Create a modern medical clinic website with services, doctor profiles, appointment booking, patient reviews, and contact information." },
  { emoji: "🏨", label: "Hotel", category: "Hotel", prompt: "Create a luxury hotel website with stunning rooms gallery, amenities, dining options, booking system, local attractions, and reviews." },
  { emoji: "🏡", label: "Real Estate", category: "Real Estate", prompt: "Create a premium real estate agency website with property listings, agent profiles, market insights, client testimonials, and contact." },
  { emoji: "💪", label: "Gym", category: "Fitness", prompt: "Create an energetic fitness gym website with class schedule, trainer profiles, membership plans, transformation stories, and sign-up form." },
  { emoji: "📚", label: "Education", category: "Education", prompt: "Create an online education platform with course catalog, instructor profiles, student success stories, pricing, and enrollment flow." },
  { emoji: "🛍️", label: "Ecommerce", category: "Ecommerce", prompt: "Create a modern ecommerce store with featured products, category navigation, promotional banners, customer reviews, and checkout flow." },
  { emoji: "📊", label: "SaaS", category: "Startup", prompt: "Create a SaaS landing page with animated product walkthrough, feature grid, pricing tiers, integration logos, testimonials, and free trial CTA." },
];

const THEMES = [
  { id: "modern", label: "Modern", desc: "Clean & contemporary" },
  { id: "minimal", label: "Minimal", desc: "Less is more" },
  { id: "luxury", label: "Luxury", desc: "Premium & elegant" },
  { id: "corporate", label: "Corporate", desc: "Professional" },
  { id: "startup", label: "Startup", desc: "Bold & energetic" },
  { id: "glassmorphism", label: "Glass", desc: "Frosted glass" },
  { id: "cyberpunk", label: "Cyberpunk", desc: "Neon & futuristic" },
  { id: "brutalist", label: "Brutalist", desc: "Bold & raw" },
  { id: "apple", label: "Apple Style", desc: "Polished & refined" },
];

const PALETTES = [
  { id: "lime", label: "Lime", bg: "#09090b", accent: "#a3e635" },
  { id: "ocean", label: "Ocean", bg: "#06121c", accent: "#38bdf8" },
  { id: "purple", label: "Purple", bg: "#120726", accent: "#a855f7" },
  { id: "ember", label: "Ember", bg: "#140a00", accent: "#f97316" },
  { id: "forest", label: "Forest", bg: "#001a00", accent: "#22c55e" },
  { id: "gold", label: "Gold", bg: "#100c00", accent: "#eab308" },
  { id: "rose", label: "Rose", bg: "#1a0010", accent: "#f43f5e" },
  { id: "light", label: "Light", bg: "#f5f5f5", accent: "#1a1a1a" },
  { id: "mono", label: "Mono", bg: "#000000", accent: "#e5e5e5" },
];

const FONTS = [
  { id: "inter", label: "Inter" },
  { id: "poppins", label: "Poppins" },
  { id: "outfit", label: "Outfit" },
  { id: "manrope", label: "Manrope" },
  { id: "montserrat", label: "Montserrat" },
  { id: "dm-sans", label: "DM Sans" },
  { id: "playfair", label: "Playfair Display" },
  { id: "satoshi", label: "Satoshi" },
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
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Sparkles className="h-8 w-8" strokeWidth={2} />
                </div>
                <div className="absolute inset-0 animate-ping rounded-2xl bg-primary/25" />
              </div>
            </div>
            <h2 className="mb-1 text-center font-display text-2xl font-semibold">Building your website</h2>
            <p className="mb-8 line-clamp-1 text-center text-sm text-muted-foreground">"{prompt}"</p>
            <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-surface">
              <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
            </div>
            <div className="space-y-3">
              {GENERATION_STEPS.map((label, i) => {
                const done = i < step;
                const current = i === step;
                let badgeClass = "border border-border text-muted-foreground";
                if (done) badgeClass = "bg-primary text-primary-foreground";
                else if (current) badgeClass = "border border-primary text-primary";
                return (
                  <motion.div key={label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: i <= step ? 1 : 0.3, x: 0 }} transition={{ delay: i * 0.04, duration: 0.25 }} className="flex items-center gap-3">
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300 ${badgeClass}`}>
                      {done ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    <span className={`text-sm transition-colors ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
                      {label}
                      {current && (
                        <span className="ml-1 inline-flex gap-px">
                          {[0, 0.2, 0.4].map((delay) => (
                            <motion.span key={delay} animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.2, repeat: Infinity, delay }}>.</motion.span>
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

// ─── Voice Input Hook ─────────────────────────────────────────────────────────
type SpeechRecognition = {
  start: () => void;
  stop: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: { results: { [n: number]: { [n: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function useVoiceInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);

    // Explicitly request mic access — this triggers the browser's native permission popup.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop()); // release immediately
    } catch {
      setError("Microphone blocked. Click the lock icon in your address bar to allow access.");
      return;
    }

    if (!supported) {
      setError("Voice input not supported. Try Chrome or Edge.");
      return;
    }

    type SpeechRecognitionConstructor = new () => SpeechRecognition;
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognitionClass = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setError("Voice input not supported. Try Chrome or Edge.");
      return;
    }

    const rec = new SpeechRecognitionClass();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript) onResult(transcript);
      stop();
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted") setError("Voice recognition error. Try again.");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
  }, [supported, onResult, stop]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else void start();
  }, [listening, start, stop]);

  return { listening, toggle, supported, error, clearError: () => setError(null) };
}

// ─── Clarification Modal ──────────────────────────────────────────────────────
export type Answers = Record<string, { selected: string; custom: string }>;

function ClarificationModal({ questions, onSubmit, onSkip }: { questions: ClarificationQuestion[]; onSubmit: (answers: Answers) => void; onSkip: () => void; }) {
  const [answers, setAnswers] = useState<Answers>(() =>
    Object.fromEntries(questions.map((q) => [q.id, { selected: "", custom: "" }])),
  );
  const setSelected = (qid: string, opt: string) => setAnswers((prev) => ({ ...prev, [qid]: { selected: opt, custom: "" } }));
  const setCustom = (qid: string, text: string) => setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], custom: text } }));
  const OTHER = "Other — describe below";
  const allAnswered = questions.every((q) => {
    const a = answers[q.id];
    if (!a?.selected) return false;
    if (a.selected === OTHER && !a.custom.trim()) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onSkip} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }} className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">A few quick questions</p>
            <p className="text-xs text-muted-foreground">Help us build exactly what you need</p>
          </div>
          <button onClick={onSkip} className="ml-auto text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-5 px-6 py-5">
          {questions.map((q, qi) => (
            <div key={q.id}>
              <p className="mb-2.5 text-sm font-medium">
                <span className="mr-1.5 font-mono text-[10px] text-muted-foreground">{qi + 1}.</span>
                {q.question}
              </p>
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const isOther = opt === OTHER;
                  const selected = answers[q.id]?.selected === opt;
                  let buttonClass = "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground";
                  if (selected) buttonClass = "border-primary bg-primary/10 text-primary";
                  else if (isOther) buttonClass = "border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-foreground";
                  return (
                    <button key={opt} onClick={() => setSelected(q.id, opt)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${buttonClass}`}>
                      {selected && !isOther && <Check className="mr-1 inline h-3 w-3" />}
                      {opt}
                    </button>
                  );
                })}
              </div>
              <AnimatePresence>
                {answers[q.id]?.selected === OTHER && (
                  <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 8 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                    <input autoFocus value={answers[q.id]?.custom ?? ""} onChange={(e) => setCustom(q.id, e.target.value)} placeholder="Describe your answer…" className="w-full rounded-lg border border-primary/40 bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button onClick={onSkip} className="text-xs text-muted-foreground hover:text-foreground">Skip and generate anyway</button>
          <button onClick={() => onSubmit(answers)} disabled={!allAnswered} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40">
            Build it <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
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
  loader: async () => {
    try {
      return { plan: await fetchMyPlan() };
    } catch {
      return { plan: undefined };
    }
  },
  component: NewProject,
});

// ─── Main Page ────────────────────────────────────────────────────────────────
function NewProject() {
  const { template: templateId, prompt: promptFromSearch } = Route.useSearch();
  const { plan } = Route.useLoaderData() as { plan: UserPlan | undefined };
  const matchedTemplate = templates.find((t) => t.id === templateId);
  const navigate = useNavigate();

  // Pro users get unlimited images; free users are capped at 5
  const maxImages = plan?.is_paid_active ? 50 : 5;

  // Core state
  const [prompt, setPrompt] = useState(
    promptFromSearch || (matchedTemplate ? `Build a ${matchedTemplate.category.toLowerCase()} website called "${matchedTemplate.name}"` : ""),
  );
  const [category, setCategory] = useState(matchedTemplate?.category ?? "Restaurant");
  const [palette, setPalette] = useState("lime");
  const [theme, setTheme] = useState("modern");
  const [font, setFont] = useState("inter");
  const [language, setLanguage] = useState("English (US)");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [styleRefId, setStyleRefId] = useState<string | undefined>(undefined);

  // Images
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);

  // Prompt enhancement
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<"theme" | "colors" | "font" | "style">("theme");

  // Generation
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Clarification
  const [clarifying, setClarifying] = useState(false);
  const [clarifyQuestions, setClarifyQuestions] = useState<ClarificationQuestion[] | null>(null);
  const [pendingGenerateData, setPendingGenerateData] = useState<Parameters<typeof createProject>[0]["data"] | null>(null);

  const anyUploading = images.some((img) => img.uploading);
  const activePrompt = enhancedPrompt ?? prompt;

  // Voice input
  const voiceInput = useVoiceInput((transcript) => {
    setPrompt((prev) => (prev.trim() ? `${prev} ${transcript}` : transcript));
    if (enhancedPrompt) setEnhancedPrompt(null);
  });

  // ── Image upload ──────────────────────────────────────────────────────────
  const onSelectImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      setImageError(maxImages >= 50 ? "Maximum images reached." : `Maximum ${maxImages} images allowed. Upgrade to Pro for unlimited.`);
      return;
    }
    const toAdd = fileArray.slice(0, remaining);
    for (const file of toAdd) {
      if (!file.type.startsWith("image/")) { setImageError("Please choose image files only."); return; }
      if (file.size > MAX_IMAGE_BYTES) { setImageError(`"${file.name}" exceeds 5 MB.`); return; }
    }
    setImageError(null);
    const newItems: ImageItem[] = toAdd.map((file) => ({ id: `${Date.now()}-${Math.random()}`, preview: URL.createObjectURL(file), url: null, uploading: true }));
    setImages((prev) => [...prev, ...newItems]);
    await Promise.all(
      toAdd.map(async (file, i) => {
        const item = newItems[i];
        try {
          const base64 = await fileToBase64(file);
          const { url } = await uploadImage({ data: { base64, fileName: file.name, contentType: file.type } });
          setImages((prev) => prev.map((img) => (img.id === item.id ? { ...img, url, uploading: false } : img)));
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

  // ── Core generation ───────────────────────────────────────────────────────
  const runGenerate = async (finalPrompt: string) => {
    setGenerating(true);
    setError(null);
    try {
      const { id } = await createProject({
        data: {
          prompt: finalPrompt,
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
      if (isLimitError(e)) setShowUpgrade(true);
      else setError(e instanceof Error ? e.message : "Generation failed. Check your API keys and try again.");
      setGenerating(false);
    }
  };

  const handleClarificationSubmit = async (answers: Answers) => {
    setClarifyQuestions(null);
    if (!pendingGenerateData) return;
    const parts: string[] = [pendingGenerateData.prompt];
    if (clarifyQuestions) {
      for (const q of clarifyQuestions) {
        const a = answers[q.id];
        if (!a?.selected) continue;
        const value = a.selected === "Other — describe below" ? a.custom : a.selected;
        if (value.trim()) parts.push(`${q.question}: ${value}`);
      }
    }
    await runGenerate(parts.join(". "));
  };

  const generate = async () => {
    if (!activePrompt.trim() || generating || anyUploading) return;
    setError(null);
    setClarifying(true);
    try {
      const result = await clarifyPrompt({ data: { prompt: activePrompt } });
      if (result.needsClarification) {
        setPendingGenerateData({ prompt: activePrompt, category, palette, theme, font, motion: "Cinematic", language, referenceUrl: referenceUrl.trim() || undefined, imageUrls: images.filter((img) => img.url).map((img) => img.url!), styleReferenceId: styleRefId });
        setClarifyQuestions(result.questions);
        setClarifying(false);
        return;
      }
    } catch { /* proceed without clarification */ }
    finally { setClarifying(false); }
    await runGenerate(activePrompt);
  };

  const LANGUAGES = ["English (US)", "French", "Japanese", "Spanish", "Hindi", "Arabic", "Portuguese", "German"];

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <GenerationOverlay active={generating} prompt={activePrompt} />

      <AnimatePresence>
        {clarifyQuestions && !generating && (
          <ClarificationModal
            questions={clarifyQuestions}
            onSubmit={handleClarificationSubmit}
            onSkip={() => { setClarifyQuestions(null); if (pendingGenerateData) void runGenerate(pendingGenerateData.prompt); }}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* ── Header ──────────────────────────────────────────────────────── */}
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
          <p className="mt-3 text-muted-foreground">Describe your website in plain language — AI handles the rest.</p>
        </motion.div>

        {/* ── Claude-style input card ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
          className="panel overflow-hidden"
        >
          {/* Attached images row */}
          <AnimatePresence>
            {images.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 border-b border-border/40 px-4 py-3">
                  {images.map((img) => (
                    <div key={img.id} className="relative">
                      <img src={img.preview} alt="Reference" className="h-16 w-16 rounded-xl border border-border object-cover" />
                      {img.uploading && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        </div>
                      )}
                      <button type="button" onClick={() => removeImage(img.id)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive shadow-lg">
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {images.length < maxImages && (
                    <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border bg-surface hover:border-primary/40 transition">
                      <Plus className="h-5 w-5 text-muted-foreground" />
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void onSelectImages(e.target.files)} />
                    </label>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced prompt banner */}
          <AnimatePresence>
            {enhancedPrompt && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="mx-4 mt-3 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-start justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-primary">✨ Enhanced prompt</span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">{enhancedPrompt}</p>
                    </div>
                    <button onClick={() => setEnhancedPrompt(null)} className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex gap-3 border-t border-primary/10 px-3 py-2">
                    <button onClick={() => { setPrompt(enhancedPrompt); setEnhancedPrompt(null); }} className="text-xs text-primary hover:underline">Use as prompt</button>
                    <span className="text-muted-foreground">·</span>
                    <button onClick={() => setEnhancedPrompt(null)} className="text-xs text-muted-foreground hover:text-foreground">Keep original</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea */}
          <div className="px-4 pb-2 pt-4">
            <textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); if (enhancedPrompt) setEnhancedPrompt(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void generate(); } }}
              rows={5}
              placeholder="A premium restaurant in New York with online reservations, a seasonal menu, chef profiles, and a warm atmosphere…"
              className="w-full resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Reference URL (collapsible) */}
          <AnimatePresence>
            {showUrlInput && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                <div className="flex items-center gap-2 border-t border-border/40 px-4 py-2">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    autoFocus
                    type="url"
                    value={referenceUrl}
                    onChange={(e) => setReferenceUrl(e.target.value)}
                    placeholder="Paste reference website URL for style inspiration…"
                    className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  {referenceUrl && (
                    <button onClick={() => setReferenceUrl("")} className="shrink-0 text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom toolbar — Claude-style */}
          <div className="flex items-center gap-1 border-t border-border/40 p-2">
            {/* Attach images */}
            <label
              title={images.length >= maxImages ? `Max ${maxImages} images` : "Attach images"}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface hover:text-foreground ${images.length >= maxImages ? "cursor-not-allowed opacity-40" : ""}`}
            >
              <Paperclip className="h-4 w-4" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={images.length >= maxImages}
                onChange={(e) => void onSelectImages(e.target.files)}
              />
            </label>

            {/* Voice */}
            <button
              type="button"
              title={voiceInput.listening ? "Stop listening" : "Voice input"}
              onClick={voiceInput.toggle}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                voiceInput.listening
                  ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              }`}
            >
              {voiceInput.listening ? (
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                  <MicOff className="relative h-4 w-4" />
                </span>
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            {/* Enhance */}
            <button
              type="button"
              title="AI-enhance your prompt"
              onClick={() => void handleEnhance()}
              disabled={!prompt.trim() || isEnhancing}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground transition hover:bg-surface hover:text-foreground disabled:opacity-40"
            >
              {isEnhancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Enhance</span>
            </button>

            {/* Reference URL toggle */}
            <button
              type="button"
              title="Add reference URL"
              onClick={() => setShowUrlInput((v) => !v)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                showUrlInput || referenceUrl
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              }`}
            >
              <Globe className="h-4 w-4" />
            </button>

            {/* Image count badge */}
            {images.length > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground">
                {images.length}/{maxImages >= 50 ? "∞" : maxImages}
              </span>
            )}

            <div className="flex-1" />

            {/* Hint */}
            <span className="hidden text-[10px] text-muted-foreground/50 sm:inline">⌘↵ to send</span>

            {/* Send button — Claude-style filled circle */}
            <button
              onClick={() => void generate()}
              disabled={!prompt.trim() || generating || clarifying || anyUploading}
              title="Generate website"
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-30"
            >
              {generating || clarifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Errors */}
          <AnimatePresence>
            {voiceInput.error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex items-center justify-between border-t border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
                  <span><MicOff className="mr-1.5 inline h-3 w-3" />{voiceInput.error}</span>
                  <button onClick={voiceInput.clearError}><X className="h-3 w-3" /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {imageError && (
            <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              {imageError}
            </div>
          )}
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
          <p className="mb-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Quick start</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => { setPrompt(s.prompt); setCategory(s.category); setEnhancedPrompt(null); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
              >
                <span>{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Advanced options ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="panel mt-4 overflow-hidden"
        >
          <button onClick={() => setShowAdvanced((v) => !v)} className="flex w-full items-center justify-between p-4">
            <span className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} />
              Advanced options
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {THEMES.find((t) => t.id === theme)?.label} · {PALETTES.find((p) => p.id === palette)?.label} · {FONTS.find((f) => f.id === font)?.label}
            </span>
          </button>

          <AnimatePresence initial={false}>
            {showAdvanced && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }} className="overflow-hidden">
                <div className="border-t border-border/50">
                  <div className="flex gap-1 border-b border-border/50 px-4 pt-3">
                    {(["theme", "colors", "font", "style"] as const).map((tab) => (
                      <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 text-xs font-mono uppercase tracking-widest transition ${activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {activeTab === "theme" && (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                        {THEMES.map((t) => (
                          <button key={t.id} onClick={() => setTheme(t.id)} className={`rounded-xl border p-3 text-left transition ${theme === t.id ? "border-primary/50 bg-primary/10" : "border-border bg-surface hover:border-foreground/30"}`}>
                            <div className="text-sm font-medium">{t.label}</div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">{t.desc}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {activeTab === "colors" && (
                      <div className="flex flex-wrap gap-2">
                        {PALETTES.map((p) => (
                          <button key={p.id} onClick={() => setPalette(p.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${palette === p.id ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-surface text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`}>
                            <span className="flex gap-0.5">
                              <span className="block h-3.5 w-3.5 rounded-full border border-white/10" style={{ background: p.bg }} />
                              <span className="block h-3.5 w-3.5 rounded-full border border-white/10" style={{ background: p.accent }} />
                            </span>
                            {p.label}
                            {palette === p.id && <Check className="h-3 w-3 text-primary" />}
                          </button>
                        ))}
                      </div>
                    )}
                    {activeTab === "font" && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {FONTS.map((f) => (
                          <button key={f.id} onClick={() => setFont(f.id)} className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${font === f.id ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {activeTab === "style" && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button onClick={() => setStyleRefId(undefined)} className={`rounded-xl border p-3 text-left transition ${styleRefId === undefined ? "border-primary/50 bg-primary/5" : "border-border bg-surface hover:border-foreground/30"}`}>
                          <div className="text-sm font-medium">None</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">Let AI design freely.</div>
                        </button>
                        {styleReferences.map((ref) => (
                          <button key={ref.id} onClick={() => setStyleRefId(ref.id)} className={`rounded-xl border p-3 text-left transition ${styleRefId === ref.id ? "border-primary/50 bg-primary/5" : "border-border bg-surface hover:border-foreground/30"}`}>
                            <div className="text-sm font-medium">{ref.name}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{ref.description}</div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {ref.categories.map((c) => (
                                <span key={c} className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] text-muted-foreground">{c}</span>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border/50 pt-4">
                      <div className="flex items-center gap-2">
                        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Language</label>
                        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="h-8 rounded-lg border border-border bg-surface px-2 text-xs outline-none">
                          {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
