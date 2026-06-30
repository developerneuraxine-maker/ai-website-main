import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader, Chip } from "@/components/ui-bits";
import { templates } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/templates")({
  head: () => ({ meta: [{ title: "Templates · Lumen" }] }),
  component: Templates,
});

const categories = ["All", ...Array.from(new Set(templates.map((t) => t.category)))];

function Templates() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return templates.filter((t) => {
      const matchesQuery = !needle || t.name.toLowerCase().includes(needle);
      const matchesCategory = category === "All" || t.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <PageHeader
        eyebrow="Library"
        title="Templates"
        description="Pick a starting point and remix it from a sentence."
      />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 flex-1 bg-transparent text-sm outline-none"
            placeholder="Search templates"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full border px-3 py-1.5 text-xs ${c === category ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16 text-center text-sm text-muted-foreground">No templates match.</div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <Link
            key={t.id}
            to="/new"
            search={{ template: t.id }}
            className="panel group block overflow-hidden p-0 transition hover:border-primary/40"
          >
            <div className={`relative aspect-[16/10] bg-gradient-to-br ${t.accent}`}>
              <div className="absolute inset-0 grid place-items-center">
                <div className="font-display text-3xl text-foreground/90">{t.name}</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-5">
              <div>
                <Chip tone="muted">{t.category}</Chip>
                <div className="mt-2 font-medium">{t.name}</div>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t.uses.toLocaleString()} uses
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
