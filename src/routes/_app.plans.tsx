import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Sparkles, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import {
  fetchMyPlan,
  createSubscriptionOrder,
  verifySubscriptionPayment,
} from "@/server-fns/plans";
import { PLAN_PRICE_INR } from "@/lib/razorpay";
import type { UserPlan } from "@/lib/db";

export const Route = createFileRoute("/_app/plans")({
  loader: async () => fetchMyPlan(),
  head: () => ({ meta: [{ title: "Plans · Lumen" }] }),
  component: Plans,
});

declare global {
  interface Window {
    Razorpay: new (opts: RazorpayOptions) => { open(): void };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { email?: string };
  theme?: { color?: string };
  handler(response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }): void;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function usePlanColor(pct: number) {
  if (pct >= 100) return "bg-destructive";
  if (pct >= 90) return "bg-orange-500";
  if (pct >= 50) return "bg-amber-400";
  return "bg-primary";
}

function UsageBar({ plan }: { plan: UserPlan }) {
  const barColor = usePlanColor(plan.usage_pct);
  const pct = Math.min(100, (plan.credits_used / plan.credits_total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Credits used this month</span>
        <span className={plan.credits_remaining === 0 ? "font-medium text-destructive" : plan.credits_remaining <= 1 ? "font-medium text-orange-500" : "text-muted-foreground"}>
          {plan.credits_used} / {plan.credits_total} credits
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{plan.credits_remaining} credits remaining</span>
        <span>Resets 1st of every month</span>
      </div>
    </div>
  );
}

function OwnerPanel() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Billing</div>
        <h1 className="font-display text-3xl">Plans & usage</h1>
      </div>
      <div className="panel mt-8 p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <div className="font-display text-xl">Owner account</div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              This account has unlimited access to all features — no plan limits, no usage cap.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Plans() {
  const initial = Route.useLoaderData();
  const [plan, setPlan] = useState<UserPlan>(initial);

  if (plan.is_owner) return <OwnerPanel />;
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState(false);
  const router = useRouter();
  const userEmailRef = useRef<string>("");

  // Pull user email for Razorpay prefill (from route context)
  useEffect(() => {
    // Access the user email from the _app route context if available
    const stored = sessionStorage.getItem("lumen_user_email");
    if (stored) userEmailRef.current = stored;
  }, []);

  const handleUpgrade = async () => {
    setPayError(null);
    setPaying(true);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setPayError("Could not load payment SDK. Please check your internet connection.");
      setPaying(false);
      return;
    }

    try {
      const { orderId, amount, currency, keyId } = await createSubscriptionOrder();

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "Lumen",
        description: "Pro Plan — 30 days unlimited access",
        order_id: orderId,
        prefill: { email: userEmailRef.current },
        theme: { color: "#7c3aed" },
        handler: async (response) => {
          try {
            await verifySubscriptionPayment({
              data: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
            setPaySuccess(true);
            // Reload plan data
            const updated = await fetchMyPlan();
            setPlan(updated);
          } catch (err) {
            setPayError(
              err instanceof Error
                ? err.message
                : "Payment verification failed. Please contact support.",
            );
          } finally {
            setPaying(false);
          }
        },
      });

      rzp.open();
      // setPaying(false) is handled inside handler / on close
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Failed to create payment order.");
      setPaying(false);
    }
  };

  const freeFeatures = [
    "Generate websites with AI",
    "All templates & palettes",
    "Style reference anchoring",
    "Image/logo upload",
    "Deploy to public URL",
    `Monthly AI usage limit (resets 1st of month)`,
  ];

  const proFeatures = [
    "Everything in Free",
    "35× higher monthly AI usage",
    "Priority generation",
    "Pro badge in workspace",
    "Email support",
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Billing
        </div>
        <h1 className="font-display text-3xl">Plans & usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your AI usage resets on the 1st of every month.
        </p>
      </div>

      {/* Current usage */}
      <div className="panel mt-8 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Current plan
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="font-display text-2xl">{plan.is_paid_active ? "Pro" : "Free"}</div>
              {plan.is_paid_active && plan.plan_expires_at && (
                <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  expires {new Date(plan.plan_expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          {plan.limit_reached && !plan.is_paid_active && (
            <div className="flex items-center gap-1.5 text-sm text-orange-500">
              <AlertCircle className="h-4 w-4" />
              Free limit reached — resets next month
            </div>
          )}
        </div>
        <div className="mt-5">
          <UsageBar plan={plan} />
        </div>
      </div>

      {/* Success message */}
      {paySuccess && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Payment successful! Your Pro plan is now active for 30 days.
        </div>
      )}

      {/* Plan cards */}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {/* Free plan */}
        <div
          className={`panel p-6 ${!plan.is_paid_active ? "border-primary/50 bg-primary/5 shadow-[var(--shadow-glow)]" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div className="font-display text-2xl">Free</div>
            {!plan.is_paid_active && (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                Current plan
              </span>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-display text-4xl">₹0</span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Start building. AI usage resets monthly.
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            {freeFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-border bg-elevated px-4 py-3 text-center text-sm text-muted-foreground">
            {plan.is_paid_active ? "You're on Pro" : "Active"}
          </div>
        </div>

        {/* Pro plan */}
        <div
          className={`panel p-6 ${plan.is_paid_active ? "border-primary/50 bg-primary/5 shadow-[var(--shadow-glow)]" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div className="font-display text-2xl">Pro</div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {plan.is_paid_active && (
                <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                  Current plan
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-display text-4xl">₹{PLAN_PRICE_INR}</span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Build without limits. 35× more monthly AI usage.
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            {proFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>

          {payError && <div className="mt-3 text-xs text-destructive">{payError}</div>}

          {plan.is_paid_active ? (
            <div className="mt-6 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-center text-sm text-primary">
              Active — expires{" "}
              {plan.plan_expires_at ? new Date(plan.plan_expires_at).toLocaleDateString() : "never"}
            </div>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={paying}
              className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {paying ? (
                "Opening payment…"
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  Upgrade to Pro — ₹{PLAN_PRICE_INR}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Razorpay note */}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Payment secured by Razorpay · UPI, cards, netbanking accepted · 30-day access, cancel
        anytime
      </p>
    </div>
  );
}
