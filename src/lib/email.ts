import { Resend } from "resend";
import OpenAI from "openai";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY in environment variables.");
  return new Resend(apiKey);
}

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");
  return new OpenAI({ apiKey });
}

// The "from" address — must be a verified domain in your Resend account.
// Use the sandbox address during testing: onboarding@resend.dev
function getFromAddress() {
  return process.env.RESEND_FROM_EMAIL ?? "Lumen <onboarding@resend.dev>";
}

export type EmailType = "pro_expiring" | "free_limit_reached";

// ─── AI Email Generator ────────────────────────────────────────────────────────
async function generateEmailHtml(type: EmailType, userEmail: string): Promise<{ subject: string; html: string }> {
  const openai = getOpenAI();

  const prompts: Record<EmailType, string> = {
    pro_expiring: `Write a professional, warm, and persuasive email to remind a SaaS user that their Pro plan expires in 2 days.

Product: Lumen — an AI website builder. Build stunning websites with a single prompt.
Renewal URL: https://websitebuilder.neuraxine.com/plans
User email: ${userEmail}
Pro plan price: ₹500/month

Requirements:
- Subject line: urgent but friendly, mention "expires in 2 days"
- Body: remind them what they get with Pro (unlimited AI generations, no limits, priority build)
- Highlight what they LOSE if they don't renew (back to free plan with limited generations)
- Include a clear CTA button linking to https://websitebuilder.neuraxine.com/plans
- Tone: professional, helpful, not spammy
- Include a beautiful responsive HTML email with inline CSS (dark themed, matching a modern SaaS product)
- Use brand color #7c3aed (purple/violet) for the button and accents
- Sign off as "The Lumen Team"

Return ONLY a JSON object with two keys: "subject" (string) and "html" (complete HTML email string). No explanation, no markdown, just the JSON.`,

    free_limit_reached: `Write a professional, warm, and persuasive email to tell a SaaS user their free plan AI usage limit has been reached for this month.

Product: Lumen — an AI website builder. Build stunning websites with a single prompt.
Upgrade URL: https://websitebuilder.neuraxine.com/plans
User email: ${userEmail}
Pro plan price: ₹500/month (that's only ~₹17/day)

Requirements:
- Subject line: friendly, not alarming — mention they've used up their free generations
- Body: explain their free limit is reached, they can't build more websites until next month OR they upgrade now
- Highlight Pro benefits: unlimited generations, no waiting until next month, priority speed
- Include a bright CTA button to upgrade: https://websitebuilder.neuraxine.com/plans
- Add urgency: "Don't lose momentum — keep building"
- Tone: encouraging, not guilt-tripping
- Include a beautiful responsive HTML email with inline CSS (dark themed, modern SaaS)
- Use brand color #7c3aed (purple/violet) for the button and accents
- Sign off as "The Lumen Team"

Return ONLY a JSON object with two keys: "subject" (string) and "html" (complete HTML email string). No explanation, no markdown, just the JSON.`,
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 2500,
    messages: [
      { role: "system", content: "You are an expert email copywriter and HTML email designer. You write beautiful, high-converting transactional emails. Always respond with valid JSON only." },
      { role: "user", content: prompts[type] },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as { subject: string; html: string };
    return { subject: parsed.subject, html: parsed.html };
  } catch {
    // Fallback to plain text email if AI generation fails
    return getFallbackEmail(type);
  }
}

function getFallbackEmail(type: EmailType): { subject: string; html: string } {
  if (type === "pro_expiring") {
    return {
      subject: "⚡ Your Lumen Pro plan expires in 2 days",
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#0a0a0f;color:#f0f0f8">
        <h1 style="color:#7c3aed">Your Pro plan expires soon</h1>
        <p>Hi there,</p>
        <p>Your Lumen Pro plan expires in <strong>2 days</strong>. Renew now to keep building unlimited websites without interruption.</p>
        <a href="https://websitebuilder.neuraxine.com/plans" style="display:inline-block;background:#7c3aed;color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;margin:20px 0">Renew Pro — ₹500/month →</a>
        <p style="color:#8888aa;font-size:14px">The Lumen Team</p>
      </div>`,
    };
  }
  return {
    subject: "You've used your free Lumen generations — upgrade to keep building",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#0a0a0f;color:#f0f0f8">
      <h1 style="color:#7c3aed">Your free plan limit is reached</h1>
      <p>Hi there,</p>
      <p>You've used up your free AI website generations for this month. Upgrade to Pro to keep building without limits.</p>
      <a href="https://websitebuilder.neuraxine.com/plans" style="display:inline-block;background:#7c3aed;color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;margin:20px 0">Upgrade to Pro — ₹500/month →</a>
      <p style="color:#8888aa;font-size:14px">The Lumen Team</p>
    </div>`,
  };
}

// ─── Send Email ────────────────────────────────────────────────────────────────
export async function sendReminderEmail(
  to: string,
  type: EmailType,
): Promise<{ ok: boolean; subject: string; error?: string }> {
  let subject = "";
  try {
    const { subject: generatedSubject, html } = await generateEmailHtml(type, to);
    subject = generatedSubject;
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to,
      subject,
      html,
    });
    if (error) throw new Error(error.message);
    return { ok: true, subject };
  } catch (err) {
    return { ok: false, subject, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
