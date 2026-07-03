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
import { Search, Plus, LogOut } from "lucide-react";
import { fetchCurrentUser } from "@/server-fns/auth";
import { fetchMyPlan } from "@/server-fns/plans";
import { getAuthClient } from "@/lib/auth-client";
import type { ServerUser } from "@/lib/auth-server";
import type { UserPlan } from "@/lib/db";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    if (!user) throw redirect({ to: "/auth" });
    // Store email for Razorpay prefill (client-accessible)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("lumen_user_email", user.email);
    }
    return { user } as { user: ServerUser };
  },
  // Load plan data for sidebar usage bar
  loader: async () => {
    try {
      const plan = await fetchMyPlan();
      return { plan };
    } catch {
      return { plan: undefined };
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const { user } = useRouteContext({ from: "/_app" }) as { user: ServerUser };
  const { plan } = Route.useLoaderData() as { plan: UserPlan | undefined };
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
              {/* Small usage chip when near limit */}
              {plan && plan.usage_pct >= 50 && (
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
                  className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 font-mono text-[11px] font-bold text-white"
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
