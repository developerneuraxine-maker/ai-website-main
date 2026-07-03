// Razorpay server-side utilities.
// Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.
// Get them from: https://dashboard.razorpay.com → Settings → API Keys

export const PLAN_PRICE_INR = 500; // ₹500 per month

function getKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET. Add them to your .env file.");
  }
  return { keyId, keySecret };
}

// Create a Razorpay order (server-side API call).
export async function createRazorpayOrder(userId: string): Promise<{
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}> {
  const { keyId, keySecret } = getKeys();
  const amountPaise = PLAN_PRICE_INR * 100; // Razorpay uses paise

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: `lumen_${userId}_${Date.now()}`,
      notes: { userId, plan: "paid" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay order creation failed: ${body}`);
  }

  const order = (await res.json()) as { id: string; amount: number; currency: string };
  return { orderId: order.id, amount: order.amount, currency: order.currency, keyId };
}

// Constant-time hex comparison to prevent timing attacks.
function hexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Verify Razorpay payment signature using Web Crypto API (Cloudflare Workers compatible).
export async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): Promise<boolean> {
  const { keySecret } = getKeys();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(keySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const data = encoder.encode(`${orderId}|${paymentId}`);
  const buf = await crypto.subtle.sign("HMAC", key, data);
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hexEqual(hex, signature);
}
