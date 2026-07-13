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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetMe,
  useLogout,
  useUpdateMe,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/use-theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/user";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();
  const { theme, toggleTheme, setTheme } = useTheme();
  const updateMeMutation = useUpdateMe();

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
        queryClient.clear();
        setLocation("/auth");
      },
    });
  };

  const mainNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/submit", label: "My Ideas", icon: Lightbulb },
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
      <aside
        className="w-full md:w-64 shrink-0 flex flex-col h-screen md:sticky md:top-0 z-50 border-r border-slate-800"
        style={{ backgroundColor: "#0D0C22" }}
      >
        {/* Brand Logo */}
        <div className="px-6 py-6 flex items-center gap-3 border-b border-white/10">
          <div
            className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0"
            style={{ backgroundColor: "#57dffe" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "#0D0C22" }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight leading-none">
              Ideon
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium tracking-wide">
              AI-Powered SaaS
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
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
                    ? "text-white bg-white/10 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent"
                }`}
                style={active ? { borderLeftColor: "#57dffe" } : {}}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <p className="px-3 pt-5 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
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
                    ? "text-white bg-white/10 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent"
                }`}
                style={active ? { borderLeftColor: "#57dffe" } : {}}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Banner */}
        <div className="px-4 pb-2">
          <div
            className="rounded-xl p-4 border border-white/10"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <p className="text-xs text-slate-400 font-medium mb-2">
              Limit reached
            </p>
            <div
              className="h-1.5 w-full rounded-full mb-3"
              style={{ backgroundColor: "#2a2845" }}
            >
              <div
                className="h-1.5 rounded-full w-[85%]"
                style={{ backgroundColor: "#57dffe" }}
              />
            </div>
            <button
              className="w-full py-2.5 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95"
              style={{ backgroundColor: "#57dffe", color: "#0D0C22" }}
            >
              Upgrade to Pro
            </button>
          </div>
        </div>

        {/* User Footer */}
        <div className="px-4 py-4 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="w-8 h-8 shrink-0 border border-white/10">
              <AvatarImage
                src={user?.avatarUrl || undefined}
                alt={user?.name || "User avatar"}
              />
              <AvatarFallback
                className="text-xs font-bold"
                style={{ backgroundColor: "#57dffe22", color: "#57dffe" }}
              >
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate leading-tight">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-slate-400 truncate leading-tight">
                {user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleToggleTheme}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
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
