import OpenAI from "openai";

let client: OpenAI | undefined;

function getClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing OPENAI_API_KEY. Copy .dev.vars.example to .env and fill in your OpenAI API key.",
      );
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

function getModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

// Approximate cost in USD for a given model and token counts.
// Used only for internal rate-limiting; never shown as a dollar figure to users.
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing: Record<string, { inp: number; out: number }> = {
    "gpt-5.5": { inp: 5, out: 30 },
    "gpt-5.4": { inp: 2.5, out: 15 },
    "gpt-4o-mini": { inp: 0.15, out: 0.6 },
    "gpt-4o": { inp: 2.5, out: 10 },
    "gpt-4-turbo": { inp: 10, out: 30 },
    "gpt-3.5-turbo": { inp: 0.5, out: 1.5 },
  };
  const p = pricing[model] ?? { inp: 2.5, out: 10 }; // conservative fallback
  return (inputTokens * p.inp + outputTokens * p.out) / 1_000_000;
}

const SYSTEM_PROMPT = `You are an elite UI/UX designer and senior frontend engineer at a world-class product studio. Your websites rival Dribbble showcases and Awwwards winners. Every output must look like a $50,000 professional studio build.

════════════════════════════════════════
OUTPUT RULE (NON-NEGOTIABLE)
════════════════════════════════════════
Output ONLY the raw HTML document — zero markdown, zero commentary, zero code fences.
Begin with <!doctype html> and close with </html>. Nothing before, nothing after.

════════════════════════════════════════
1. TYPOGRAPHY — always do this
════════════════════════════════════════
Import exactly 2 Google Fonts inside a <style> block using @import (faster than <link>).
Pick a bold display font for headings + a clean sans-serif for body. Great pairings:
  • "Playfair Display" + "Inter"
  • "Space Grotesk" + "DM Sans"
  • "Fraunces" + "Plus Jakarta Sans"
  • "Syne" + "Outfit"
  • "Cal Sans" + "Satoshi" (use Poppins as fallback for Cal Sans)
  • "Cormorant Garamond" + "Jost"

Hero headline: 72–96px, font-weight 800–900, line-height 0.95–1.05, letter-spacing -0.03em to -0.05em.
Section headings: 44–56px, weight 700, letter-spacing -0.02em.
Body text: 17–18px, line-height 1.65, max-width 64ch.
Subheadings/labels: 11–12px uppercase, letter-spacing 0.12em, weight 600, muted color.

════════════════════════════════════════
2. COLOR SYSTEM — CSS custom properties
════════════════════════════════════════
Define on :root. Never use plain white (#ffffff) as the only background — always a subtle warm/cool tint or go full dark.
Dark theme example:
  --bg: #0a0a0f; --surface: #12121a; --surface-2: #1a1a26;
  --border: rgba(255,255,255,0.08); --text: #f0f0f8; --text-muted: #8888aa;
  --primary: #7c3aed; --primary-light: rgba(124,58,237,0.15);
Light theme example:
  --bg: #fafaf8; --surface: #ffffff; --surface-2: #f4f4f0;
  --border: rgba(0,0,0,0.08); --text: #111118; --text-muted: #6b7280;
  --primary: #2563eb; --primary-light: rgba(37,99,235,0.1);
Map palette mood to these tokens:
  "Minimal / Clean" → warm light neutral bg, cobalt or slate primary
  "Bold / Vibrant" → deep dark bg, electric violet or hot coral primary
  "Pastel / Soft" → very light cream bg, dusty rose or sage primary
  "Dark / Dramatic" → near-black bg, gold or electric blue primary
  "Earthy / Natural" → warm sand bg, forest green or terracotta primary
  "Tech / Futuristic" → cool dark slate bg, cyan or neon green primary

════════════════════════════════════════
3. LAYOUT & SPACING
════════════════════════════════════════
Max content width: 1200px centered with auto margins.
Section vertical padding: 120px top & bottom (shrinks to 64px on mobile).
Use CSS Grid for multi-column layouts, Flexbox for alignment.
Generous gap between elements — never cramped.
Sections must alternate visual weight: one section with bg, next without.

════════════════════════════════════════
4. VISUAL EFFECTS (scale to motion level)
════════════════════════════════════════
Cinematic / Playful → FULL EFFECTS:
  • Hero: multi-stop gradient bg (3+ colors, rotated angle) + floating glow orbs using radial-gradient blobs, position absolute, blur(80px), opacity 0.5–0.7, z-index 0
  • Gradient text: background: linear-gradient(...); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text
  • Glassmorphism cards: background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px
  • Elevated shadows with brand color: box-shadow: 0 24px 64px -12px rgba(VAR_PRIMARY_RGB, 0.35)
  • CSS @keyframes: fadeInUp (translateY 32px→0, opacity 0→1, 0.6s ease-out), scaleIn (scale 0.92→1), shimmer
  • Staggered animation-delay on cards: 0s, 0.1s, 0.2s, 0.3s
  • IntersectionObserver scroll reveal: add class "revealed" when element enters viewport
  • CRITICAL — hero is ALWAYS visible: NEVER set hero section or its children to opacity:0 via JS or CSS. Hero content must be visible immediately on page load with CSS animations (animation: fadeInUp 0.6s ease-out forwards). Only apply IntersectionObserver to sections BELOW the hero. IntersectionObserver must also use {rootMargin:'0px 0px -50px 0px', threshold:0.1} and immediately reveal any element whose getBoundingClientRect().top < window.innerHeight on DOMContentLoaded.
  • Button hover: translateY(-3px) + brighter gradient + stronger shadow
  • Nav links: animated underline via ::after pseudo-element scaleX 0→1

Subtle → hover transforms, box-shadow transitions, no keyframes
None → static layout only, no transitions

════════════════════════════════════════
5. MANDATORY PAGE SECTIONS (build ALL of these)
════════════════════════════════════════

NAVIGATION (sticky):
  • backdrop-filter: blur(20px); background: rgba(bg, 0.85); border-bottom: 1px solid var(--border)
  • Logo (text or inline SVG) left | Nav links center | CTA button right
  • CTA button: gradient, rounded-full, weight 600, 12px 24px padding
  • Functional mobile hamburger menu with JS toggle (slide-down menu)

HERO SECTION (min-height: 92vh, flex center):
  • Overline: small uppercase label (e.g. "✦ Introducing [Product]" or "New · Version 2.0")
  • Headline: HUGE, bold, multi-line, includes 1 gradient-text span for a key word
  • Subheadline: 2–3 sentences, max-width 540px, muted color, 18–19px
  • 2 CTAs: primary (gradient + icon arrow →) + secondary (ghost/outline or text link)
  • Visual element (pick one):
      – Floating UI mockup cards (CSS only, with fake stats/content)
      – Abstract CSS art (geometric shapes, gradient circles)
      – Large emoji or inline SVG illustration
      – Grid of product screenshots (gradient placeholders)
  • Background: gradient + glow orbs if Cinematic, solid tint if Subtle

SOCIAL PROOF BAR (between hero and features):
  • "Trusted by 10,000+ businesses worldwide" or similar
  • 4–5 fake company logos as styled text spans (different fonts, weights, opacities) OR
    3–4 bold stat numbers (e.g. "98% — Customer satisfaction", "2M+ — Websites built")

FEATURES SECTION:
  • Eyebrow label + section heading + short paragraph
  • 3–6 feature cards in a CSS Grid (auto-fit, minmax(300px,1fr))
  • Each card: gradient icon container (48px, border-radius: 14px) + bold title + 2–3 sentence description
  • Card style: glassmorphism or elevated surface with hover: translateY(-6px) + shadow

HOW IT WORKS / PROCESS (3 steps):
  • Numbered steps (large gradient number, title, description)
  • Can be horizontal timeline or vertical with connecting line

TESTIMONIALS:
  • 2–3 cards: blockquote text, star rating (★★★★★ in primary color), avatar (CSS gradient circle with initials), name, job title
  • Grid layout

PRICING (if product/SaaS):
  • 2–3 tiers; recommended tier has gradient border + badge "Most Popular"
  • Feature list with ✓ checkmarks in primary color

FINAL CTA SECTION:
  • Full-width gradient background (brand colors)
  • Large bold headline + subheadline
  • Primary button (light-colored on dark gradient bg)
  • Subtle grid/noise texture overlay optional

FOOTER:
  • Dark bg (var(--bg) if dark theme, else #111118)
  • Logo + 1-line tagline
  • 3–4 column nav links
  • Bottom bar: copyright + social icon links (inline SVG for Twitter/X, LinkedIn, GitHub, Instagram)

════════════════════════════════════════
6. BUTTONS & INTERACTIVE ELEMENTS
════════════════════════════════════════
Primary button:
  background: linear-gradient(135deg, var(--primary), [secondary accent]);
  color: white; border: none; border-radius: 50px; padding: 14px 32px;
  font-weight: 600; font-size: 15px; letter-spacing: 0.02em;
  box-shadow: 0 8px 32px rgba(primary_rgb, 0.4);
  transition: all 0.25s ease; cursor: pointer;
  &:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(primary_rgb, 0.55); }

Ghost/outline button:
  background: transparent; border: 1.5px solid var(--border);
  &:hover { border-color: var(--primary); color: var(--primary); }

Links in nav: position relative; font-weight: 500;
  ::after { content:''; position:absolute; bottom:-2px; left:0; width:100%; height:2px; background:var(--primary); transform:scaleX(0); transition:transform 0.25s; transform-origin:left; }
  :hover::after { transform:scaleX(1); }

════════════════════════════════════════
7. RESPONSIVE DESIGN
════════════════════════════════════════
Mobile breakpoint at 768px:
  • Hero headline: 40–48px
  • Section padding: 64px
  • All grids collapse to 1 column
  • Nav collapses to hamburger
  • Font sizes scale down proportionally

════════════════════════════════════════
8. CONTENT QUALITY
════════════════════════════════════════
Write REAL, compelling copy — not lorem ipsum, not generic filler.
Study the business type and write copy that a real marketing team would be proud of.
Specific, benefit-driven headlines. Concrete numbers in stats. Believable testimonials with real-sounding names and companies.
Write all copy in the requested language.

════════════════════════════════════════
9. TECHNICAL RULES
════════════════════════════════════════
• Use <script src="https://cdn.tailwindcss.com"></script> for utility classes where helpful
• Prefer raw CSS in <style> for all custom design work (the Tailwind CDN doesn't support @theme or custom properties)
• No external image URLs (may 404) — use CSS gradients, inline SVG, emoji, or base64 placeholders
• No network requests in JS
• Semantic HTML5 (nav, main, section, article, footer)
• One <h1> in the hero only; all other top-level headings are <h2>`;

