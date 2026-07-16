import { useState, useEffect, useRef } from "react";
import {
  Globe,
  ThumbsUp,
  MessageCircle,
  Users,
  TrendingUp,
  Loader2,
  Send,
  Flame,
  Clock,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@workspace/api-client-react";
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

// ─── Feed Card ───────────────────────────────────────────────────────────────

function FeedCard({
  item,
  onVote,
  onOpenComments,
  onCollaborate,
}: {
  item: FeedItem;
  onVote: (id: number) => void;
  onOpenComments: (item: FeedItem) => void;
  onCollaborate: (item: FeedItem) => void;
}) {
  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
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

          {/* Comments button */}
          <button
            onClick={() => onOpenComments(item)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-150"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {item.commentCount}
          </button>

          {/* Collaborate button */}
          <button
            onClick={() => onCollaborate(item)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-emerald-500 transition-all duration-150"
          >
            <Users className="w-3.5 h-3.5" />
            Collaborate
          </button>

          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(item.publishedAt).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Comment Panel ────────────────────────────────────────────────────────────

function CommentPanel({
  item,
  onClose,
}: {
  item: FeedItem;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h4 className="font-semibold text-sm">Comments — {item.ideaTitle}</h4>
        <button
          onClick={onClose}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No comments yet. Be the first!
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">
              {c.authorName}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {c.content}
            </p>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-border flex gap-2"
      >
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
  const [commentItem, setCommentItem] = useState<FeedItem | null>(null);
  const [collaborateItem, setCollaborateItem] = useState<FeedItem | null>(null);

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
                onClick={() => voteMutation.mutate(item.id)}
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
      <div className="flex gap-6">
        {/* Cards column */}
        <div className={`flex-1 space-y-4 ${commentItem ? "min-w-0" : ""}`}>
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
              onVote={(id) => voteMutation.mutate(id)}
              onOpenComments={(i) =>
                setCommentItem((prev) => (prev?.id === i.id ? null : i))
              }
              onCollaborate={(i) => setCollaborateItem(i)}
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

        {/* Comment Panel */}
        {commentItem && (
          <div className="w-80 shrink-0 border border-border rounded-xl bg-card flex flex-col h-[600px] sticky top-6 self-start">
            <CommentPanel
              item={commentItem}
              onClose={() => setCommentItem(null)}
            />
          </div>
        )}
      </div>

      {/* Collaborate Modal */}
      {collaborateItem && (
        <CollaborateModal
          item={collaborateItem}
          onClose={() => setCollaborateItem(null)}
        />
      )}
    </div>
  );
}
