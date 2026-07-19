import { useState, useEffect, useRef } from "react";
import {
  Globe,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Users,
  TrendingUp,
  Loader2,
  Send,
  Flame,
  Clock,
  X,
  Eye,
  Inbox,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher, useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedItem {
  id: number;
  ideaId: number;
  ideaTitle: string;
  ideaDomain: string;
  ideaDescription: string;
  isAnonymous: boolean;
  submitterId: number | null;
  submitterName: string;
  publishedAt: string;
  voteCount: number;
  hasVoted: boolean;
  commentCount: number;
}

interface Comment {
  id: number;
  publicIdeaId: number;
  userId: number;
  authorName: string;
  content: string;
  createdAt: string;
}

interface CollaborationOffer {
  id: number;
  publicIdeaId: number;
  offererId: number;
  offererName: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

// ─── WebSocket hook ───────────────────────────────────────────────────────────

function useFeedSocket(onMessage: (msg: any) => void) {
  const ref = useRef<WebSocket | null>(null);

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/ws`);
    ref.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({ type: "subscribe_feed" }));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        onMessage(msg);
      } catch {}
    };
    ws.onerror = () => {};

    return () => {
      ws.send(JSON.stringify({ type: "unsubscribe_feed" }));
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ─── Idea Detail Modal ────────────────────────────────────────────────────────

function IdeaDetailModal({
  item,
  onClose,
  onVote,
  onOpenComments,
  onCollaborate,
  currentUserId,
}: {
  item: FeedItem;
  onClose: () => void;
  onVote: (id: number) => void;
  onOpenComments: (item: FeedItem) => void;
  onCollaborate: (item: FeedItem) => void;
  currentUserId: number | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border uppercase tracking-wider">
              {item.ideaDomain}
            </span>
            <h3 className="mt-2 text-lg font-bold text-foreground leading-snug">
              {item.ideaTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            by{" "}
            <span className="font-medium text-foreground">
              {item.submitterName}
            </span>
          </span>
          <span>·</span>
          <span>
            {new Date(item.publishedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Full description */}
        <div className="rounded-xl bg-muted/40 border border-border p-4">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {item.ideaDescription}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground border-t border-border pt-4">
          <span className="flex items-center gap-1.5">
            <ThumbsUp className="w-4 h-4" />
            <span className="font-semibold text-foreground">
              {item.voteCount}
            </span>{" "}
            votes
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" />
            <span className="font-semibold text-foreground">
              {item.commentCount}
            </span>{" "}
            comments
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              onVote(item.id);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
              item.hasVoted
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            {item.hasVoted ? "Voted" : "Vote"}
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenComments(item);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-150"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Comment
          </button>

          {currentUserId !== item.submitterId && (
            <button
              onClick={() => {
                onClose();
                onCollaborate(item);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border bg-card text-muted-foreground hover:border-emerald-400 hover:text-emerald-500 transition-all duration-150"
            >
              <Users className="w-3.5 h-3.5" />
              Collaborate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Offers Panel ─────────────────────────────────────────────────────────────

function OffersPanel({
  item,
  onClose,
}: {
  item: FeedItem;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: offers = [], isLoading } = useQuery<CollaborationOffer[]>({
    queryKey: ["feed-offers", item.id],
    queryFn: () => fetcher(`/api/feed/${item.id}/offers`),
  });

  const respondMutation = useMutation({
    mutationFn: ({
      offerId,
      status,
    }: {
      offerId: number;
      status: "accepted" | "declined";
    }) =>
      fetcher(`/api/feed/${item.id}/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-offers", item.id] });
      toast({ title: "Response sent." });
    },
    onError: () =>
      toast({ title: "Failed to respond to offer", variant: "destructive" }),
  });

  const pending = offers.filter((o) => o.status === "pending");
  const responded = offers.filter((o) => o.status !== "pending");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="font-semibold text-base">Collaboration Offers</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
              {item.ideaTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && offers.length === 0 && (
            <div className="text-center py-10">
              <Inbox className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">
                No collaboration offers yet.
              </p>
            </div>
          )}

          {/* Pending offers */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Pending ({pending.length})
              </p>
              {pending.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-xl border border-border bg-muted/30 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {offer.offererName}
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(offer.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {offer.message}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        respondMutation.mutate({
                          offerId: offer.id,
                          status: "accepted",
                        })
                      }
                      disabled={respondMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Accept
                    </button>
                    <button
                      onClick={() =>
                        respondMutation.mutate({
                          offerId: offer.id,
                          status: "declined",
                        })
                      }
                      disabled={respondMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Responded offers */}
          {responded.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Responded ({responded.length})
              </p>
              {responded.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 opacity-70"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {offer.offererName}
                    </p>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        offer.status === "accepted"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {offer.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {offer.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Inline Comment Section ───────────────────────────────────────────────────

function InlineComments({ item }: { item: FeedItem }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  // Local like/dislike state: Map<commentId, 'like' | 'dislike' | null>
  const [reactions, setReactions] = useState<
    Map<number, "like" | "dislike" | null>
  >(new Map());

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ["feed-comments", item.id],
    queryFn: () => fetcher(`/api/feed/${item.id}/comments`),
  });

  const addMutation = useMutation({
    mutationFn: (content: string) =>
      fetcher(`/api/feed/${item.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["feed-comments", item.id] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () =>
      toast({ title: "Failed to post comment", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addMutation.mutate(text.trim());
  };

  const toggleReaction = (commentId: number, reaction: "like" | "dislike") => {
    setReactions((prev) => {
      const next = new Map(prev);
      const current = next.get(commentId) ?? null;
      next.set(commentId, current === reaction ? null : reaction);
      return next;
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="border-t border-border">
      {/* Comments list */}
      <div className="px-4 pt-4 pb-3 space-y-4 max-h-72 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && comments.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">
            No comments yet. Be the first!
          </p>
        )}
        {comments.map((c) => {
          const reaction = reactions.get(c.id) ?? null;
          return (
            <div key={c.id} className="space-y-1.5">
              {/* Author + time */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {c.authorName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {c.authorName}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatTime(c.createdAt)}
                </span>
              </div>
              {/* Content */}
              <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                {c.content}
              </p>
              {/* Reactions */}
              <div className="flex items-center gap-3 pl-8">
                <button
                  onClick={() => toggleReaction(c.id, "like")}
                  className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                    reaction === "like"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" />
                  Like
                </button>
                <button
                  onClick={() => toggleReaction(c.id, "dislike")}
                  className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                    reaction === "dislike"
                      ? "text-red-500"
                      : "text-muted-foreground hover:text-red-500"
                  }`}
                >
                  <ThumbsDown className="w-3 h-3" />
                  Dislike
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comment input */}
      <form onSubmit={handleSubmit} className="px-4 pb-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment…"
          className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!text.trim() || addMutation.isPending}
        >
          {addMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

// ─── Feed Card ───────────────────────────────────────────────────────────────

function FeedCard({
  item,
  currentUserId,
  isCommentOpen,
  onVote,
  onToggleComments,
  onCollaborate,
  onViewDetails,
  onViewOffers,
}: {
  item: FeedItem;
  currentUserId: number | null;
  isCommentOpen: boolean;
  onVote: (id: number) => void;
  onToggleComments: (item: FeedItem) => void;
  onCollaborate: (item: FeedItem) => void;
  onViewDetails: (item: FeedItem) => void;
  onViewOffers: (item: FeedItem) => void;
}) {
  const isOwner = currentUserId !== null && currentUserId === item.submitterId;

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-base text-foreground leading-snug truncate">
              {item.ideaTitle}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border uppercase tracking-wider">
                {item.ideaDomain}
              </span>
              <span className="text-xs text-muted-foreground">
                by{" "}
                <span className="font-medium text-foreground">
                  {item.submitterName}
                </span>
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
          {item.ideaDescription}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Vote button */}
          <button
            onClick={() => onVote(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
              item.hasVoted
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            {item.voteCount}
          </button>

          {/* Comments toggle button */}
          <button
            onClick={() => onToggleComments(item)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
              isCommentOpen
                ? "bg-primary/10 text-primary border-primary/40"
                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {item.commentCount}
          </button>

          {/* Collaborate button (hide for own ideas) */}
          {!isOwner && (
            <button
              onClick={() => onCollaborate(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border bg-card text-muted-foreground hover:border-emerald-400 hover:text-emerald-500 transition-all duration-150"
            >
              <Users className="w-3.5 h-3.5" />
              Collaborate
            </button>
          )}

          {/* Offers inbox button (idea owner only) */}
          {isOwner && (
            <button
              onClick={() => onViewOffers(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border bg-card text-muted-foreground hover:border-amber-400 hover:text-amber-500 transition-all duration-150"
            >
              <Inbox className="w-3.5 h-3.5" />
              Offers
            </button>
          )}

          {/* View details button */}
          <button
            onClick={() => onViewDetails(item)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-150"
          >
            <Eye className="w-3.5 h-3.5" />
            Details
          </button>

          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(item.publishedAt).toLocaleDateString()}
          </span>
        </div>
      </CardContent>

      {/* Inline comment section — slides down */}
      <div
        style={{
          maxHeight: isCommentOpen ? "480px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.35s ease-in-out",
        }}
      >
        <InlineComments item={item} />
      </div>
    </Card>
  );
}

// ─── Collaborate Modal ────────────────────────────────────────────────────────

function CollaborateModal({
  item,
  onClose,
}: {
  item: FeedItem;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: (msg: string) =>
      fetcher(`/api/feed/${item.id}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      }),
    onSuccess: () => {
      toast({ title: "Collaboration offer sent!" });
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Failed to send offer",
        description: err?.message,
        variant: "destructive",
      }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">Offer to Collaborate</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Send a message to the author of{" "}
          <span className="font-medium text-foreground">
            "{item.ideaTitle}"
          </span>
          .
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Introduce yourself and explain how you'd like to help…"
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate(message.trim())}
            disabled={!message.trim() || mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Send Offer
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Feed Page ────────────────────────────────────────────────────────────────

export function Feed() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<"recent" | "votes">("recent");
  const [page, setPage] = useState(1);
  const [openCommentId, setOpenCommentId] = useState<number | null>(null);
  const [collaborateItem, setCollaborateItem] = useState<FeedItem | null>(null);
  const [detailItem, setDetailItem] = useState<FeedItem | null>(null);
  const [offerItem, setOfferItem] = useState<FeedItem | null>(null);

  const { data: me } = useGetMe();
  const currentUserId = me?.id ?? null;

  // Queries
  const feedQuery = useQuery<FeedItem[]>({
    queryKey: ["feed", sort, page],
    queryFn: () => fetcher(`/api/feed?sort=${sort}&page=${page}&limit=20`),
  });

  const trendingQuery = useQuery<FeedItem[]>({
    queryKey: ["feed-trending"],
    queryFn: () => fetcher("/api/feed/trending"),
  });

  // Vote mutation with optimistic update
  const voteMutation = useMutation({
    mutationFn: (publicIdeaId: number) =>
      fetcher(`/api/feed/${publicIdeaId}/vote`, { method: "POST" }),
    onMutate: async (publicIdeaId) => {
      await queryClient.cancelQueries({ queryKey: ["feed", sort, page] });
      const prev = queryClient.getQueryData<FeedItem[]>(["feed", sort, page]);
      queryClient.setQueryData<FeedItem[]>(["feed", sort, page], (old) =>
        old?.map((item) =>
          item.id === publicIdeaId
            ? {
                ...item,
                hasVoted: !item.hasVoted,
                voteCount: item.hasVoted
                  ? item.voteCount - 1
                  : item.voteCount + 1,
              }
            : item,
        ),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      queryClient.setQueryData(["feed", sort, page], ctx?.prev);
      toast({ title: "Vote failed", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["feed-trending"] });
    },
  });

  // Real-time feed updates
  useFeedSocket((msg) => {
    if (
      msg.type === "vote_updated" ||
      msg.type === "idea_published" ||
      msg.type === "idea_unpublished" ||
      msg.type === "comment_added" ||
      msg.type === "comment_deleted"
    ) {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["feed-trending"] });
    }
  });

  const feed = feedQuery.data ?? [];
  const trending = trendingQuery.data ?? [];

  const handleToggleComments = (item: FeedItem) => {
    setOpenCommentId((prev) => (prev === item.id ? null : item.id));
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          Public Feed
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Discover and vote on ideas from the Clariva community.
        </p>
      </div>

      {/* Trending Row */}
      {trending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            Trending this week
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {trending.slice(0, 6).map((item) => (
              <button
                key={item.id}
                onClick={() => setDetailItem(item)}
                className="shrink-0 w-52 text-left rounded-xl border border-border bg-card hover:border-primary/40 p-3 transition-all"
              >
                <p className="text-sm font-semibold leading-snug line-clamp-2 text-foreground">
                  {item.ideaTitle}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <ThumbsUp className="w-3 h-3" />
                  {item.voteCount}
                  <span className="mx-1">·</span>
                  <span className="uppercase font-medium">
                    {item.ideaDomain}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 opacity-70">
                  Tap to view details
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Sort Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {(["recent", "votes"] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setSort(s);
              setPage(1);
              setOpenCommentId(null);
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              sort === s
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "recent" ? (
              <Clock className="w-3.5 h-3.5" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5" />
            )}
            {s === "recent" ? "Most Recent" : "Most Voted"}
          </button>
        ))}
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {feedQuery.isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!feedQuery.isLoading && feed.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No ideas published yet.</p>
          </div>
        )}

        {feed.map((item) => (
          <FeedCard
            key={item.id}
            item={item}
            currentUserId={currentUserId}
            isCommentOpen={openCommentId === item.id}
            onVote={(id) => voteMutation.mutate(id)}
            onToggleComments={handleToggleComments}
            onCollaborate={(i) => setCollaborateItem(i)}
            onViewDetails={(i) => setDetailItem(i)}
            onViewOffers={(i) => setOfferItem(i)}
          />
        ))}

        {/* Pagination */}
        {feed.length === 20 || page > 1 ? (
          <div className="flex justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={feed.length < 20}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>

      {/* Collaborate Modal */}
      {collaborateItem && (
        <CollaborateModal
          item={collaborateItem}
          onClose={() => setCollaborateItem(null)}
        />
      )}

      {/* Idea Detail Modal */}
      {detailItem && (
        <IdeaDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onVote={(id) => voteMutation.mutate(id)}
          onOpenComments={(i) => {
            setDetailItem(null);
            handleToggleComments(i);
          }}
          onCollaborate={(i) => setCollaborateItem(i)}
          currentUserId={currentUserId}
        />
      )}

      {/* Offers Panel (idea owner) */}
      {offerItem && (
        <OffersPanel item={offerItem} onClose={() => setOfferItem(null)} />
      )}
    </div>
  );
}