const REVISE_SYSTEM_PROMPT = `You are an elite frontend engineer. You will receive an existing website HTML and an instruction to apply.
Apply ONLY the requested change — preserve all other design decisions, styles, and content exactly.
Output ONLY the complete updated raw HTML document. No markdown, no commentary, nothing before <!doctype html> or after </html>.`;

export type GenerateResult = { html: string; costUsd: number };

export type ClarificationQuestion = {
  id: string;
  question: string;
  options: string[]; // last option is always "Other — describe below"
};

export type ClarificationResult =
  { needsClarification: false } | { needsClarification: true; questions: ClarificationQuestion[] };

// Analyzes a prompt to decide if clarifying questions are needed before generation.
// Uses gpt-4o-mini for speed and low cost — this runs before every generation attempt.
export async function analyzePromptForClarification(prompt: string): Promise<ClarificationResult> {
  const systemPrompt = `You are a website prompt analyzer. Your job: decide whether the user's website prompt is specific enough to generate a great website, or whether targeted clarifying questions would help.

A prompt is SPECIFIC ENOUGH if it mentions: the website type/category AND some context (business name, purpose, target audience, features, or industry details).
Examples of SPECIFIC ENOUGH: "A premium Italian restaurant in Mumbai called Bella Vista with online reservations and seasonal menus", "My photography portfolio showcasing landscape and wedding photos", "An e-commerce store selling handmade leather bags"

A prompt NEEDS CLARIFICATION if it's vague: missing website type, missing purpose, or just a keyword with no context.
Examples that NEED CLARIFICATION: "make a website", "I need a website", "business", "portfolio", "startup", "blue and modern"

If it NEEDS CLARIFICATION, generate 2–3 SHORT targeted questions. Each question must have exactly 4 options where the last one is always "Other — describe below". Questions should be contextual to what's actually missing.

Respond in JSON only. No explanation. Format:
If specific enough: {"needsClarification": false}
If needs clarification: {"needsClarification": true, "questions": [{"id": "q1", "question": "...", "options": ["...", "...", "...", "Other — describe below"]}, ...]}`;

  const completion = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this website prompt: "${prompt}"` },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  try {
    // Extract JSON even if wrapped in markdown fences
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    if (parsed.needsClarification === false) return { needsClarification: false };
    if (parsed.needsClarification === true && Array.isArray(parsed.questions)) {
      return { needsClarification: true, questions: parsed.questions };
    }
  } catch {
    // If parsing fails, proceed without clarification
  }
  return { needsClarification: false };
}

// Expands a short prompt into a detailed website generation prompt.
// Uses a cheaper fast model to keep cost minimal.
export async function enhanceUserPrompt(shortPrompt: string): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 350,
    messages: [
      {
        role: "system",
        content: `You are a professional web designer's prompt enhancer. Take a short website description and expand it into a rich, detailed prompt for an AI website generator. Include: specific sections to build (hero, features, pricing, testimonials, contact, etc.), animations, visual style, responsive layout, typography, colors, and copy tone. Return ONLY the enhanced prompt text — no intro, no explanation, no quotation marks. Maximum 220 words. Be specific and professional.`,
      },
      {
        role: "user",
        content: `Enhance this website prompt: ${shortPrompt}`,
      },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? shortPrompt;
}

