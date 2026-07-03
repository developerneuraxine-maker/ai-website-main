import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { getAuthClient } from "@/lib/auth-client";
import { exchangeGoogleCode } from "@/server-fns/google-auth";

export const Route = createFileRoute("/auth_/callback")({
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // Prevent the effect from running more than once.
  // useNavigate() may return a new reference on each render (TanStack Router
  // quirk), which would re-run the effect and re-exchange the Google code.
  // Google OAuth codes are single-use — only the first exchange succeeds.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const googleError = params.get("error");
    const googleErrorDesc = params.get("error_description");

    // Google redirects with ?error= when something goes wrong on their end
    // (e.g. redirect_uri_mismatch, access_denied, etc.)
    if (googleError) {
      setError(googleErrorDesc ?? googleError);
      return;
    }

    if (code) {
      exchangeGoogleCode({
        data: { code, redirectUri: `${window.location.origin}/auth/callback` },
      })
        .then(async (result) => {
          // Server function returns a discriminated union — never throws.
          if (result.error) {
            setError(result.error);
            return;
          }
          const { data: verifyData, error: verifyErr } = await getAuthClient().auth.verifyOtp({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            token_hash: result.tokenHash!,
            type: "magiclink",
          });
          console.log("[callback] verifyOtp — session:", !!verifyData?.session, "user:", !!verifyData?.user, "error:", verifyErr?.message);
          if (verifyErr) {
            // verifyErr.message can be "{}" when PKCE flow is active and there's no
            // code_verifier — solved by flowType:"implicit" in auth-client.ts.
            const errMsg = verifyErr.message && verifyErr.message !== "{}"
              ? verifyErr.message
              : `Token verification failed (${verifyErr.status ?? "unknown status"}). Try signing in again.`;
            setError(errMsg);
            return;
          }
          if (!verifyData?.session) {
            setError("Sign-in succeeded but no session was created. Check browser console for [auth-client] setItem logs.");
            return;
          }
          // cookieStorage.setItem (auth-client.ts) wrote the session cookie during
          // verifyOtp above. Use client-side navigate so _app.tsx beforeLoad runs
          // as a fetch (sends cookies) not a full SSR page reload.
          await navigate({ to: "/dashboard" });
        })
        .catch((err: unknown) => {
          // TanStack Start serializes thrown errors unusually on the client.
          console.error("[callback] catch:", err, typeof err, JSON.stringify(err));
          let msg: string;
          if (typeof err === "number") {
            msg = `Server error (${err}). Check terminal logs.`;
          } else if (err instanceof Error && err.message) {
            msg = err.message;
          } else if (typeof err === "string" && err && err !== "{}") {
            msg = err;
          } else {
            msg = "Sign-in failed. Check the terminal (server) logs — common cause: redirect URI mismatch in Google Cloud Console.";
          }
          setError(msg);
        });
    } else {
      // Non-Google: check existing cookie session, then listen for auth event
      const client = getAuthClient();
      client.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          void navigate({ to: "/dashboard" });
          return;
        }
        const { data: { subscription } } = client.auth.onAuthStateChange((event) => {
          if (event === "SIGNED_IN") {
            subscription.unsubscribe();
            void navigate({ to: "/dashboard" });
          }
        });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="max-w-sm space-y-3 text-center">
          <p className="text-sm font-semibold text-destructive">Sign-in failed</p>
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-left font-mono text-xs text-destructive">
            {error}
          </p>
          <a
            href="/auth"
            className="inline-block text-sm text-primary underline underline-offset-2"
          >
            ← Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
