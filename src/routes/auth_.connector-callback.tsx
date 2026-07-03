import { createFileRoute, redirect } from "@tanstack/react-router";
import { exchangeConnectorCode } from "@/server-fns/connectors";

// Handles OAuth callbacks for GitHub and Google connector flows.
// The URL pattern matches /auth/connector-callback (underscore = nested under /auth without auth layout)
export const Route = createFileRoute("/auth_/connector-callback")({
  loader: async ({ location }) => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error || !code || !state) {
      throw redirect({
        to: "/connectors",
        search: { connected: undefined, error: error ?? "oauth_cancelled" },
      });
    }

    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : (process.env.APP_URL ?? "http://localhost:3000");

    const result = await exchangeConnectorCode({
      data: {
        code,
        state,
        redirectUri: `${origin}/auth/connector-callback`,
      },
    });

    if (!result.ok) {
      throw redirect({
        to: "/connectors",
        search: { connected: undefined, error: result.error },
      });
    }

    throw redirect({
      to: "/connectors",
      search: { connected: "1" as const, error: undefined },
    });
  },
  component: ConnectorCallbackPage,
});

function ConnectorCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="font-display text-xl">Connecting…</div>
        <p className="mt-2 text-sm text-muted-foreground">Finishing OAuth handshake.</p>
      </div>
    </div>
  );
}