function extractHtml(raw: string): string {
  const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  return candidate.trim();
}

const NEURAXINE_BADGE = `
<!-- Neuraxine Badge -->
<style>
#__neuraxine-badge{position:fixed;bottom:20px;right:20px;z-index:2147483647;display:flex;align-items:center;gap:0;font-family:system-ui,-apple-system,sans-serif;}
#__neuraxine-btn{display:flex;align-items:center;gap:8px;background:#09090b;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:8px 16px 8px 12px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;letter-spacing:-0.01em;box-shadow:0 4px 24px rgba(0,0,0,0.35);transition:all 0.2s;}
#__neuraxine-btn:hover{background:#18181b;transform:translateY(-1px);box-shadow:0 6px 32px rgba(0,0,0,0.45);}
#__neuraxine-btn svg{width:16px;height:16px;}
#__neuraxine-close{display:flex;align-items:center;justify-content:center;width:22px;height:22px;background:#09090b;border:1px solid rgba(255,255,255,0.12);border-radius:50%;color:rgba(255,255,255,0.6);font-size:11px;cursor:pointer;margin-left:4px;transition:all 0.2s;flex-shrink:0;}
#__neuraxine-close:hover{color:#fff;background:#3f3f46;}
#__neuraxine-overlay{display:none;position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);align-items:center;justify-content:center;}
#__neuraxine-overlay.open{display:flex;}
#__neuraxine-modal{background:#09090b;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:32px;max-width:360px;width:calc(100% - 40px);text-align:center;color:#fff;font-family:system-ui,-apple-system,sans-serif;}
#__neuraxine-modal h2{font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.02em;}
#__neuraxine-modal p{font-size:14px;color:rgba(255,255,255,0.6);margin:0 0 24px;line-height:1.6;}
#__neuraxine-modal .price{font-size:36px;font-weight:800;color:#fff;letter-spacing:-0.03em;margin-bottom:4px;}
#__neuraxine-modal .price span{font-size:16px;font-weight:400;color:rgba(255,255,255,0.4);}
.n-upgrade-btn{display:block;width:100%;padding:14px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-top:16px;text-decoration:none;transition:opacity 0.2s;}
.n-upgrade-btn:hover{opacity:0.9;}
.n-dismiss{display:block;margin-top:12px;font-size:13px;color:rgba(255,255,255,0.4);cursor:pointer;background:none;border:none;width:100%;}
.n-dismiss:hover{color:rgba(255,255,255,0.7);}
</style>
<div id="__neuraxine-badge">
  <a id="__neuraxine-btn" href="https://www.neuraxine.com" target="_blank" rel="noopener">
    <svg viewBox="0 0 24 24" fill="none"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" fill="white"/><line x1="20" y1="3" x2="20" y2="7" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="22" y1="5" x2="18" y2="5" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="4" y1="17" x2="4" y2="21" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="19" x2="2" y2="19" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>
    Edit with Neuraxine
  </a>
  <button id="__neuraxine-close" onclick="document.getElementById('__neuraxine-overlay').classList.add('open')" aria-label="Upgrade">✕</button>
</div>
<div id="__neuraxine-overlay" onclick="if(event.target===this)this.classList.remove('open')">
  <div id="__neuraxine-modal">
    <div style="font-size:32px;margin-bottom:12px">✨</div>
    <h2>Upgrade to Pro</h2>
    <p>Unlock unlimited websites, custom domains, priority AI, and remove all branding.</p>
    <div class="price">₹500<span>/month</span></div>
    <a class="n-upgrade-btn" href="https://www.neuraxine.com" target="_blank" rel="noopener">Upgrade to Pro →</a>
    <button class="n-dismiss" onclick="document.getElementById('__neuraxine-overlay').classList.remove('open')">Maybe later</button>
  </div>
</div>
<script>
// Safety net: reveal elements hidden by scroll animations that are already in the viewport.
// Runs immediately + after 400ms to catch both sync and async JS initialisation.
(function revealAboveFold(){
  var els = document.querySelectorAll('.reveal,.scroll-reveal,.fade-in,.animate-on-scroll,[data-aos]');
  for(var i=0;i<els.length;i++){
    var r=els[i].getBoundingClientRect();
    if(r.top<window.innerHeight){
      els[i].classList.add('revealed','visible','aos-animate','active','in-view');
      els[i].style.opacity='';
      els[i].style.transform='';
    }
  }
}());
window.addEventListener('DOMContentLoaded',function(){
  setTimeout(function(){
    var els=document.querySelectorAll('.reveal,.scroll-reveal,.fade-in,.animate-on-scroll,[data-aos]');
    for(var i=0;i<els.length;i++){
      var r=els[i].getBoundingClientRect();
      if(r.top<window.innerHeight){
        els[i].classList.add('revealed','visible','aos-animate','active','in-view');
        els[i].style.opacity='';
        els[i].style.transform='';
      }
    }
  },300);
});
</script>
<!-- /Neuraxine Badge -->
`;

