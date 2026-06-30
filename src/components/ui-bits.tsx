import { cn } from "@/lib/utils";
import type { ReactNode, HTMLAttributes } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/60 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow && (
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-4xl text-balance sm:text-5xl">{title}</h1>
        {description && (
          <p className="max-w-2xl text-pretty text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("panel p-6", className)} {...props} />;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Panel className="flex flex-col gap-2">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="font-display text-3xl">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </Panel>
  );
}

export function Chip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "primary" | "accent" | "danger" | "muted";
}) {
  const tones = {
    default: "text-foreground border-border",
    primary: "text-primary border-primary/40 bg-primary/10",
    accent: "text-accent border-accent/40 bg-accent/10",
    danger: "text-destructive border-destructive/40 bg-destructive/10",
    muted: "text-muted-foreground border-border bg-surface/60",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
