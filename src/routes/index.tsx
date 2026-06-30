import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Wand2, Layers, Rocket, Code2, Globe } from "lucide-react";
import { Chip } from "@/components/ui-bits";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — Ship websites from a sentence" },
      {
        name: "description",
        content:
          "Lumen turns a prompt into a production-ready website. Generate the site, edit it visually, ship it in one click.",
      },
      { property: "og:title", content: "Lumen — Ship websites from a sentence" },
      {
        property: "og:description",
        content: "Prompt a website. Edit it visually. Ship it in a click.",
      },
    ],
  }),
  component: Landing,
});

const fade = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] as const },
};

function Landing() {
  return (
    <div className="relative isolate z-10 min-h-screen">
      <Nav />
      <Hero />
      <LogoStrip />
      <Pipeline />
      <Showcase />
      <FeatureGrid />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl">Lumen</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {[
            { label: "How it works", href: "#pipeline" },
            { label: "Showcase", href: "#showcase" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/templates"
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            Templates
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Start building{" "}
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const generate = () => {
    navigate({ to: "/new", search: prompt.trim() ? { prompt } : {} });
  };

  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-32">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fade} className="flex justify-center">
          <Chip tone="primary">
            <span className="size-1.5 rounded-full bg-primary" /> Now in public beta · v0.9
          </Chip>
        </motion.div>

        <motion.h1
          {...fade}
          transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] as const }}
          className="mx-auto mt-8 max-w-5xl text-balance text-center font-display text-6xl leading-[1.02] sm:text-7xl md:text-[7.5rem]"
        >
          Ship a website <em className="italic text-primary">from a sentence.</em>
        </motion.h1>

        <motion.p
          {...fade}
          transition={{ delay: 0.1, duration: 0.7 }}
          className="mx-auto mt-8 max-w-2xl text-balance text-center text-lg text-muted-foreground"
        >
          Lumen turns one prompt into a production-grade website — design system, content,
          animations, SEO, and deploy. Iterate in chat, edit visually, ship anywhere.
        </motion.p>

        <motion.div {...fade} transition={{ delay: 0.2 }} className="mx-auto mt-12 max-w-3xl">
          <div className="panel group flex items-center gap-3 p-3 transition focus-within:border-primary/50">
            <Wand2 className="ml-3 h-5 w-5 text-primary" />
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              className="h-12 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              placeholder="A candlelit French bistro with online reservations…"
            />
            <button
              onClick={generate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Generate <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            {["Restaurant", "Portfolio", "Gym", "Dentist", "Ecommerce", "Real estate"].map((t) => (
              <button
                key={t}
                onClick={() => setPrompt(`A ${t.toLowerCase()} website`)}
                className="rounded-full border border-border bg-surface/60 px-3 py-1 transition hover:border-primary/40 hover:text-foreground"
              >
                {t}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          {...fade}
          transition={{ delay: 0.35, duration: 0.9 }}
          className="relative mx-auto mt-20 max-w-6xl"
        >
          <div className="panel relative aspect-[16/9] overflow-hidden p-0 shadow-[var(--shadow-elevated)]">
            <div className="flex h-9 items-center gap-1.5 border-b border-border bg-elevated px-3">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
              <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                lumen / aurora-bistro
              </span>
            </div>
            <div className="grid h-[calc(100%-2.25rem)] grid-cols-12">
              <aside className="col-span-4 border-r border-border bg-sidebar/60 p-4">
                <div className="space-y-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Conversation
                  </div>
                  <Bubble who="you">Make the hero darker and add a reservation form.</Bubble>
                  <Bubble who="ai">
                    Switching to candlelit palette, adding reservation form with
                    date/time/party-size.
                  </Bubble>
                  <Bubble who="you">Add a menu section with three categories.</Bubble>
                  <Bubble who="ai" working>
                    Generating menu section…
                  </Bubble>
                </div>
              </aside>
              <div className="relative col-span-8 overflow-hidden bg-gradient-to-br from-amber-950/40 via-rose-950/30 to-stone-950">
                <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_0%,oklch(0.78_0.15_55/0.25),transparent_60%)]" />
                <div className="relative grid h-full place-items-center p-10">
                  <div className="text-center">
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-200/70">
                      Établi 2021 · Brooklyn
                    </div>
                    <div className="mt-3 font-display text-5xl text-amber-50">Aurora Bistro</div>
                    <div className="mx-auto mt-3 max-w-xs text-sm text-amber-100/70">
                      Candlelit suppers, natural wine, market-driven menus.
                    </div>
                    <button className="mt-6 rounded-full bg-amber-200 px-5 py-2 text-sm font-medium text-amber-950">
                      Reserve a table
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Bubble({
  who,
  children,
  working,
}: {
  who: "you" | "ai";
  children: React.ReactNode;
  working?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <div
        className={`mt-0.5 size-5 shrink-0 rounded-md ${who === "ai" ? "bg-primary text-primary-foreground" : "bg-surface border border-border"} grid place-items-center font-mono text-[9px]`}
      >
        {who === "ai" ? "AI" : "U"}
      </div>
      <div
        className={`rounded-lg border border-border px-3 py-2 text-xs ${who === "ai" ? "bg-surface/80" : "bg-elevated"} text-foreground/90`}
      >
        {children}
        {working && (
          <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        )}
      </div>
    </div>
  );
}

function LogoStrip() {
  return (
    <section className="border-y border-border/60 bg-surface/30 py-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Trusted by 28,000+ builders shipping websites this week
        </div>
        <div className="mt-6 grid grid-cols-2 items-center gap-6 opacity-70 sm:grid-cols-3 md:grid-cols-6">
          {["Mercure", "Ironroot", "Atelier Nord", "Orchard", "Marbled", "Nocturne"].map((b) => (
            <div key={b} className="text-center font-display text-2xl tracking-tight">
              {b}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const pipeline = [
  {
    n: "01",
    t: "Understand",
    d: "Parse intent, category, audience, and tone from a single sentence.",
  },
  { n: "02", t: "Sitemap", d: "Draft the routes, sections, and CTAs needed for the goal." },
  { n: "03", t: "Design system", d: "Pick fonts, palette, motion language, and density." },
  { n: "04", t: "Components", d: "Generate React + Tailwind components, fully responsive." },
  { n: "05", t: "Content", d: "Write copy, microcopy, alt text, and metadata in your voice." },
  { n: "06", t: "Ship", d: "Preview live, edit visually or via chat, deploy in one click." },
];

function Pipeline() {
  return (
    <section id="pipeline" className="scroll-mt-20 px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <motion.div {...fade} className="max-w-2xl">
          <Chip tone="muted">The pipeline</Chip>
          <h2 className="mt-4 font-display text-5xl text-balance sm:text-6xl">
            Six steps between <em className="italic text-primary">prompt</em> and{" "}
            <em className="italic">production</em>.
          </h2>
        </motion.div>
        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {pipeline.map((s, i) => (
            <motion.div
              key={s.n}
              {...fade}
              transition={{ delay: i * 0.05 }}
              className="group relative bg-background p-8 transition hover:bg-surface"
            >
              <div className="font-mono text-xs tracking-widest text-primary">{s.n}</div>
              <div className="mt-6 font-display text-3xl">{s.t}</div>
              <p className="mt-3 text-sm text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Showcase() {
  const tiles = [
    {
      name: "Aurora Bistro",
      cat: "Restaurant",
      grad: "from-amber-500/60 via-rose-500/30 to-stone-900",
    },
    { name: "Ironroot", cat: "Gym", grad: "from-lime-400/60 via-emerald-700/40 to-stone-950" },
    {
      name: "Atelier Nord",
      cat: "Portfolio",
      grad: "from-stone-200/50 via-zinc-500/30 to-stone-950",
    },
    {
      name: "Orchard Realty",
      cat: "Real Estate",
      grad: "from-emerald-400/50 via-lime-300/30 to-stone-950",
    },
  ];
  return (
    <section id="showcase" className="scroll-mt-20 px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <motion.div {...fade} className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <Chip tone="muted">Made with Lumen</Chip>
            <h2 className="mt-4 font-display text-5xl text-balance sm:text-6xl">
              Sites that don't look <em className="italic">generated.</em>
            </h2>
          </div>
          <Link to="/templates" className="text-sm text-primary hover:underline">
            Browse 120+ templates →
          </Link>
        </motion.div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {tiles.map((t, i) => (
            <motion.div
              key={t.name}
              {...fade}
              transition={{ delay: i * 0.06 }}
              className="panel group relative aspect-[4/3] overflow-hidden p-0"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${t.grad}`} />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-foreground/70">
                    {t.cat}
                  </div>
                  <div className="mt-1 font-display text-3xl">{t.name}</div>
                </div>
                <div className="rounded-full border border-foreground/20 bg-background/40 px-3 py-1 font-mono text-[10px] uppercase tracking-widest backdrop-blur">
                  Live
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: Wand2,
    t: "Prompt to product",
    d: "One sentence becomes a complete, opinionated website with content, design, and copy.",
  },
  {
    icon: Layers,
    t: "Visual + code editor",
    d: "Drag, resize, restyle — or jump into the file tree and edit React directly.",
  },
  {
    icon: Rocket,
    t: "One-click deploy",
    d: "Push to Vercel, Netlify, or a custom domain. Every change is a versioned release.",
  },
  {
    icon: Globe,
    t: "SEO from day one",
    d: "Metadata, Open Graph, sitemaps, and schema.org generated for every page.",
  },
  {
    icon: Code2,
    t: "Real code, not lock-in",
    d: "Export the full Next.js + Tailwind codebase whenever you want.",
  },
  {
    icon: Sparkles,
    t: "AI image studio",
    d: "Hero art, icons, and illustrations generated to match your palette.",
  },
];

function FeatureGrid() {
  return (
    <section className="px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <motion.div {...fade} className="max-w-2xl">
          <Chip tone="muted">Everything in one workspace</Chip>
          <h2 className="mt-4 font-display text-5xl sm:text-6xl">A studio, not a wizard.</h2>
        </motion.div>
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.t}
              {...fade}
              transition={{ delay: i * 0.04 }}
              className="panel group p-8"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-6 font-display text-2xl">{f.t}</div>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="px-6 py-32">
      <motion.div
        {...fade}
        className="panel mx-auto max-w-5xl overflow-hidden p-12 text-center shadow-[var(--shadow-glow)] sm:p-20"
      >
        <h2 className="mx-auto max-w-3xl font-display text-5xl text-balance sm:text-6xl">
          Your next site is <em className="italic text-primary">one sentence away.</em>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Open the workspace, type what you want, and watch it ship.
        </p>
        <Link
          to="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Open the workspace <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg">Lumen</span>
          <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            © 2026
          </span>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <Link to="/templates" className="hover:text-foreground">
            Templates
          </Link>
          <a href="#pipeline" className="hover:text-foreground">
            How it works
          </a>
          <a href="#showcase" className="hover:text-foreground">
            Showcase
          </a>
        </div>
      </div>
    </footer>
  );
}
