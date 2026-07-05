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
- IMPORTANT: Use a LIGHT email design — white background (#ffffff), dark text (#1a1a2e), light grey sections (#f4f4f8)
- Use brand color #7c3aed (purple/violet) ONLY for the button and header accent — not as background
- The email must be fully readable in Gmail, Outlook, and Apple Mail — no dark backgrounds
- Use a centered layout, max-width 600px, clean and modern
- Include a small Lumen logo text at the top in purple
- Sign off as "The Lumen Team"

Return ONLY a JSON object with two keys: "subject" (string) and "html" (complete HTML email string, all CSS must be inline). No explanation, no markdown, just the JSON.`,

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
- IMPORTANT: Use a LIGHT email design — white background (#ffffff), dark text (#1a1a2e), light grey sections (#f4f4f8)
- Use brand color #7c3aed (purple/violet) ONLY for the button and header accent — not as background
- The email must be fully readable in Gmail, Outlook, and Apple Mail — no dark backgrounds
- Use a centered layout, max-width 600px, clean and modern
- Include a small Lumen logo text at the top in purple
- Sign off as "The Lumen Team"

Return ONLY a JSON object with two keys: "subject" (string) and "html" (complete HTML email string, all CSS must be inline). No explanation, no markdown, just the JSON.`,
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
  const wrapper = (content: string) => `
<div style="background:#f4f4f8;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#7c3aed;padding:28px 40px">
      <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px">✦ Lumen</span>
    </div>
    <div style="padding:40px">
      ${content}
      <hr style="border:none;border-top:1px solid #e8e8f0;margin:32px 0">
      <p style="color:#888;font-size:13px;margin:0">The Lumen Team · <a href="https://websitebuilder.neuraxine.com" style="color:#7c3aed;text-decoration:none">websitebuilder.neuraxine.com</a></p>
    </div>
  </div>
</div>`;

  if (type === "pro_expiring") {
    return {
      subject: "⚡ Your Lumen Pro plan expires in 2 days",
      html: wrapper(`
        <h2 style="color:#1a1a2e;margin:0 0 16px;font-size:24px">Your Pro plan expires in 2 days</h2>
        <p style="color:#444;line-height:1.6;margin:0 0 16px">Hi there,</p>
        <p style="color:#444;line-height:1.6;margin:0 0 24px">Your Lumen Pro plan expires in <strong style="color:#1a1a2e">2 days</strong>. Renew now to keep building unlimited AI websites without any interruption.</p>
        <div style="background:#f4f4f8;border-radius:8px;padding:20px;margin:0 0 28px">
          <p style="color:#1a1a2e;font-weight:600;margin:0 0 10px">What you keep with Pro:</p>
          <p style="color:#555;margin:4px 0">✓ Unlimited AI website generations</p>
          <p style="color:#555;margin:4px 0">✓ No daily cost limits</p>
          <p style="color:#555;margin:4px 0">✓ Priority build speed</p>
        </div>
        <a href="https://websitebuilder.neuraxine.com/plans" style="display:inline-block;background:#7c3aed;color:#ffffff;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;font-size:16px">Renew Pro — ₹500/month →</a>
      `),
    };
  }
  return {
    subject: "You've reached your free Lumen limit — keep building with Pro",
    html: wrapper(`
      <h2 style="color:#1a1a2e;margin:0 0 16px;font-size:24px">You've used your free generations</h2>
      <p style="color:#444;line-height:1.6;margin:0 0 16px">Hi there,</p>
      <p style="color:#444;line-height:1.6;margin:0 0 24px">You've used up all your free AI website generations for this month. You can wait until next month, or upgrade to Pro to keep building right now — no waiting.</p>
      <div style="background:#f4f4f8;border-radius:8px;padding:20px;margin:0 0 28px">
        <p style="color:#1a1a2e;font-weight:600;margin:0 0 10px">Upgrade to Pro and get:</p>
        <p style="color:#555;margin:4px 0">✓ Unlimited AI website generations</p>
        <p style="color:#555;margin:4px 0">✓ No monthly reset — build any time</p>
        <p style="color:#555;margin:4px 0">✓ Priority build speed</p>
        <p style="color:#7c3aed;margin:12px 0 0;font-weight:600">Only ₹500/month (that's ~₹17/day)</p>
      </div>
      <a href="https://websitebuilder.neuraxine.com/plans" style="display:inline-block;background:#7c3aed;color:#ffffff;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;font-size:16px">Upgrade to Pro →</a>
    `),
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
