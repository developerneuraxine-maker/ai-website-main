import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { getAuthClient } from "@/lib/auth-client";
import { signUpWithEmail } from "@/server-fns/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Lumen" },
      { name: "description", content: "Sign in or create your Lumen account." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const router = useRouter();
  // Prevent hydration mismatch from browser password-manager extensions injecting
  // DOM nodes into form inputs before React hydrates (React 19 no longer suppresses
  // injected-element mismatches via suppressHydrationWarning).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // Directly nuke the Supabase session cookie when the auth page loads.
    // This clears stale sessions (deleted users, expired tokens) so they can't
    // interfere with a fresh sign-in. We bypass the Supabase client here because
    // signOut({ scope:"local" }) silently no-ops when the session is already invalid.
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (supabaseUrl) {
      try {
        const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
        const cookieKey = `sb-${projectRef}-auth-token`;
        document.cookie = `${cookieKey}=; path=/; max-age=0; SameSite=Lax`;
        // Also clear any chunked-storage variants (Supabase splits large sessions)
        for (let i = 0; i < 5; i++) {
          document.cookie = `${cookieKey}.${i}=; path=/; max-age=0; SameSite=Lax`;
        }
      } catch {
        // ignore URL parse errors
      }
    }
  }, []);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const signInWithGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      setError("Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.");
      return;
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}/auth/callback`,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          return;
        }
        // Use admin API server-side so email confirmation is skipped entirely.
        // Server function returns { tokenHash } or { error } — never throws, so
        // TanStack Start serialization quirks don't mangle the error message.
        const result = await signUpWithEmail({ data: { email, password } });
        if (result.error) throw new Error(result.error);
        const { error: verifyErr } = await getAuthClient().auth.verifyOtp({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          token_hash: result.tokenHash!,
          type: "magiclink",
        });
        if (verifyErr) throw verifyErr;
        await router.navigate({ to: "/dashboard" });
      } else {
        const { error: signInError } = await getAuthClient().auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        await router.navigate({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      let msg = "Something went wrong. Please try again.";
      if (err instanceof Error) {
        // Supabase AuthApiError extends Error — .message is readable even though
        // it's non-enumerable (JSON.stringify(err) returns {} for Error subclasses)
        const ae = err as Error & { status?: number; code?: string };
        if (ae.message && ae.message.trim()) {
          msg = ae.message;
        } else if (ae.status) {
          msg = `Auth error ${ae.status}${ae.code ? ` [${ae.code}]` : ""}`;
        }
      } else if (err && typeof err === "object") {
        const e = err as Record<string, unknown>;
        msg = (typeof e.message === "string" && e.message.trim())
          ? e.message
          : (typeof e.error_description === "string" ? e.error_description : null)
          ?? (typeof e.error === "string" ? e.error : null)
          ?? JSON.stringify(err);
      } else if (typeof err === "string") {
        msg = err;
      }
      setError(msg.replace("Invalid login credentials", "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
      {/* Left panel — branding */}
      <div className="hidden flex-col justify-between border-r border-border p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl">Lumen</span>
        </Link>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Welcome back
          </div>
          <h1 className="mt-4 max-w-md font-display text-6xl leading-tight text-balance">
            A prompt away from your <em className="italic text-primary">next launch.</em>
          </h1>
          <p className="mt-6 max-w-md text-muted-foreground">
            Pick up where you left off. Describe a site, iterate in chat, ship it in one click.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          AI-powered website builder
        </div>
      </div>

      {/* Right panel — form (client-only to avoid extension-injection hydration mismatch) */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        {!mounted ? (
          <div className="w-full max-w-sm space-y-4">
            <div className="h-10 w-full animate-pulse rounded-xl bg-surface" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-surface" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-surface" />
          </div>
        ) : (
        <div className="w-full max-w-sm">
          {/* Logo (mobile only) */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg">Lumen</span>
          </div>

          {/* Mode tabs */}
          <div className="flex rounded-xl border border-border bg-surface p-1">
            <button
              onClick={() => {
                setMode("signin");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${mode === "signin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Sign in
            </button>
            <button
              onClick={() => {
                setMode("signup");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${mode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Create account
            </button>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={signInWithGoogle}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium transition hover:border-foreground/40"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Email / password form */}
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Email
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-primary/50">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"

                  placeholder="you@studio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Password
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-primary/50">
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}

                  placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Confirm password
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-primary/50">
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
  
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                "Please wait…"
              ) : mode === "signin" ? (
                <>
                  Sign in <ArrowRight className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Create account <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our Terms & Privacy.
          </p>
        </div>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
