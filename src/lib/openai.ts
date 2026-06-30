import OpenAI from "openai";

let client: OpenAI | undefined;

function getClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing OPENAI_API_KEY. Copy .env.example to .env and fill in your OpenAI API key.",
      );
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

function getModel() {
  return process.env.OPENAI_MODEL || "gpt-5.4";
}

const SYSTEM_PROMPT = `You are a website generator. Given a description, output a single complete HTML5 document for a polished, production-quality landing page.

Rules:
- Output ONLY the raw HTML document — no markdown code fences, no commentary before or after.
- Start with <!doctype html> and include a full <html><head>...</head><body>...</body></html>.
- Use Tailwind via the CDN script tag (<script src="https://cdn.tailwindcss.com"></script>) for styling, plus a <style> block for any custom touches (fonts, gradients, animations).
- Build a real, content-rich page matching the request: header/nav, hero, a few content sections relevant to the business type, and a footer. Use realistic placeholder copy, not lorem ipsum.
- Make it responsive and visually polished. Other than the reference image described below (if any), use no external image URLs that might not resolve — use CSS gradients, emoji, or inline SVG instead of <img> tags pointing at random URLs.
- Match the requested motion level: animate with CSS transitions/keyframes if "Cinematic" or "Playful" motion is requested, keep it minimal for "Subtle", and use no animation at all for "None".
- Write all page copy in the requested language.
- Do not include any JavaScript that makes network requests.`;

export type GenerateResult = { html: string };

function extractHtml(raw: string): string {
  const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  return candidate.trim();
}

export async function generateSite(opts: {
  prompt: string;
  category: string;
  palette: string;
  motion: string;
  language: string;
  imageUrl?: string;
  styleReference?: { name: string; code: string };
}): Promise<GenerateResult> {
  const userMessage = `Build a website for this request:\n"${opts.prompt}"\n\nCategory: ${opts.category}\nColor palette mood: ${opts.palette}\nMotion level: ${opts.motion}\nLanguage: ${opts.language}`;

  let systemPrompt = SYSTEM_PROMPT;
  if (opts.imageUrl) {
    systemPrompt += `\n- The user attached a reference image, shown to you below, at this exact public URL: ${opts.imageUrl}\n  Use that URL directly in an <img src="${opts.imageUrl}"> tag somewhere fitting (hero, logo, or gallery) — it resolves and is safe to reference. Also let the image's colors/mood inform the rest of the design.`;
  }
  if (opts.styleReference) {
    systemPrompt += `\n- STYLE REFERENCE: below is real code from one of the user's own previous projects ("${opts.styleReference.name}"), given to you purely as a visual style anchor. Study its layout structure, spacing rhythm, typography choices, color palette, and component polish (cards, gradients, glassmorphism, shadows) — and match that level of design quality and visual language.\n  Do NOT reuse its business name, copy, contact details, or images. Write entirely new content for the user's actual request below.\n  The reference's CSS may use Tailwind v4 build-time syntax (@theme, :root custom properties) which the Tailwind CDN script you must use does NOT support. Translate the same color/spacing/shadow values into Tailwind arbitrary-value classes (e.g. bg-[oklch(0.78_0.13_84)] or bg-[#D4AF37]) or a plain <style> block instead of copying @theme/@utility syntax verbatim.\n\n--- STYLE REFERENCE CODE (do not copy content, only visual patterns) ---\n${opts.styleReference.code}\n--- END STYLE REFERENCE ---`;
  }

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: userMessage },
  ];
  if (opts.imageUrl) {
    userContent.push({ type: "image_url", image_url: { url: opts.imageUrl } });
  }

  const completion = await getClient().chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  return { html: extractHtml(raw) };
}

export async function reviseSite(opts: {
  currentHtml: string;
  instruction: string;
}): Promise<GenerateResult> {
  const completion = await getClient().chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is the current website HTML:\n\n${opts.currentHtml}\n\nApply this change and return the FULL updated HTML document: ${opts.instruction}`,
      },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  return { html: extractHtml(raw) };
}
