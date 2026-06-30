import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Copy, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-bits";
import { fetchApiKeys, newApiKey, removeApiKey } from "@/server-fns/api-keys";
import type { ApiKeyRow } from "@/lib/db";

export const Route = createFileRoute("/_app/api-keys")({
  loader: async () => fetchApiKeys(),
  head: () => ({ meta: [{ title: "API keys · Lumen" }] }),
  component: Keys,
});

function maskKey(value: string) {
  return `${value.slice(0, 10)}${"•".repeat(8)}${value.slice(-4)}`;
}

function Keys() {
  const initial = Route.useLoaderData();
  const [keys, setKeys] = useState<ApiKeyRow[]>(initial);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);

  const createKey = async () => {
    const label = window.prompt("Label for this key (e.g. Production · Vercel)");
    if (!label?.trim()) return;
    setCreating(true);
    try {
      const key = await newApiKey({ data: { label } });
      setKeys((k) => [key, ...k]);
      setRevealed((r) => ({ ...r, [key.id]: true }));
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    setKeys((k) => k.filter((key) => key.id !== id));
    await removeApiKey({ data: { id } });
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Developers"
        title="API keys"
        description="Programmatically generate and deploy sites via the Lumen API."
        actions={
          <button
            onClick={createKey}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            New key
          </button>
        }
      />
      <Panel className="mt-8 p-0">
        {keys.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No API keys yet.
          </div>
        )}
        {keys.map((k) => (
          <div
            key={k.id}
            className="flex items-center gap-4 border-b border-border/60 px-5 py-4 last:border-0"
          >
            <div className="grid size-9 place-items-center rounded-lg border border-border bg-elevated">
              <KeyRound className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{k.label}</div>
              <div className="truncate font-mono text-xs text-muted-foreground">
                {revealed[k.id] ? k.key_value : maskKey(k.key_value)} · created{" "}
                {new Date(k.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }))}
                className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground"
              >
                {revealed[k.id] ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(k.key_value)}
                className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => remove(k.id)}
                className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}
