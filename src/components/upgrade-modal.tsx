import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check } from "lucide-react";

const FEATURES = [
  "Unlimited website generations per day",
  "Unlimited AI revisions",
  "Deploy to Vercel & GitHub",
  "Google, Gmail & Razorpay integrations",
  "Priority AI (fastest generation)",
  "Remove Neuraxine badge",
];

export function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 12 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#09090b] text-white shadow-2xl"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Top gradient accent */}
            <div className="h-1 w-full bg-linear-to-r from-violet-600 via-purple-500 to-fuchsia-500" />

            <div className="px-6 pb-6 pt-5">
              {/* Icon + heading */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-purple-500 shadow-lg shadow-purple-900/40">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-purple-400">
                    Limit reached
                  </p>
                  <h2 className="text-lg font-bold leading-tight tracking-tight">Upgrade to Pro</h2>
                </div>
              </div>

              <p className="mb-5 text-sm leading-relaxed text-white/60">
                You've used this month's AI quota. Upgrade to Pro for more generations every month.
              </p>

              {/* Features */}
              <ul className="mb-5 space-y-2">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/80">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                      <Check className="h-2.5 w-2.5 text-purple-400" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* Price */}
              <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <span className="text-3xl font-extrabold tracking-tight">₹500</span>
                <span className="text-white/40"> / month</span>
              </div>

              {/* CTA */}
              <a
                href="https://www.neuraxine.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl bg-linear-to-r from-violet-600 to-purple-500 py-3 text-center text-sm font-bold text-white shadow-lg shadow-purple-900/30 transition hover:opacity-90"
              >
                Upgrade to Pro →
              </a>

              <button
                onClick={onClose}
                className="mt-3 w-full text-center text-xs text-white/30 hover:text-white/60 transition"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
