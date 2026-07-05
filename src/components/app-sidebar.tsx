import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderKanban,
  LayoutTemplate,
  Rocket,
  History,
  Settings,
  User,
  KeyRound,
  Building2,
  Trash2,
  Sparkles,
  ShieldCheck,
  Zap,
  Plug,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { UserPlan } from "@/lib/db";

const primary = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Templates", url: "/templates", icon: LayoutTemplate },
  { title: "Deployments", url: "/deployments", icon: Rocket },
  { title: "Version History", url: "/history", icon: History },
  { title: "Connectors", url: "/connectors", icon: Plug },
];

const secondary = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Profile", url: "/profile", icon: User },
  { title: "API Keys", url: "/api-keys", icon: KeyRound },
  { title: "Workspace", url: "/workspace", icon: Building2 },
  { title: "Trash", url: "/trash", icon: Trash2 },
];

export function AppSidebar({ isAdmin = false, plan }: { isAdmin?: boolean; plan?: UserPlan }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  const usagePct = plan?.usage_pct ?? 0;
  const usageBarColor =
    usagePct >= 100
      ? "bg-destructive"
      : usagePct >= 90
        ? "bg-orange-500"
        : usagePct >= 50
          ? "bg-amber-400"
          : "bg-primary";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 py-4">
        <Link to="/dashboard" className="flex items-center gap-2.5 px-1.5">
          <div
            className="grid h-10 w-10 place-items-center rounded-lg text-primary-foreground"
            style={{
              background: "linear-gradient(135deg, color-mix(in oklab, var(--primary) 18%, transparent), color-mix(in oklab, var(--accent) 8%, transparent))",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <Sparkles className="h-5 w-5" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display text-lg">Lumen</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                build · ship · iterate
              </div>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="font-mono text-[10px] tracking-widest">
              Workspace
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {primary.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} aria-label={item.title}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="font-mono text-[10px] tracking-widest">
              Account
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Plans link with usage indicator */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/plans")} tooltip="Plans & Usage">
                  <Link to="/plans" className="flex items-center gap-2">
                    <Zap className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span>Plans</span>
                        {plan && !plan.is_owner && (
                          <span
                            className={`font-mono text-[9px] ${usagePct >= 90 ? "text-orange-500" : "text-muted-foreground"}`}
                          >
                            {usagePct}%
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {secondary.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} aria-label={item.title}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/admin")}
                    tooltip="Admin Panel"
                    className="text-amber-500 hover:text-amber-400"
                  >
                    <Link to="/admin/dashboard" aria-label="Admin Panel" className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {plan && !plan.is_owner && (
          <div className="mt-6 rounded-3xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-sm">Usage</div>
                <div className="text-sm text-muted-foreground">{usagePct}% of quota used</div>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.28em] text-primary">
                {plan.is_paid_active ? "Paid" : "Free"}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${usageBarColor}`}
                style={{ width: `${Math.min(100, usagePct)}%` }}
              />
            </div>
            {plan.limit_reached && !plan.is_paid_active && (
              <div className="mt-3 text-[11px] text-orange-500">
                Limit reached · resets next month
              </div>
            )}
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
