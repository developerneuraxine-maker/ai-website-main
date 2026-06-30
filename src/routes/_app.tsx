import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Search, Plus } from "lucide-react";

export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
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

  return (
    <SidebarProvider>
      <div className="relative z-10 flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
            <SidebarTrigger className="-ml-1" />
            <div className="hidden h-7 w-px bg-border md:block" />
            <div className="hidden items-center gap-2 md:flex">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Workspace
              </span>
              <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs">
                Studio Nord
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
              <Link
                to="/new"
                className="hidden items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 sm:inline-flex"
              >
                <Plus className="h-3.5 w-3.5" /> New website
              </Link>
              <Link
                to="/profile"
                className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-rose-500"
                title="Profile"
              />
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
