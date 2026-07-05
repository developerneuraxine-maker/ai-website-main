import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Search, Plus, LogOut, Info, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { fetchCurrentUser } from "@/server-fns/auth";
import { fetchMyPlan } from "@/server-fns/plans";
import { fetchActiveAnnouncements } from "@/server-fns/admin";
import { getAuthClient } from "@/lib/auth-client";
import type { ServerUser } from "@/lib/auth-server";
import type { UserPlan, Announcement } from "@/lib/db";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    if (!user) throw redirect({ to: "/auth" });
    if (typeof window !== "undefined") {
      sessionStorage.setItem("lumen_user_email", user.email);
    }
    return { user } as { user: ServerUser };
  },
  loader: async () => {
    try {
      const [plan, announcements] = await Promise.all([
        fetchMyPlan(),
        fetchActiveAnnouncements().catch(() => [] as Announcement[]),
      ]);
      return { plan, announcements };
    } catch {
      return { plan: undefined, announcements: [] as Announcement[] };
    }
  },
  component: AppLayout,
});

const ANNOUNCEMENT_ICONS = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
};

const ANNOUNCEMENT_STYLES = {
  info: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function AnnouncementBanner({ announcements }: { announcements: Announcement[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem("lumen_dismissed_announcements");
      return new Set(stored ? (JSON.parse(stored) as string[]) : []);
    } catch {
      return new Set();
    }
  });

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        sessionStorage.setItem("lumen_dismissed_announcements", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  // Show only the most recent one at a time
  const a = visible[0];
  const type = (a.type ?? "info") as "info" | "warning" | "success";
  const Icon = ANNOUNCEMENT_ICONS[type];
  const style = ANNOUNCEMENT_STYLES[type];

  return (
    <div className={`flex items-start gap-3 border-b px-4 py-2.5 text-sm ${style}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{a.message}</span>
      {visible.length > 1 && (
        <span className="shrink-0 rounded-full bg-current/10 px-2 py-0.5 font-mono text-[10px]">
          1 of {visible.length}
        </span>
      )}
      <button onClick={() => dismiss(a.id)} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function AppLayout() {
  const { user } = useRouteContext({ from: "/_app" }) as { user: ServerUser };
  const { plan, announcements } = Route.useLoaderData() as {
    plan: UserPlan | undefined;
    announcements: Announcement[];
  };
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const runSearch = () => {
    navigate({ to: "/projects", search: query.trim() ? { q: query } : {} });
  };

  const signOut = async () => {
    await getAuthClient().auth.signOut();
    navigate({ to: "/auth" });
  };

  const initials = (user.email.charAt(0) ?? "?").toUpperCase();

  return (
    <SidebarProvider>
      <div className="relative z-10 flex min-h-screen w-full">
        <AppSidebar isAdmin={user.isAdmin} plan={plan} />
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Announcement banner — shown below header, above content */}
          {announcements.length > 0 && (
            <AnnouncementBanner announcements={announcements} />
          )}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
            <SidebarTrigger className="-ml-1" />
            <div className="hidden h-7 w-px bg-border md:block" />
            <div className="hidden items-center gap-2 md:flex">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Workspace
              </span>
              <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs">
                {user.email.split("@")[0]}
              </span>
            </div>
            <div className="ml-4 hidden flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 md:flex">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Search projects…"
              />
              <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5 text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {/* Small usage chip when near limit — hidden for owner accounts */}
              {plan && !plan.is_owner && plan.usage_pct >= 50 && (
                <Link
                  to="/plans"
                  className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs sm:inline-flex ${
                    plan.usage_pct >= 90
                      ? "border-orange-500/40 bg-orange-500/10 text-orange-500"
                      : "border-amber-400/40 bg-amber-400/10 text-amber-500"
                  }`}
                >
                  {plan.limit_reached ? "Limit reached" : `Usage: ${plan.usage_pct}%`}
                </Link>
              )}
              <Link
                to="/new"
                className="hidden items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 sm:inline-flex"
              >
                <Plus className="h-3.5 w-3.5" /> New website
              </Link>
              <div className="flex items-center gap-1">
                <Link
                  to="/profile"
                  title={user.email}
                  className="grid h-8 w-8 place-items-center rounded-full bg-linear-to-br from-amber-400 to-rose-500 font-mono text-[11px] font-bold text-white"
                >
                  {initials}
                </Link>
                <button
                  onClick={signOut}
                  title="Sign out"
                  className="grid h-7 w-7 place-items-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </header>
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
