// Real source excerpts from the user's own past projects, used as style
// anchors when generating new sites: the LLM studies layout/spacing/typography/
// color-token patterns here, then writes entirely new content for the prompt
// at hand. None of these are rendered directly — they're prompt context only.

export type StyleReference = {
  id: string;
  name: string;
  categories: string[];
  description: string;
  codeExcerpt: string;
};

export const styleReferences: StyleReference[] = [
  {
    id: "ashapura-cycle-mart",
    name: "Ashapura Cycle Mart",
    categories: ["Retail", "Ecommerce", "Fitness"],
    description:
      "Bold royal-blue & orange storefront — sticky header, full-bleed gradient hero, stat counters.",
    codeExcerpt: `/* ---------- HEADER + HERO ---------- */
<header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-lg">
  <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
    <a href="#home" className="flex items-center gap-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-card">
        <Bike className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="text-base font-extrabold text-primary">Brand</div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-secondary">Tagline</div>
      </div>
    </a>
    <nav className="hidden items-center gap-7 md:flex">
      {nav.map((n) => (
        <a key={n.href} href={n.href} className="text-sm font-medium text-foreground/80 transition-smooth hover:text-primary">
          {n.label}
        </a>
      ))}
    </nav>
    <Button asChild variant="whatsapp" size="sm"><a href={WA}><MessageCircle /> WhatsApp</a></Button>
  </div>
</header>

<section className="relative overflow-hidden">
  <img src={heroImg} className="absolute inset-0 h-full w-full object-cover" />
  <div className="absolute inset-0 bg-gradient-hero" />
  <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
    <div className="max-w-3xl text-white">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm">
        <Sparkles className="h-3.5 w-3.5" /> #1 Destination In Town
      </div>
      <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
        Trusted <span className="text-secondary">Headline Accent</span> Subhead
      </h1>
      <p className="mt-5 max-w-2xl text-base text-white/90 sm:text-lg">Supporting copy goes here.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="hero" size="lg"><a href="#products">View Products <ArrowRight /></a></Button>
        <Button asChild variant="heroOutline" size="lg"><a href={WA}><MessageCircle /> WhatsApp Inquiry</a></Button>
      </div>
      <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 text-center">
        {[{ n: "500+", l: "Products" }, { n: "10+", l: "Years Trusted" }, { n: "5★", l: "Customer Rated" }].map((s) => (
          <div key={s.l}><div className="text-2xl font-extrabold text-white">{s.n}</div><div className="text-xs text-white/70">{s.l}</div></div>
        ))}
      </div>
    </div>
  </div>
</section>

/* ---------- THEME TOKENS (Tailwind v4 @theme — translate to CDN arbitrary values) ---------- */
:root {
  --primary: oklch(0.42 0.22 264); /* Royal Blue */
  --secondary: oklch(0.7 0.19 50); /* Orange */
  --accent: oklch(0.96 0.04 70);
  --gradient-hero: linear-gradient(135deg, oklch(0.32 0.22 264 / 0.92), oklch(0.45 0.24 262 / 0.85));
  --gradient-primary: linear-gradient(135deg, var(--primary), oklch(0.55 0.24 262));
  --shadow-elegant: 0 20px 50px -20px oklch(0.42 0.22 264 / 0.35);
  --font-display: "Plus Jakarta Sans", "Inter", system-ui, sans-serif;
}
h1, h2, h3, h4 { letter-spacing: -0.02em; font-weight: 700; }`,
  },
  {
    id: "raghuvir-enterprises",
    name: "Raghuvir Enterprises",
    categories: ["Ecommerce", "Startup", "Agency"],
    description:
      "Deep navy & azure-blue wholesale storefront — glow hero, gradient text, pill badges, SaaS-like polish.",
    codeExcerpt: `/* ---------- HERO ---------- */
<section className="relative overflow-hidden py-20 sm:py-28">
  <div className="absolute inset-0 hero-gradient" />
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgb(var(--primary)/0.12),transparent)]" />
  <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[rgb(var(--primary))]/5 blur-3xl pointer-events-none" />
  <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[rgb(var(--accent))]/5 blur-3xl pointer-events-none" />

  <div className="relative container-page text-center space-y-8">
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgb(var(--primary))]/30 bg-[rgb(var(--primary))]/10 text-sm text-[rgb(var(--primary))] font-medium">
      <Zap className="w-4 h-4" /> Same-day dispatch on orders before 12 PM <ChevronRight className="w-3 h-3" />
    </div>
    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight">
      Your Trusted<br /><span className="gradient-text">Wholesale Partner</span>
    </h1>
    <p className="text-lg sm:text-xl text-[rgb(var(--muted))] max-w-xl mx-auto leading-relaxed">
      Premium products at unbeatable prices — crafted for retailers and dealers who demand the best.
    </p>
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <a href="#products" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-[rgb(var(--primary))] text-[rgb(var(--bg))] font-bold text-base shadow-[0_8px_24px_rgb(var(--primary)/0.35)] hover:opacity-90 hover:-translate-y-0.5 transition-all">
        <ShoppingCart className="w-5 h-5" /> Shop Now
      </a>
      <a href="/signup" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl border border-[rgb(var(--border))] text-[rgb(var(--text))] font-semibold text-base hover:bg-[rgb(var(--elevated))] hover:-translate-y-0.5 transition-all">
        Create Account <ChevronRight className="w-4 h-4" />
      </a>
    </div>
  </div>
</section>

/* ---------- THEME TOKENS (RGB-triplet system — translate to CDN arbitrary values) ---------- */
:root {
  --bg: 11 16 32;          /* #0B1020 Deep navy background */
  --primary: 91 155 255;   /* #5B9BFF Azure */
  --secondary: 240 180 41; /* #F0B429 Amber */
  --accent: 124 246 214;   /* #7CF6D6 Mint */
  --text: 234 240 255;     /* #EAF0FF */
  --muted: 166 178 208;    /* #A6B2D0 */
  --radius-2xl: 32px;
}
h1, h2, h3, h4, h5, h6 { font-weight: 700; line-height: 1.25; letter-spacing: -0.02em; }
h1 { font-size: clamp(2rem, 3.4vw, 3.25rem); }`,
  },
  {
    id: "star-electronics-hub",
    name: "Star Electronics Hub",
    categories: ["Ecommerce", "Retail"],
    description:
      "Black & gold luxe electronics retail — glowing gold accents, serif headings, premium bordered tiles.",
    codeExcerpt: `/* ---------- HERO ---------- */
function Hero({ onInquire }) {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={hero} className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-radial-gold)" }} />
      </div>
      <div className="relative container mx-auto px-4 pt-16 pb-24 sm:pt-24 sm:pb-32 text-center">
        <img src={logoImg} className="mx-auto h-32 sm:h-40 w-auto rounded-xl shadow-gold-lg animate-float" />
        <div className="mt-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/5 text-xs uppercase tracking-[0.25em] text-primary animate-fade-up">
          <Sparkles className="h-3.5 w-3.5" /> Premium Quality
        </div>
        <h1 className="mt-6 font-display text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] animate-fade-up">
          <span className="text-gold-gradient">Your One-Stop</span><br />
          <span className="shimmer-gold">Headline Accent</span><br />
          <span className="text-foreground">Destination</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground animate-fade-up">Supporting copy goes here.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3 animate-fade-up">
          <Button variant="whatsapp" size="lg" className="h-12 px-6 text-base"><MessageCircle className="h-5 w-5" /> Contact on WhatsApp</Button>
          <Button variant="gold" size="lg" className="h-12 px-6 text-base"><Wrench className="h-5 w-5" /> Request Service</Button>
        </div>
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[[<Award />, "10+ Yrs", "Experience"], [<Users />, "5000+", "Happy Customers"]].map(([icon, big, small], i) => (
            <div key={i} className="premium-card rounded-xl p-4">
              <div className="text-primary mx-auto w-fit">{icon}</div>
              <div className="mt-2 font-display text-xl text-gold-gradient font-bold">{big}</div>
              <div className="text-xs text-muted-foreground">{small}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="gold-divider" />
    </section>
  );
}

/* ---------- PRODUCT CARD GRID ---------- */
<div className="mt-14 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
  {products.map((p) => (
    <article key={p.name} className="premium-card rounded-2xl overflow-hidden group">
      <div className="aspect-square overflow-hidden bg-black relative">
        <img src={p.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute top-3 left-3 px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-full bg-background/70 border border-primary/40 text-primary backdrop-blur-sm">{p.category}</div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-1">{p.name}</h3>
        <Button variant="gold" size="sm" className="mt-3 w-full">Get Price / Inquiry</Button>
      </div>
    </article>
  ))}
</div>

/* ---------- THEME TOKENS (Tailwind v4 @theme — translate to CDN arbitrary values) ---------- */
:root {
  --background: oklch(0.08 0.005 60);
  --foreground: oklch(0.97 0.01 80);
  --primary: oklch(0.82 0.16 84); /* gold */
  --gradient-gold: linear-gradient(135deg, oklch(0.92 0.13 90), oklch(0.78 0.17 80), oklch(0.55 0.13 65));
  --shadow-gold: 0 10px 40px -10px oklch(0.82 0.16 84 / 0.45);
  --font-display: "Playfair Display", "Cinzel", serif;
}
.premium-card { background: linear-gradient(160deg, oklch(0.14 0.01 60), oklch(0.1 0.008 60)); border: 1px solid oklch(0.82 0.16 84 / 0.22); transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1); }
.premium-card:hover { transform: translateY(-4px); border-color: oklch(0.82 0.16 84 / 0.55); }
.text-gold-gradient { background: var(--gradient-gold); -webkit-background-clip: text; background-clip: text; color: transparent; }`,
  },
  {
    id: "banarasi-jewellers",
    name: "Banarasi Jewellers",
    categories: ["Ecommerce", "Healthcare", "Real Estate"],
    description:
      "Ivory & gold luxury jewellery — cinematic full-bleed hero, serif headings, glassy masonry galleries.",
    codeExcerpt: `/* ---------- HERO ---------- */
function Hero() {
  return (
    <section id="home" className="relative min-h-screen overflow-hidden bg-ink">
      <img src={hero} className="absolute inset-0 h-full w-full object-cover opacity-70 animate-slow-zoom" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/45 to-ink" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-5 lg:px-10 pt-32 pb-20">
        <div className="max-w-3xl animate-rise">
          <div className="inline-flex items-center gap-2 rounded-full glass-dark px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-gold">
            <Sparkles size={12} /> Est. Since Generations
          </div>
          <h1 className="mt-6 font-display text-5xl sm:text-7xl lg:text-8xl leading-[0.95] text-ivory">
            Timeless Elegance,<br /><span className="text-gold-gradient italic">Crafted for</span> Generations
          </h1>
          <p className="mt-7 max-w-xl text-lg text-ivory/75 leading-relaxed">Discover something designed to celebrate life's most precious moments.</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#collections" className="group inline-flex items-center gap-3 rounded-full bg-gold-gradient px-7 py-4 text-sm uppercase tracking-[0.2em] text-ink font-medium shadow-luxe hover:brightness-110 transition">
              View Collection <ArrowRight size={16} className="transition group-hover:translate-x-1" />
            </a>
          </div>
          <div className="mt-14 grid grid-cols-3 gap-6 max-w-lg">
            {[{ n: "100%", l: "Certified Purity" }, { n: "25+", l: "Years of Trust" }, { n: "10K+", l: "Happy Families" }].map((s) => (
              <div key={s.l} className="border-l border-gold/40 pl-4">
                <div className="font-display text-3xl text-gold-gradient">{s.n}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ivory/60">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- CARD GRID ---------- */
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
  {collections.map((c) => (
    <a key={c.title} href="#gallery" className="group relative overflow-hidden rounded-3xl bg-ink aspect-[3/4] shadow-soft hover:shadow-luxe transition-all duration-500">
      <img src={c.img} className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-[1200ms] group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
      <div className="absolute top-5 left-5"><span className="rounded-full glass-dark px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-gold">{c.tag}</span></div>
      <div className="absolute bottom-0 inset-x-0 p-6">
        <h3 className="font-display text-2xl text-ivory">{c.title}</h3>
        <p className="mt-1 text-sm text-ivory/70">{c.desc}</p>
      </div>
    </a>
  ))}
</div>

/* ---------- THEME TOKENS (Tailwind v4 @theme — translate to CDN arbitrary values) ---------- */
:root {
  --gold: oklch(0.78 0.13 84); /* #D4AF37 */
  --ink: oklch(0.16 0.005 60);
  --ivory: oklch(0.975 0.012 85);
  --gradient-gold: linear-gradient(135deg, #b8860b 0%, #d4af37 35%, #f5d97a 55%, #d4af37 75%, #8b6914 100%);
  --shadow-luxe: 0 30px 80px -30px rgba(212, 175, 55, 0.35);
  --font-display: "Cormorant Garamond", serif;
}
h1, h2, h3, h4 { font-family: var(--font-display); font-weight: 500; letter-spacing: -0.01em; }
.glass { background: color-mix(in oklab, white 55%, transparent); backdrop-filter: blur(18px) saturate(140%); }`,
  },
  {
    id: "royal-clicks-portfolio",
    name: "The Royal Clicks",
    categories: ["Portfolio", "Agency"],
    description:
      "Moody dark editorial photography portfolio — script accent font, masonry grid, ornamented dividers.",
    codeExcerpt: `/* ---------- HERO ---------- */
function Hero() {
  return (
    <section id="top" className="relative flex min-h-screen items-center justify-center overflow-hidden pt-24">
      <img src={hero} className="absolute inset-0 h-full w-full object-cover opacity-55" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,oklch(0.09_0.005_60)_85%)]" />
      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        <img src={logo} className="mx-auto mb-6 h-24 w-24 rounded-full object-cover ring-2 ring-gold/50 shadow-glow animate-float" />
        <p className="font-script text-3xl text-gold mb-2">Studio presents</p>
        <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight sm:text-7xl md:text-8xl">
          <span className="text-gold-gradient">Capturing Moments</span><br />
          <span className="italic text-ivory">That Last Forever</span>
        </h1>
        <div className="divider-ornament mx-auto my-6 max-w-md"><Sparkles className="h-4 w-4" /></div>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">Premium services description goes here.</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" className="bg-gradient-to-r from-gold-soft via-gold to-bronze text-primary-foreground font-semibold tracking-wide shadow-glow hover:opacity-95">Book Now</Button>
          <Button size="lg" variant="outline" className="border-gold/40 text-gold hover:bg-gold/10"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Now</Button>
        </div>
      </div>
    </section>
  );
}

/* ---------- MASONRY GRID ---------- */
<div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [column-fill:_balance]">
  {galleryImages.map((img, i) => (
    <button key={i} className="group relative mb-4 block w-full overflow-hidden rounded-lg break-inside-avoid border border-gold/10 shadow-luxury">
      <img src={img.src} className="w-full transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="absolute bottom-0 left-0 right-0 translate-y-4 p-4 text-left opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
        <div className="text-xs uppercase tracking-widest text-gold">{img.category}</div>
        <div className="font-display text-lg text-ivory">{img.alt}</div>
      </div>
    </button>
  ))}
</div>

/* ---------- THEME TOKENS (Tailwind v4 @theme — translate to CDN arbitrary values) ---------- */
:root {
  --gold: oklch(0.78 0.13 75);
  --bronze: oklch(0.55 0.1 55);
  --ivory: oklch(0.97 0.012 80);
  --background: oklch(0.09 0.005 60);
  --gradient-gold: linear-gradient(135deg, oklch(0.88 0.1 80), oklch(0.72 0.14 70), oklch(0.55 0.1 55));
  --shadow-glow: 0 0 60px -10px oklch(0.78 0.13 75 / 0.35);
  --font-display: "Cormorant Garamond", serif;
  --font-script: "Great Vibes", cursive;
}
.divider-ornament { display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: var(--gold); }
.divider-ornament::before, .divider-ornament::after { content: ""; height: 1px; flex: 1; max-width: 80px; background: linear-gradient(90deg, transparent, var(--gold), transparent); }`,
  },
  {
    id: "arush-graphics",
    name: "Arush Graphics Designer",
    categories: ["Agency", "Startup", "Portfolio"],
    description:
      "Energetic near-black creative-agency theme — gold-to-orange gradients, shimmer text, glass service cards.",
    codeExcerpt: `/* ---------- HERO ---------- */
<section id="home" className="relative pt-32 pb-24 md:pt-44 md:pb-32">
  <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
  <div className="absolute inset-0 -z-10 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
  <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-2 gap-12 items-center">
    <div>
      <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-[color:var(--gold)]">
        <Sparkles size={14} /> Creative Studio
      </span>
      <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]">
        Transforming Ideas Into <span className="shimmer-text">Stunning Visual</span> <span className="text-gradient-gold">Designs</span>
      </h1>
      <p className="mt-6 text-base sm:text-lg text-white/70 max-w-xl">Description of the service offering goes here.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="#contact" className="btn-gold rounded-full px-7 py-3.5 text-sm inline-flex items-center gap-2">Get Free Quote <ArrowRight size={16} /></a>
        <a href="#" className="btn-outline-gold rounded-full px-7 py-3.5 text-sm inline-flex items-center gap-2"><MessageCircle size={16} /> WhatsApp Now</a>
      </div>
      <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
        {[["500+", "Projects"], ["100+", "Clients"], ["24/7", "Support"]].map(([n, l]) => (
          <div key={l}><div className="text-2xl sm:text-3xl font-bold text-gradient-gold">{n}</div><div className="text-xs uppercase tracking-wider text-white/50 mt-1">{l}</div></div>
        ))}
      </div>
    </div>
    <div className="relative mx-auto max-w-md aspect-square">
      <div className="absolute inset-0 rounded-full blur-3xl opacity-60" style={{ background: "var(--gradient-gold)" }} />
      <div className="relative h-full w-full grid place-items-center animate-float">
        <img src={logo} className="relative w-[78%] h-[78%] object-contain rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.6)]" />
      </div>
    </div>
  </div>
</section>

/* ---------- SERVICE CARD GRID ---------- */
<div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
  {services.map((s) => (
    <div key={s.title} className="group relative rounded-2xl glass p-6 h-full overflow-hidden transition hover:-translate-y-1 hover:border-[color:var(--gold)]/40">
      <div className="grid place-items-center h-12 w-12 rounded-xl text-[color:var(--ink)]" style={{ background: "var(--gradient-gold)" }}><s.icon size={22} /></div>
      <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
      <p className="mt-2 text-sm text-white/65">{s.desc}</p>
    </div>
  ))}
</div>

/* ---------- THEME TOKENS (Tailwind v4 @theme — translate to CDN arbitrary values) ---------- */
:root {
  --gold: oklch(0.82 0.16 82);   /* #F5B000 */
  --orange: oklch(0.74 0.19 50); /* #FF7A00 */
  --background: oklch(0.09 0.003 60);
  --gradient-gold: linear-gradient(135deg, oklch(0.82 0.16 82), oklch(0.74 0.19 50));
  --shadow-gold: 0 20px 60px -20px oklch(0.74 0.19 50 / 0.55);
  --font-display: "Playfair Display", serif;
}
.glass { background: oklch(1 0 0 / 0.04); backdrop-filter: blur(16px); border: 1px solid oklch(1 0 0 / 0.08); }
.shimmer-text { background: linear-gradient(90deg, oklch(0.82 0.16 82), oklch(1 0 0), oklch(0.74 0.19 50), oklch(0.82 0.16 82)); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: shimmer 4s linear infinite; }`,
  },
];

export function getStyleReference(id: string | undefined) {
  return styleReferences.find((r) => r.id === id);
}
