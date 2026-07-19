import { useState, useEffect, useRef } from "react";
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
  Globe,
  Trophy,
  X,
  Menu,
  ThumbsUp,
  MessageCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  UserPlus,
  Inbox,
  BellOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetMe,
  useLogout,
  useUpdateMe,
  getGetMeQueryKey,
  setAuthTokenGetter,
  fetcher,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/use-theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/user";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  targetPath: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Notification icon ────────────────────────────────────────────────────────

function NotifTypeIcon({ type }: { type: string }) {
  const cls = "w-3.5 h-3.5 shrink-0";
  switch (type) {
    case "vote":
      return <ThumbsUp className={`${cls} text-primary`} />;
    case "comment":
      return <MessageCircle className={`${cls} text-blue-500`} />;
    case "offer_received":
      return <Inbox className={`${cls} text-amber-500`} />;
    case "offer_accepted":
      return <CheckCircle className={`${cls} text-emerald-500`} />;
    case "offer_declined":
      return <XCircle className={`${cls} text-red-500`} />;
    case "collab_message":
      return <MessageSquare className={`${cls} text-violet-500`} />;
    case "team_invite":
      return <UserPlus className={`${cls} text-cyan-500`} />;
    case "team_joined":
      return <Users className={`${cls} text-emerald-500`} />;
    case "discussion_message":
      return <MessageSquare className={`${cls} text-blue-400`} />;
    default:
      return <Bell className={`${cls} text-muted-foreground`} />;
  }
}

function formatNotifTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Real-time notification WS hook ──────────────────────────────────────────

