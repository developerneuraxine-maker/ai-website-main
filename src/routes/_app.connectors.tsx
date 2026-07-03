import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  fetchConnectors,
  disconnectConnector,
  saveRazorpayConnector,
  saveVercelConnector,
  getGitHubOAuthUrl,
  getGoogleConnectorOAuthUrl,
} from "@/server-fns/connectors";
import type { ConnectorRow } from "@/lib/db";
import {
  Github,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Key,
  Unplug,
  Link2,
} from "lucide-react";

export const Route = createFileRoute("/_app/connectors")({
  loader: async () => fetchConnectors(),
  head: () => ({ meta: [{ title: "Connectors · Lumen" }] }),
  validateSearch: (s: Record<string, string>) => ({
    connected: s.connected === "1" ? ("1" as const) : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
  }),
  component: ConnectorsPage,
});

// ---- Modal for API-key-based connectors ----
function ApiKeyModal({
  title,
  fields,
  onSave,
  onClose,
  saving,
  error,
}: {
  title: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
  onSave: (vals: Record<string, string>) => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, ""])),
  );
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="panel w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-lg">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                {f.label}
              </label>
              <input
                type={f.secret ? "password" : "text"}
                value={vals[f.key]}
                onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary font-mono"
              />
            </div>
          ))}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(vals)}
              disabled={saving}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Connector card ----
type ConnectorDef = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  type: "oauth" | "apikey";
  subServices?: string[];
};

const CONNECTORS: ConnectorDef[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Access repos, deploy from branches, and push generated code automatically.",
    icon: <Github className="h-6 w-6" />,
    iconBg: "bg-[#24292e]",
    type: "oauth",
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Deploy your websites directly to Vercel with custom domains and preview URLs.",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 116 100" fill="currentColor">
        <path d="M57.5 0L115 100H0L57.5 0z" />
      </svg>
    ),
    iconBg: "bg-black",
    type: "apikey",
  },
  {
    id: "google",
    name: "Google",
    description: "Connect Google Sheets, Calendar, and Gmail to automate your workflows.",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    iconBg: "bg-white",
    type: "oauth",
    subServices: ["Google Sheets", "Google Calendar", "Gmail"],
  },
  {
    id: "razorpay",
    name: "Razorpay",
    description: "Accept payments directly from your websites with Razorpay's payment gateway.",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14.956 0L9.512 15.672l3.36 1.12L17.36 1.12 14.956 0zM6.64 8.96L0 24h3.36l1.12-2.8h5.6L11.2 24h3.36L8 8.96H6.64zm-.56 9.52l1.68-4.48 1.68 4.48H6.08z"/>
      </svg>
    ),
    iconBg: "bg-[#072654]",
    type: "apikey",
  },
];