export function injectNeuraxineBadge(html: string): string {
  if (html.includes("__neuraxine-badge")) return html;
  if (html.includes("</body>")) {
    return html.replace("</body>", NEURAXINE_BADGE + "\n</body>");
  }
  if (html.includes("</html>")) {
    return html.replace("</html>", NEURAXINE_BADGE + "\n</html>");
  }
  return html + NEURAXINE_BADGE;
}

export type IntegrationContext = {
  userId: string;
  hasGmail: boolean;
  hasSheets: boolean;
  hasCalendar: boolean;
  hasRazorpay: boolean;
};

function buildIntegrationPrompt(ctx: IntegrationContext): string {
  const base = (process.env.APP_URL ?? "https://websitebuilder.neuraxine.com").replace(/\/$/, "");
  const lines: string[] = [
    "════════════════════════════════════════",
    "CONNECTOR INTEGRATIONS (use only when the request calls for it)",
    "════════════════════════════════════════",
    "The following API endpoints are available for this user's website.",
    "Use fetch() to call them client-side when appropriate (contact form, booking, payment, etc.).",
    "All endpoints accept Content-Type: application/json and return { ok: true, ... } or { ok: false, error: '...' }.",
    "",
  ];

  if (ctx.hasGmail) {
    lines.push(
      `EMAIL (Gmail) → POST ${base}/api/integrate/${ctx.userId}/gmail`,
      `  Body: { "to": "visitor@email.com", "subject": "...", "body": "..." }`,
      `  Returns: { ok: true, messageId: "..." }`,
      `  Use for: contact forms, newsletter signups, booking confirmations.`,
      "",
    );
  }
  if (ctx.hasSheets) {
    lines.push(
      `SPREADSHEET (Google Sheets) → POST ${base}/api/integrate/${ctx.userId}/sheets`,
      `  Body: { "spreadsheetId": "YOUR_SHEET_ID", "values": ["col1", "col2", ...] }`,
      `  Returns: { ok: true, updates: { ... } }`,
      `  Use for: saving form submissions to a spreadsheet. Add a comment in code: // Replace YOUR_SHEET_ID with actual Google Sheets ID`,
      "",
    );
  }
  if (ctx.hasCalendar) {
    lines.push(
      `CALENDAR (Google Calendar) → POST ${base}/api/integrate/${ctx.userId}/calendar`,
      `  Body: { "title": "Appointment", "start": "2024-01-15T10:00:00", "end": "2024-01-15T11:00:00", "description": "..." }`,
      `  Returns: { ok: true, eventId: "...", htmlLink: "..." }`,
      `  Use for: appointment booking forms, event registrations.`,
      "",
    );
  }
  if (ctx.hasRazorpay) {
    lines.push(
      `PAYMENT (Razorpay) → POST ${base}/api/integrate/${ctx.userId}/razorpay-order`,
      `  Body: { "amount": 49900, "currency": "INR", "receipt": "order_001" } (amount in paise: 49900 = ₹499)`,
      `  Returns: { ok: true, orderId: "...", amount: 49900, currency: "INR", key: "rzp_..." }`,
      `  Use for: product purchase, service fee, donation buttons.`,
      `  After getting the response, open the Razorpay checkout like this:`,
      `  Load https://checkout.razorpay.com/v1/checkout.js then call:`,
      `  new Razorpay({ key: resp.key, amount: resp.amount, currency: resp.currency, order_id: resp.orderId, handler: fn }).open()`,
      "",
    );
  }

  return lines.join("\n");
}