function useNotificationSocket(
  onNewNotification: (n: AppNotification) => void,
) {
  const cbRef = useRef(onNewNotification);
  cbRef.current = onNewNotification;

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/ws`);
    ws.onopen = () =>
      ws.send(JSON.stringify({ type: "subscribe_notifications" }));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "new_notification" && msg.notification) {
          cbRef.current(msg.notification);
        }
      } catch {}
    };
    ws.onerror = () => {};
    return () => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: "unsubscribe_notifications" }));
      ws.close();
    };
  }, []);
}

// ─── Bell Dropdown ────────────────────────────────────────────────────────────

function BellDropdown({
  onClose,
  onRead,
}: {
  onClose: () => void;
  onRead: (id: number) => void;
}) {
  const [, setLocation] = useLocation();

  const { data: notifications = [] } = useQuery<AppNotification[]>({
    queryKey: ["notifications-preview"],
    queryFn: () => fetcher("/api/notifications?limit=4"),
    staleTime: 30_000,
  });

  function handleClick(notif: AppNotification) {
    if (!notif.isRead) onRead(notif.id);
    onClose();
    setLocation(notif.targetPath);
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground">
          Notifications
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto divide-y divide-border">
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <BellOff className="w-6 h-6 mb-2 opacity-30" />
            <p className="text-xs">No notifications yet</p>
          </div>
        )}
        {notifications.map((notif) => (
          <button
            key={notif.id}
            onClick={() => handleClick(notif)}
            className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${
              notif.isRead ? "opacity-60" : "bg-card"
            }`}
          >
            {/* Unread dot */}
            <div className="mt-1.5 shrink-0">
              {notif.isRead ? (
                <div className="w-1.5 h-1.5 rounded-full bg-transparent" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </div>
            {/* Icon */}
            <div className="mt-0.5 shrink-0">
              <NotifTypeIcon type={notif.type} />
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground leading-snug truncate">
                {notif.title}
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mt-0.5">
                {notif.body}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {formatNotifTime(notif.createdAt)}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2.5">
        <button
          onClick={() => {
            onClose();
            setLocation("/notifications");
          }}
          className="w-full text-center text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1"
        >
          View all notifications →
        </button>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();
  const { theme, toggleTheme, setTheme } = useTheme();
  const updateMeMutation = useUpdateMe();

  // Sidebar collapsed state (persists in sessionStorage for UX continuity)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem("sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Upgrade banner dismissed state — resets on every page refresh (no storage)
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);

  // Bell dropdown open state
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

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

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bellOpen]);

  // ── Notification queries ─────────────────────────────────────────────────────
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["notifications-unread-count"],
    queryFn: () => fetcher("/api/notifications/unread-count"),
    refetchInterval: 60_000, // poll every 60 s as a fallback
    enabled: !!user,
  });
  const unreadCount = unreadData?.count ?? 0;

  // Real-time: push new notifications into cache
  useNotificationSocket((notif) => {
    // Bump unread count
    queryClient.setQueryData<{ count: number }>(
      ["notifications-unread-count"],
      (old) => ({ count: (old?.count ?? 0) + 1 }),
    );
    // Prepend to preview list
    queryClient.setQueryData<AppNotification[]>(
      ["notifications-preview"],
      (old) => [notif, ...(old ?? [])].slice(0, 4),
    );
    // Invalidate full list so the notifications page is fresh
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  });

  // Mark a single notification as read and update caches
  function markOneRead(id: number) {
    fetcher(`/api/notifications/${id}/read`, { method: "PATCH" }).then(() => {
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
      queryClient.invalidateQueries({ queryKey: ["notifications-preview"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
  }

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem("sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    toggleTheme();
    if (user) {
      queryClient.setQueryData(getGetMeQueryKey(), {
        ...user,
        theme: nextTheme,
      });
    }
    updateMeMutation.mutate(
      { data: { theme: nextTheme } },
      {
        onError: () => {
          toggleTheme();
          if (user) {
            queryClient.setQueryData(getGetMeQueryKey(), user);
          }
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
    { href: "/feed", label: "Public Feed", icon: Globe },
    { href: "/challenges", label: "Weekly Challenge", icon: Trophy },
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
        className={`shrink-0 flex flex-col h-screen md:sticky md:top-0 z-50 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ${
          sidebarCollapsed ? "w-full md:w-16" : "w-full md:w-64"
        }`}
      >
        {/* Brand Logo */}
        <div className="px-3 py-6 flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0 bg-sidebar-primary">
              <Sparkles className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="text-xl font-black tracking-tight leading-none text-sidebar-foreground">
                  Clariva
                </h1>
                <p className="text-xs mt-0.5 font-medium tracking-wide text-sidebar-foreground/60">
                  AI-Powered SaaS
                </p>
              </div>
            )}
          </div>
          {/* Hamburger toggle */}
          <button
            onClick={handleToggleSidebar}
            className="p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {!sidebarCollapsed && (
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Navigation
            </p>
          )}
          {mainNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 rounded-r-lg border-l-4 ${
                  active
                    ? "text-sidebar-foreground bg-sidebar-accent font-semibold border-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 border-transparent"
                } ${sidebarCollapsed ? "justify-center" : ""}`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && item.label}
              </Link>
            );
          })}

          {!sidebarCollapsed && (
            <p className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Intelligence
            </p>
          )}
          {sidebarCollapsed && <div className="h-3" />}
          {insightNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 rounded-r-lg border-l-4 ${
                  active
                    ? "text-sidebar-foreground bg-sidebar-accent font-semibold border-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 border-transparent"
                } ${sidebarCollapsed ? "justify-center" : ""}`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Banner */}
        {!sidebarCollapsed && showUpgradeBanner && (
          <div className="px-4 pb-2">
            <div
              className="rounded-xl p-4 relative"
              style={{
                background: "linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)",
              }}
            >
              {/* Dismiss button */}
              <button
                onClick={() => setShowUpgradeBanner(false)}
                className="absolute top-2 right-2 p-0.5 rounded text-white/60 hover:text-white transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <p className="text-xs font-bold text-white mb-1 pr-5">
                Upgrade to Pro
              </p>
              <p className="text-[11px] text-white/70 mb-3 leading-snug">
                Unlock unlimited AI Insights
              </p>
              <button className="w-full py-2 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95 bg-white text-indigo-700 hover:bg-white/90">
                Upgrade Now
              </button>
            </div>
          </div>
        )}

        {/* User Footer */}
        <div
          className={`px-3 py-4 border-t border-sidebar-border flex items-center gap-2 ${
            sidebarCollapsed ? "justify-center flex-col" : "justify-between"
          }`}
        >
          {!sidebarCollapsed && (
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
          )}

          {sidebarCollapsed && (
            <Avatar className="w-8 h-8 shrink-0 border border-sidebar-border">
              <AvatarImage
                src={user?.avatarUrl || undefined}
                alt={user?.name || "User avatar"}
              />
              <AvatarFallback className="text-xs font-bold bg-sidebar-primary/20 text-sidebar-primary">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          )}

          <div
            className={`flex items-center gap-1 shrink-0 ${
              sidebarCollapsed ? "flex-col" : ""
            }`}
          >
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

            {/* ── Notification Bell ── */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setBellOpen((o) => !o)}
                className="relative p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold border border-card leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <BellDropdown
                  onClose={() => setBellOpen(false)}
                  onRead={markOneRead}
                />
              )}
            </div>

            <div className="w-px h-6 bg-border mx-1" />
            <Link href="/submit">
              <Button size="sm" className="gap-1.5 text-xs px-3">
                <PlusCircle className="w-3.5 h-3.5" />
                New Idea
              </Button>
            </Link>
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
