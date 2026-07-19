import { useState } from "react";
import {
  Bell,
  ThumbsUp,
  MessageCircle,
  Users,
  CheckCircle,
  XCircle,
  MessageSquare,
  UserPlus,
  Inbox,
  Check,
  Loader2,
  BellOff,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppNotification {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  targetPath: string;
  isRead: boolean;
  entityType: string | null;
  entityId: number | null;
  createdAt: string;
}

// ─── Icon mapping ─────────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: string }) {
  const base = "w-4 h-4 shrink-0";
  switch (type) {
    case "vote":
      return <ThumbsUp className={`${base} text-primary`} />;
    case "comment":
      return <MessageCircle className={`${base} text-blue-500`} />;
    case "offer_received":
      return <Inbox className={`${base} text-amber-500`} />;
    case "offer_accepted":
      return <CheckCircle className={`${base} text-emerald-500`} />;
    case "offer_declined":
      return <XCircle className={`${base} text-red-500`} />;
    case "collab_message":
      return <MessageSquare className={`${base} text-violet-500`} />;
    case "team_invite":
      return <UserPlus className={`${base} text-cyan-500`} />;
    case "team_joined":
      return <Users className={`${base} text-emerald-500`} />;
    case "discussion_message":
      return <MessageSquare className={`${base} text-blue-400`} />;
    default:
      return <Bell className={`${base} text-muted-foreground`} />;
  }
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    vote: "Vote",
    comment: "Comment",
    offer_received: "New Offer",
    offer_accepted: "Offer Accepted",
    offer_declined: "Offer Declined",
    collab_message: "Chat Message",
    team_invite: "Team Invite",
    team_joined: "Member Joined",
    discussion_message: "Team Chat",
  };
  return map[type] ?? "Notification";
}

function typeColor(type: string): string {
  const map: Record<string, string> = {
    vote: "bg-primary/10 text-primary border-primary/20",
    comment: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    offer_received: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    offer_accepted: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    offer_declined: "bg-red-500/10 text-red-500 border-red-500/20",
    collab_message: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    team_invite: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    team_joined: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    discussion_message: "bg-blue-400/10 text-blue-500 border-blue-400/20",
  };
  return map[type] ?? "bg-muted text-muted-foreground border-border";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotificationRow({
  notif,
  onRead,
}: {
  notif: AppNotification;
  onRead: (id: number) => void;
}) {
  const [, setLocation] = useLocation();

  function handleClick() {
    if (!notif.isRead) onRead(notif.id);
    setLocation(notif.targetPath);
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left flex items-start gap-4 px-5 py-4 border-b border-border hover:bg-muted/40 transition-colors ${
        notif.isRead ? "opacity-60" : "bg-card"
      }`}
    >
      {/* Unread dot */}
      <div className="mt-1 shrink-0">
        {notif.isRead ? (
          <div className="w-2 h-2 rounded-full bg-transparent" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-primary" />
        )}
      </div>

      {/* Icon */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${typeColor(notif.type)}`}
      >
        <NotifIcon type={notif.type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground truncate">
            {notif.title}
          </span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${typeColor(notif.type)}`}
          >
            {typeLabel(notif.type)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {notif.body}
        </p>
        <p className="text-[11px] text-muted-foreground/60">
          {formatTime(notif.createdAt)}
        </p>
      </div>
    </button>
  );
}

// ─── Notifications Page ───────────────────────────────────────────────────────

type Filter = "all" | "unread";

export function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: notifications = [], isLoading } = useQuery<AppNotification[]>({
    queryKey: ["notifications", filter],
    queryFn: () =>
      fetcher(
        `/api/notifications${filter === "unread" ? "?unread=true" : "?limit=100"}`,
      ),
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["notifications-unread-count"],
    queryFn: () => fetcher("/api/notifications/unread-count"),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) =>
      fetcher(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      fetcher("/api/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
      toast({ title: "All notifications marked as read." });
    },
    onError: () =>
      toast({ title: "Failed to mark all as read", variant: "destructive" }),
  });

  const unreadCount = countData?.count ?? 0;

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "You're all caught up."}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="shrink-0 gap-1.5"
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {(["all", "unread"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
              filter === f
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
            {f === "unread" && unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground leading-none">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BellOff className="w-10 h-10 mb-3 opacity-25" />
            <p className="text-sm font-medium">
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"}
            </p>
            <p className="text-xs mt-1 opacity-70">
              {filter === "unread"
                ? "You've read everything."
                : "Activity on your ideas and teams will appear here."}
            </p>
          </div>
        )}

        {notifications.map((notif) => (
          <NotificationRow
            key={notif.id}
            notif={notif}
            onRead={(id) => markReadMutation.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