function ConnectorsPage() {
  const loaderData = Route.useLoaderData();
  const search = useSearch({ from: "/_app/connectors" });
  const [connectors, setConnectors] = useState<ConnectorRow[]>(loaderData);
  const [modal, setModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);

  useEffect(() => {
    if (search.connected) {
      setFlashMsg("Connected successfully!");
      setTimeout(() => setFlashMsg(null), 5000);
    } else if (search.error) {
      setFlashMsg(`Connection failed: ${search.error}`);
      setTimeout(() => setFlashMsg(null), 7000);
    }
  }, [search.connected, search.error]);

  const getConnector = (id: string) => connectors.find((c) => c.provider === id) ?? null;

  const handleOAuth = async (provider: string) => {
    setWorking(provider);
    try {
      let result: { url: string };
      if (provider === "github") {
        result = await getGitHubOAuthUrl();
      } else {
        result = await getGoogleConnectorOAuthUrl();
      }
      window.location.href = result.url;
    } catch (e) {
      setFlashMsg(e instanceof Error ? e.message : "Failed to start OAuth.");
      setWorking(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    setWorking(provider + ":disconnect");
    try {
      await disconnectConnector({ data: { provider } });
      setConnectors((prev) => prev.filter((c) => c.provider !== provider));
    } catch (e) {
      setFlashMsg(e instanceof Error ? e.message : "Failed to disconnect.");
    } finally {
      setWorking(null);
    }
  };

  const handleRazorpaySave = async (vals: Record<string, string>) => {
    setSaving(true);
    setModalError(null);
    try {
      const res = await saveRazorpayConnector({
        data: { keyId: vals.keyId, keySecret: vals.keySecret },
      });
      if (!res.ok) {
        setModalError(res.error);
      } else {
        setModal(null);
        const rows = await fetchConnectors();
        setConnectors(rows);
        setFlashMsg("Razorpay connected successfully!");
      }
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleVercelSave = async (vals: Record<string, string>) => {
    setSaving(true);
    setModalError(null);
    try {
      const res = await saveVercelConnector({ data: { token: vals.token } });
      if (!res.ok) {
        setModalError(res.error);
      } else {
        setModal(null);
        const rows = await fetchConnectors();
        setConnectors(rows);
        setFlashMsg(`Vercel connected as ${res.teamName}!`);
      }
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = (def: ConnectorDef) => {
    if (def.type === "oauth") {
      void handleOAuth(def.id);
    } else {
      setModalError(null);
      setModal(def.id);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Modals */}
      {modal === "razorpay" && (
        <ApiKeyModal
          title="Connect Razorpay"
          fields={[
            { key: "keyId", label: "Key ID", placeholder: "rzp_live_..." },
            { key: "keySecret", label: "Key Secret", placeholder: "Your secret key", secret: true },
          ]}
          onSave={handleRazorpaySave}
          onClose={() => setModal(null)}
          saving={saving}
          error={modalError}
        />
      )}
      {modal === "vercel" && (
        <ApiKeyModal
          title="Connect Vercel"
          fields={[
            {
              key: "token",
              label: "API Token",
              placeholder: "Paste your Vercel API token",
              secret: true,
            },
          ]}
          onSave={handleVercelSave}
          onClose={() => setModal(null)}
          saving={saving}
          error={modalError}
        />
      )}

      {/* Header */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Integrations
        </div>
        <h1 className="font-display text-3xl">Connectors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your favourite tools to supercharge your websites.
        </p>
      </div>

      {/* Flash message */}
      {flashMsg && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            flashMsg.startsWith("Connection failed") || flashMsg.startsWith("Failed")
              ? "border-red-500/20 bg-red-500/10 text-red-400"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          }`}
        >
          {flashMsg.startsWith("Connection failed") || flashMsg.startsWith("Failed") ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          {flashMsg}
        </div>
      )}

      {/* Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CONNECTORS.map((def) => {
          const row = getConnector(def.id);
          const connected = !!row;
          const isWorking = working === def.id || working === def.id + ":disconnect";

          return (
            <div key={def.id} className="panel flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${def.iconBg} text-white`}
                  >
                    {def.icon}
                  </div>
                  <div>
                    <div className="font-display text-base">{def.name}</div>
                    {connected && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                        {row.metadata.login && (
                          <span className="text-muted-foreground">· @{row.metadata.login}</span>
                        )}
                        {row.metadata.username && (
                          <span className="text-muted-foreground">· {row.metadata.username}</span>
                        )}
                        {row.metadata.email && (
                          <span className="text-muted-foreground">· {row.metadata.email}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">{def.description}</p>

              {def.subServices && (
                <div className="flex flex-wrap gap-1.5">
                  {def.subServices.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-border bg-surface px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-auto">
                {connected ? (
                  <button
                    onClick={() => handleDisconnect(def.id)}
                    disabled={isWorking}
                    className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:border-red-500/40 hover:text-red-400 disabled:opacity-50 transition"
                  >
                    {isWorking ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Unplug className="h-3.5 w-3.5" />
                    )}
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(def)}
                    disabled={isWorking}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {isWorking ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : def.type === "oauth" ? (
                      <ExternalLink className="h-3.5 w-3.5" />
                    ) : (
                      <Key className="h-3.5 w-3.5" />
                    )}
                    {def.type === "oauth" ? "Connect with OAuth" : "Enter API Key"}
                  </button>
                )}
                {connected && def.type === "oauth" && (
                  <button
                    onClick={() => handleConnect(def)}
                    disabled={isWorking}
                    className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-surface disabled:opacity-50 transition"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Reconnect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Help note */}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Credentials are encrypted and stored securely. You can disconnect at any time.
      </p>
    </div>
  );
}