export async function generateSite(opts: {
  prompt: string;
  category: string;
  palette: string;
  motion: string;
  language: string;
  theme?: string;
  font?: string;
  referenceUrl?: string;
  imageUrls?: string[];
  styleReference?: { name: string; code: string };
  integrations?: IntegrationContext;
}): Promise<GenerateResult> {
  const userMessage = [
    `Build a stunning, award-worthy website for this request:`,
    `"${opts.prompt}"`,
    ``,
    `Category: ${opts.category}`,
    `Color palette mood: ${opts.palette}`,
    opts.theme ? `Visual theme style: ${opts.theme}` : null,
    opts.font ? `Primary font family: ${opts.font} (import from Google Fonts)` : null,
    `Motion / animation level: ${opts.motion}`,
    `Language for all copy: ${opts.language}`,
    opts.referenceUrl
      ? `Reference website for style inspiration (match its visual language, not content): ${opts.referenceUrl}`
      : null,
    ``,
    `Design bar: this must look like it was built by a $50k/project design studio.`,
    `Use the full design system from the system prompt — typography, glow orbs, glassmorphism cards, gradient text, scroll animations, and all mandatory sections.`,
    `Make the copy specific and compelling for this exact business type — no generic filler.`,
  ]
    .filter(Boolean)
    .join("\n");

  let systemPrompt = SYSTEM_PROMPT;
  const urls = opts.imageUrls?.filter(Boolean) ?? [];
  if (urls.length === 1) {
    systemPrompt += `\n\nIMAGE REFERENCE: The user provided a reference image at this URL: ${urls[0]}\nUse it directly in an <img src="${urls[0]}" alt="..."> in the hero or a fitting gallery section — it resolves safely. Also draw the color/mood of the design from this image.`;
  } else if (urls.length > 1) {
    const list = urls.map((u, i) => `Image ${i + 1}: ${u}`).join("\n");
    systemPrompt += `\n\nIMAGE REFERENCES: The user provided ${urls.length} reference images. Use them in <img> tags throughout the page (hero, gallery, about, team sections etc.) — all URLs resolve safely.\n${list}\nDraw the overall color palette and mood from these images.`;
  }
  if (opts.styleReference) {
    systemPrompt += `\n\nSTYLE REFERENCE — "${opts.styleReference.name}": The code below is from the user's own previous project. Study ONLY its visual patterns: layout rhythm, spacing scale, typography choices, color depth, card polish, shadow treatment, glassmorphism, gradients. Match or exceed that quality level. Do NOT copy any business name, copy, contact info, or images — write entirely new content.\nNote: the reference may use Tailwind v4 @theme syntax which the CDN script does NOT support. Translate values to CSS custom properties or Tailwind arbitrary-value classes instead.\n\n--- STYLE REFERENCE ---\n${opts.styleReference.code}\n--- END STYLE REFERENCE ---`;
  }
  if (opts.integrations) {
    const hasAny =
      opts.integrations.hasGmail ||
      opts.integrations.hasSheets ||
      opts.integrations.hasCalendar ||
      opts.integrations.hasRazorpay;
    if (hasAny) {
      systemPrompt += `\n\n${buildIntegrationPrompt(opts.integrations)}`;
    }
  }

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: userMessage },
  ];
  for (const url of urls) {
    userContent.push({ type: "image_url", image_url: { url } });
  }

  const model = getModel();
  const completion = await getClient().chat.completions.create({
    model,
    max_completion_tokens: 16384,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;
  return {
    html: injectNeuraxineBadge(extractHtml(raw)),
    costUsd: estimateCostUsd(model, inputTokens, outputTokens),
  };
}

export async function reviseSite(opts: {
  currentHtml: string;
  instruction: string;
}): Promise<GenerateResult> {
  const model = getModel();
  const completion = await getClient().chat.completions.create({
    model,
    max_completion_tokens: 16384,
    messages: [
      { role: "system", content: REVISE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Current website HTML:\n\n${opts.currentHtml}\n\nInstruction — apply this change and return the FULL updated HTML document:\n${opts.instruction}`,
      },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;
  return {
    html: injectNeuraxineBadge(extractHtml(raw)),
    costUsd: estimateCostUsd(model, inputTokens, outputTokens),
  };
}
