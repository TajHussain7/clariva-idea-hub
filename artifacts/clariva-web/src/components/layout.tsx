import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LogOut,
  LayoutDashboard,
  PlusCircle,
  Lightbulb,
  GitCompare,
  BarChart2,
  Sun,
  Moon,
  Bell,
  HelpCircle,
  Search,
  TrendingUp,
  Settings,
  Zap,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetMe,
  useLogout,
  useUpdateMe,
  getGetMeQueryKey,
  setAuthTokenGetter,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/use-theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/user";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();
  const { theme, toggleTheme, setTheme } = useTheme();
  const updateMeMutation = useUpdateMe();

  // Redirect unauthenticated users to login page
  useEffect(() => {
    if (!isLoading && !user) {
      localStorage.removeItem("auth_token");
      setAuthTokenGetter(null);
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  // Sync theme from database settings
  useEffect(() => {
    if (
      user?.theme &&
      (user.theme === "light" || user.theme === "dark") &&
      user.theme !== theme
    ) {
      setTheme(user.theme);
    }
  }, [user?.theme, theme, setTheme]);

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    toggleTheme();
    updateMeMutation.mutate(
      { data: { theme: nextTheme } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
      },
    );
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("auth_token");
        setAuthTokenGetter(null);
        queryClient.clear();
        setLocation("/auth");
      },
    });
  };

  const mainNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/submit", label: "My Ideas", icon: Lightbulb },
    { href: "/teams", label: "Teams", icon: Users },
    { href: "/compare", label: "Compare", icon: GitCompare },
  ];

  const insightNavItems = [
    { href: "/insights", label: "AI Insights", icon: Sparkles },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const userInitials = getUserInitials(user?.name);

  const isActive = (href: string) =>
    location === href || location.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* ===== Sidebar ===== */}
      <aside className="w-full md:w-64 shrink-0 flex flex-col h-screen md:sticky md:top-0 z-50 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        {/* Brand Logo */}
        <div className="px-6 py-6 flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0 bg-sidebar-primary">
            <Sparkles className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none text-sidebar-foreground">
              Clariva
            </h1>
            <p className="text-xs mt-0.5 font-medium tracking-wide text-sidebar-foreground/60">
              AI-Powered SaaS
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Navigation
          </p>
          {mainNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 rounded-r-lg border-l-4 ${
                  active
                    ? "text-sidebar-foreground bg-sidebar-accent font-semibold border-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 border-transparent"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <p className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Intelligence
          </p>
          {insightNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 rounded-r-lg border-l-4 ${
                  active
                    ? "text-sidebar-foreground bg-sidebar-accent font-semibold border-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 border-transparent"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Banner */}
        <div className="px-4 pb-2">
          <div className="rounded-xl p-4 border border-sidebar-border bg-sidebar-accent/40">
            <p className="text-xs font-medium mb-2 text-sidebar-foreground/60">
              Limit reached
            </p>
            <div className="h-1.5 w-full rounded-full mb-3 bg-sidebar-accent">
              <div className="h-1.5 rounded-full w-[85%] bg-sidebar-primary" />
            </div>
            <button className="w-full py-2.5 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95 bg-sidebar-primary text-sidebar-primary-foreground">
              Upgrade to Pro
            </button>
          </div>
        </div>

        {/* User Footer */}
        <div className="px-4 py-4 border-t border-sidebar-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="w-8 h-8 shrink-0 border border-sidebar-border">
              <AvatarImage
                src={user?.avatarUrl || undefined}
                alt={user?.name || "User avatar"}
              />
              <AvatarFallback className="text-xs font-bold bg-sidebar-primary/20 text-sidebar-primary">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate leading-tight text-sidebar-foreground">
                {user?.name || "User"}
              </p>
              <p className="text-xs truncate leading-tight text-sidebar-foreground/60">
                {user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleToggleTheme}
              className="p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              {theme === "dark" ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="Log out"
              data-testid="button-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="shrink-0 h-14 flex items-center justify-between px-6 bg-card border-b border-border sticky top-0 z-40">
          {/* Search */}
          <div className="relative hidden sm:flex items-center w-80">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search your ideas..."
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-muted/60 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
          </div>
          <div className="sm:hidden" />

          {/* Header actions */}
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              className="relative p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full border border-card" />
            </button>
            <div className="w-px h-6 bg-border mx-1" />
            {/* User chip */}
            <div className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-muted transition-colors cursor-default">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  backgroundColor: "hsl(var(--primary)/0.12)",
                  color: "hsl(var(--primary))",
                }}
              >
                {userInitials}
              </div>
              <span className="text-sm font-medium hidden md:block max-w-30 truncate">
                {user?.name || "User"}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
