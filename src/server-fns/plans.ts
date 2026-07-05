import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-server";
import { getUserPlan, upgradeToPaid } from "@/lib/db";
import { createRazorpayOrder, verifyRazorpaySignature } from "@/lib/razorpay";
import { isOwner } from "@/lib/owner";

// Fetch the current user's plan status and daily usage percentage.
// Owner accounts get unlimited access with no limit shown in the UI.
export const fetchMyPlan = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);
  if (isOwner(user.email)) {
    return { ...plan, limit_reached: false, usage_pct: 0, daily_cost_usd: 0, daily_limit_usd: 999, is_paid_active: true, plan_type: "paid" as const };
  }
  return plan;
});

// Create a Razorpay order for the Pro plan (₹500).
export const createSubscriptionOrder = createServerFn({ method: "POST" }).handler(async () => {
  const user = await requireUser();
  return createRazorpayOrder(user.id);
});

// Verify the Razorpay payment and upgrade the user's plan.
export const verifySubscriptionPayment = createServerFn({ method: "POST" })
  .validator(
    (d: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
      d,
  )
  .handler(async ({ data }) => {
    const user = await requireUser();

    const valid = await verifyRazorpaySignature(
      data.razorpay_order_id,
      data.razorpay_payment_id,
      data.razorpay_signature,
    );

    if (!valid) {
      throw new Error(
        "Payment verification failed. Please contact support if payment was deducted.",
      );
    }

    await upgradeToPaid(user.id, data.razorpay_order_id);
    return { ok: true, message: "Payment successful! Your Pro plan is now active for 30 days." };
  });
