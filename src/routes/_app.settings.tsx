import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel } from "@/components/ui-bits";
import { fetchSettings, saveSettings } from "@/server-fns/settings";
import type { SettingsRow } from "@/lib/db";

export const Route = createFileRoute("/_app/settings")({
  loader: async () => fetchSettings(),
  head: () => ({ meta: [{ title: "Settings · Lumen" }] }),
  component: Settings,
});

type Field = keyof Omit<SettingsRow, "id" | "user_id">;

function Toggle({
  on,
  label,
  hint,
  onToggle,
}: {
  on: boolean;
  label: string;
  hint?: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border/60 py-4 last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </div>
      <button
        onClick={onToggle}
        className={`relative h-6 w-10 rounded-full border ${on ? "bg-primary border-primary" : "bg-surface border-border"}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-background transition ${on ? "left-[1.125rem]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function Settings() {
  const initial = Route.useLoaderData();
  const [settings, setSettings] = useState<SettingsRow>(initial);

  const toggle = async (field: Field) => {
    const next = !settings[field];
    setSettings((s) => ({ ...s, [field]: next }));
    try {
      await saveSettings({ data: { [field]: next } });
    } catch {
      setSettings((s) => ({ ...s, [field]: !next }));
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Tune the workspace to how you like to work."
      />
      <div className="mt-8 grid gap-6">
        <Panel>
          <div className="font-display text-xl">Appearance</div>
          <div className="mt-4">
            <Toggle
              label="Dark mode"
              hint="Lumen is dark by default. Light coming soon."
              on={settings.dark_mode}
              onToggle={() => toggle("dark_mode")}
            />
            <Toggle
              label="Reduce motion"
              hint="Disable animations across the workspace."
              on={settings.reduce_motion}
              onToggle={() => toggle("reduce_motion")}
            />
            <Toggle
              label="Compact density"
              hint="Tighter spacing for power users."
              on={settings.compact_density}
              onToggle={() => toggle("compact_density")}
            />
          </div>
        </Panel>
        <Panel>
          <div className="font-display text-xl">Editor</div>
          <div className="mt-4">
            <Toggle
              label="Autosave"
              hint="Save every change automatically."
              on={settings.autosave}
              onToggle={() => toggle("autosave")}
            />
            <Toggle
              label="Show grid in visual editor"
              on={settings.show_grid}
              onToggle={() => toggle("show_grid")}
            />
            <Toggle
              label="Format on save"
              hint="Run Prettier on every save."
              on={settings.format_on_save}
              onToggle={() => toggle("format_on_save")}
            />
          </div>
        </Panel>
        <Panel>
          <div className="font-display text-xl">Notifications</div>
          <div className="mt-4">
            <Toggle
              label="Email me when a deploy fails"
              on={settings.email_on_deploy_fail}
              onToggle={() => toggle("email_on_deploy_fail")}
            />
            <Toggle
              label="Weekly product digest"
              on={settings.weekly_digest}
              onToggle={() => toggle("weekly_digest")}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
