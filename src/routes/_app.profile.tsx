import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel } from "@/components/ui-bits";
import { fetchProfile, saveProfile } from "@/server-fns/profile";
import type { ProfileRow } from "@/lib/db";

export const Route = createFileRoute("/_app/profile")({
  loader: async () => fetchProfile(),
  head: () => ({ meta: [{ title: "Profile · Lumen" }] }),
  component: Profile,
});

function Field({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/50"
      />
    </div>
  );
}

function Profile() {
  const initial = Route.useLoaderData();
  const [profile, setProfile] = useState<ProfileRow>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await saveProfile({
        data: {
          full_name: profile.full_name,
          email: profile.email,
          username: profile.username,
          role: profile.role,
          bio: profile.bio,
        },
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const initials = profile.full_name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader eyebrow="You" title="Profile" />
      <Panel className="mt-8">
        <div className="flex items-center gap-5">
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 font-display text-3xl">
            {initials}
          </div>
          <div>
            <div className="font-display text-2xl">{profile.full_name || "Unnamed"}</div>
            <div className="text-sm text-muted-foreground">{profile.email || "no-email-set"}</div>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Field
            label="Full name"
            value={profile.full_name}
            onChange={(v) => setProfile((p) => ({ ...p, full_name: v }))}
          />
          <Field
            label="Email"
            value={profile.email}
            type="email"
            onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
          />
          <Field
            label="Username"
            value={profile.username}
            onChange={(v) => setProfile((p) => ({ ...p, username: v }))}
          />
          <Field
            label="Role"
            value={profile.role}
            onChange={(v) => setProfile((p) => ({ ...p, role: v }))}
          />
        </div>
        <div className="mt-6">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Bio
          </label>
          <textarea
            rows={3}
            value={profile.bio}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            className="mt-1.5 w-full rounded-xl border border-border bg-surface p-3 text-sm outline-none focus:border-primary/50"
          />
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          {saved && <span className="text-xs text-muted-foreground">Saved.</span>}
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </Panel>
    </div>
  );
}
