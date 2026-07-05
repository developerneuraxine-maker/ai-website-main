import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { fetchCurrentUser } from "@/server-fns/auth";
import { Users, FolderKanban, LayoutDashboard, ShieldCheck, Megaphone, Mail } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    if (!user) throw redirect({ to: "/auth" });
    if (!user.isAdmin) throw redirect({ to: "/dashboard" });
    return { user };
  },
  component: AdminLayout,
});

const links = [
  { title: "Overview", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "All Projects", url: "/admin/projects", icon: FolderKanban },
  { title: "Announcements", url: "/admin/announcements", icon: Megaphone },
  { title: "Email Logs", url: "/admin/emails", icon: Mail },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-sidebar">
        <div className="px-4 py-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            <span className="font-display text-base">Admin Panel</span>
          </div>
          <nav className="mt-6 space-y-1">
            {links.map((l) => {
              const active = pathname === l.url || pathname.startsWith(l.url + "/");
              return (
                <Link
                  key={l.url}
                  to={l.url}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <l.icon className="h-4 w-4" />
                  {l.title}
                </Link>
              );
            })}
            <div className="my-3 h-px bg-border" />
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to app
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 bg-background">
        <Outlet />
      </main>
    </div>
  );
}
