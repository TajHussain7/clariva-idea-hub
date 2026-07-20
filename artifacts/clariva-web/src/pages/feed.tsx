import { useState, useEffect, useRef, useCallback } from "react";
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
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  Heading2,
  Link2,
  Paperclip,
  ArrowLeft,
  Star,
  Code,
  BarChart2,
  Lightbulb,
  AlertTriangle,
  Zap,
  Github,
  MessageSquare,
  Search,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher, useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface MyOffer {
  id: number;
  publicIdeaId: number;
  offererId: number;
  offererName: string;
  ownerId: number;
  ownerName: string;
  ideaTitle: string;
  ideaDomain: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

interface CollabMessage {
  id: number;
  offerId: number;
  senderId: number;
  senderName: string;
  content: string;
  contentType: "text" | "image" | "file";
  fileName: string | null;
  createdAt: string;
}

interface AnalysisInsight {
  title: string;
  desc: string;
}

interface GithubRepo {
  name: string;
  org: string;
  stars: number;
  desc: string;
  lang: string;
  url: string;
}

interface Analysis {
  uniquenessScore: number | null;
  feasibilityScore: number | null;
  impactScore: number | null;
  innovationScore: number | null;
  overallScore: number | null;
  strengths: AnalysisInsight[] | null;
  weaknesses: AnalysisInsight[] | null;
  risks: AnalysisInsight[] | null;
  suggestions: AnalysisInsight[] | null;
  githubRepos: GithubRepo[] | null;
  techStack: string[] | null;
  marketContext: string | null;
  verdictSummary: string | null;
}

// ─── WebSocket hook — feed ────────────────────────────────────────────────────

function useFeedSocket(onMessage: (msg: any) => void) {
  const ref = useRef<WebSocket | null>(null);
  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/ws`);
    ref.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "subscribe_feed" }));
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data));
      } catch {}
    };
    ws.onerror = () => {};
    return () => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: "unsubscribe_feed" }));
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ─── WebSocket hook — collab conversation ─────────────────────────────────────

function useCollabConvoSocket(
  offerId: number | null,
  onNewMessage: (msg: CollabMessage) => void,
) {
  const cbRef = useRef(onNewMessage);
  cbRef.current = onNewMessage;

  useEffect(() => {
    if (!offerId) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/ws`);
    ws.onopen = () =>
      ws.send(JSON.stringify({ type: "subscribe_collab_convo", offerId }));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "new_collab_message" && msg.offerId === offerId) {
          cbRef.current(msg.message);
        }
      } catch {}
    };
    ws.onerror = () => {};
    return () => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: "unsubscribe_collab_convo", offerId }));
      ws.close();
    };
  }, [offerId]);
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        // Heading
        if (line.startsWith("## ")) {
          return (
            <p key={i} className="font-bold text-base text-foreground mb-1">
              {parseInline(line.slice(3))}
            </p>
          );
        }
        // Empty line = spacing
        if (line.trim() === "") {
          return <br key={i} />;
        }
        return (
          <p key={i} className="leading-relaxed">
            {parseInline(line)}
          </p>
        );
      })}
    </>
  );
}

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Combined regex for bold, italic, links, urls, emails
  const regex =
    /(\*\*(.+?)\*\*)|(\*(.+?)\*)|\[([^\]]+)\]\((https?:\/\/[^\)]+)\)|(https?:\/\/[^\s]+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[1]) {
      parts.push(
        <strong key={key++} className="font-bold">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      parts.push(
        <em key={key++} className="italic">
          {match[4]}
        </em>,
      );
    } else if (match[5]) {
      parts.push(
        <a
          key={key++}
          href={match[6]}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {match[5]}
        </a>,
      );
    } else if (match[7]) {
      parts.push(
        <a
          key={key++}
          href={match[7]}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {match[7]}
        </a>,
      );
    } else if (match[8]) {
      parts.push(
        <a
          key={key++}
          href={`mailto:${match[8]}`}
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {match[8]}
        </a>,
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ─── Rich Text Input ──────────────────────────────────────────────────────────

function RichTextInput({
  value,
  onChange,
  onSubmit,
  isPending,
  onFileSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  onFileSelect: (file: File) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function wrap(before: string, after: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || "text";
    const next =
      value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    setTimeout(() => {
      el.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
      el.focus();
    }, 0);
  }

  function insertHeading() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = value.slice(0, lineStart) + "## " + value.slice(lineStart);
    onChange(next);
    setTimeout(() => el.focus(), 0);
  }

  function insertLink() {
    const el = textareaRef.current;
    if (!el) return;
    const url = prompt("Enter URL:");
    if (!url) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const label = value.slice(start, end) || "link";
    const next =
      value.slice(0, start) + `[${label}](${url})` + value.slice(end);
    onChange(next);
    setTimeout(() => el.focus(), 0);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert("File must be 1 MB or smaller.");
      return;
    }
    onFileSelect(file);
    e.target.value = "";
  }

  return (
    <div className="border-t border-border">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 pt-2 pb-1">
        {[
          { icon: Bold, action: () => wrap("**", "**"), title: "Bold" },
          { icon: Italic, action: () => wrap("*", "*"), title: "Italic" },
          { icon: Heading2, action: insertHeading, title: "Heading" },
          { icon: Link2, action: insertLink, title: "Link" },
        ].map(({ icon: Icon, action, title }) => (
          <button
            key={title}
            type="button"
            onClick={action}
            title={title}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <div className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Attach file or image (max 1 MB)"
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Paperclip className="w-3.5 h-3.5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Textarea + send */}
      <div className="flex gap-2 px-3 pb-3">
        <textarea
          ref={textareaRef}
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || isPending}
          className="self-end p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Conversation Modal ───────────────────────────────────────────────────────

function ConversationModal({
  offer,
  currentUserId,
  onClose,
}: {
  offer: MyOffer;
  currentUserId: number;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<CollabMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isOwner = currentUserId === offer.ownerId;
  const otherName = isOwner ? offer.offererName : offer.ownerName;

  const { data, isLoading } = useQuery<CollabMessage[]>({
    queryKey: ["collab-messages", offer.id],
    queryFn: () => fetcher(`/api/collab/${offer.id}/messages`),
  });

  useEffect(() => {
    if (data) setMessages(data);
  }, [data]);

  const sendMutation = useMutation({
    mutationFn: (payload: {
      content: string;
      contentType: string;
      fileName?: string;
    }) =>
      fetcher(`/api/collab/${offer.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onError: () =>
      toast({ title: "Failed to send message", variant: "destructive" }),
  });

  // Real-time: append incoming messages (dedup by id)
  useCollabConvoSocket(
    offer.id,
    useCallback((msg: CollabMessage) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
    }, []),
  );

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!text.trim()) return;
    sendMutation.mutate(
      { content: text.trim(), contentType: "text" },
      {
        onSuccess: (newMsg) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (newMsg as CollabMessage).id)
              ? prev
              : [...prev, newMsg as CollabMessage],
          );
          setText("");
        },
      },
    );
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const isImage = file.type.startsWith("image/");
      sendMutation.mutate(
        {
          content: dataUrl,
          contentType: isImage ? "image" : "file",
          fileName: file.name,
        },
        {
          onSuccess: (newMsg) => {
            setMessages((prev) =>
              prev.some((m) => m.id === (newMsg as CollabMessage).id)
                ? prev
                : [...prev, newMsg as CollabMessage],
            );
          },
        },
      );
    };
    reader.readAsDataURL(file);
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    accepted: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    declined: "bg-red-500/10 text-red-500 border-red-500/30",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col h-[92vh] sm:h-[80vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-card rounded-t-2xl">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {otherName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Re: {offer.ideaTitle}
            </p>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              statusColors[offer.status] ?? statusColors.pending
            }`}
          >
            {offer.status}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && messages.length === 0 && (
            <div className="text-center py-10">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs text-muted-foreground">
                Start the conversation
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const isMine = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm space-y-1 ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {!isMine && (
                    <p className="text-[10px] font-semibold opacity-70 mb-0.5">
                      {msg.senderName}
                    </p>
                  )}

                  {msg.contentType === "image" ? (
                    <img
                      src={msg.content}
                      alt={msg.fileName ?? "image"}
                      className="max-w-full rounded-lg max-h-48 object-contain"
                    />
                  ) : msg.contentType === "file" ? (
                    <a
                      href={msg.content}
                      download={msg.fileName ?? "file"}
                      className={`flex items-center gap-2 underline underline-offset-2 ${
                        isMine ? "text-primary-foreground/90" : "text-primary"
                      }`}
                    >
                      <Paperclip className="w-3.5 h-3.5 shrink-0" />
                      {msg.fileName ?? "Download file"}
                    </a>
                  ) : (
                    <div className={isMine ? "text-primary-foreground" : ""}>
                      {renderMarkdown(msg.content)}
                    </div>
                  )}

                  <p
                    className={`text-[10px] ${
                      isMine
                        ? "text-primary-foreground/60 text-right"
                        : "text-muted-foreground text-right"
                    }`}
                  >
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <RichTextInput
          value={text}
          onChange={setText}
          onSubmit={handleSend}
          isPending={sendMutation.isPending}
          onFileSelect={handleFile}
        />
      </div>
    </div>
  );
}

// ─── My Offers Tab ────────────────────────────────────────────────────────────

function MyOffersTab({
  currentUserId,
  filterPublicIdeaId,
  onOpenConversation,
}: {
  currentUserId: number;
  filterPublicIdeaId: number | null;
  onOpenConversation: (offer: MyOffer) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: offers = [], isLoading } = useQuery<MyOffer[]>({
    queryKey: ["my-offers"],
    queryFn: () => fetcher("/api/collab/my-offers"),
  });

  const respondMutation = useMutation({
    mutationFn: ({
      publicIdeaId,
      offerId,
      status,
    }: {
      publicIdeaId: number;
      offerId: number;
      status: "accepted" | "declined";
    }) =>
      fetcher(`/api/feed/${publicIdeaId}/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-offers"] });
      toast({ title: "Response sent." });
    },
    onError: () =>
      toast({ title: "Failed to respond", variant: "destructive" }),
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-600 border border-amber-500/30",
      accepted:
        "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30",
      declined: "bg-red-500/10 text-red-500 border border-red-500/30",
    };
    return map[status] ?? map.pending;
  };

  const sentOffers = offers.filter(
    (o) =>
      o.offererId === currentUserId &&
      (!filterPublicIdeaId || o.publicIdeaId === filterPublicIdeaId),
  );
  const receivedOffers = offers.filter(
    (o) =>
      o.ownerId === currentUserId &&
      (!filterPublicIdeaId || o.publicIdeaId === filterPublicIdeaId),
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No collaboration offers yet.</p>
        <p className="text-xs mt-1 opacity-70">
          Send an offer from any project card to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Received Offers */}
      {receivedOffers.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Inbox className="w-3.5 h-3.5" />
            Received Offers ({receivedOffers.length})
          </h3>
          {receivedOffers.map((offer) => (
            <div
              key={offer.id}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {offer.ideaTitle}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    from{" "}
                    <span className="font-medium text-foreground">
                      {offer.offererName}
                    </span>{" "}
                    · {new Date(offer.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusBadge(offer.status)}`}
                >
                  {offer.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {offer.message}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onOpenConversation(offer)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  Chat
                </button>
                {offer.status === "pending" && (
                  <>
                    <button
                      onClick={() =>
                        respondMutation.mutate({
                          publicIdeaId: offer.publicIdeaId,
                          offerId: offer.id,
                          status: "accepted",
                        })
                      }
                      disabled={respondMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Accept
                    </button>
                    <button
                      onClick={() =>
                        respondMutation.mutate({
                          publicIdeaId: offer.publicIdeaId,
                          offerId: offer.id,
                          status: "declined",
                        })
                      }
                      disabled={respondMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3 h-3" />
                      Decline
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Sent Offers */}
      {sentOffers.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" />
            Sent Offers ({sentOffers.length})
          </h3>
          {sentOffers.map((offer) => (
            <div
              key={offer.id}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {offer.ideaTitle}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    to{" "}
                    <span className="font-medium text-foreground">
                      {offer.ownerName}
                    </span>{" "}
                    · {new Date(offer.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusBadge(offer.status)}`}
                >
                  {offer.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {offer.message}
              </p>
              <button
                onClick={() => onOpenConversation(offer)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                Chat
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreBar({
  label,
  score,
  color,
}: {
  label: string;
  score: number | null;
  color: string;
}) {
  const pct = score ?? 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{score ?? "—"}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Idea Detail Carousel ─────────────────────────────────────────────────────

function IdeaDetailCarousel({
  item,
  onClose,
  onVote,
  onToggleComments,
  onCollaborate,
  currentUserId,
}: {
  item: FeedItem;
  onClose: () => void;
  onVote: (id: number) => void;
  onToggleComments: (item: FeedItem) => void;
  onCollaborate: (item: FeedItem) => void;
  currentUserId: number | null;
}) {
  const [slide, setSlide] = useState(0);
  const isOwner = currentUserId === item.submitterId;

  const { data: analysis, isLoading } = useQuery<Analysis | null>({
    queryKey: ["feed-analysis", item.id],
    queryFn: () => fetcher(`/api/feed/${item.id}/analysis`),
  });

  const slides = buildSlides(item, analysis ?? null);
  const total = slides.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border uppercase tracking-wider">
              {item.ideaDomain}
            </span>
            <span className="text-xs text-muted-foreground">
              {slide + 1} / {total}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Slide content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            slides[slide]?.content
          )}
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 py-2 shrink-0">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`rounded-full transition-all ${
                i === slide
                  ? "w-5 h-1.5 bg-primary"
                  : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
              }`}
            />
          ))}
        </div>

        {/* Navigation + actions */}
        <div className="flex items-center justify-between px-5 pb-4 pt-1 border-t border-border shrink-0">
          <button
            onClick={() => setSlide((s) => Math.max(0, s - 1))}
            disabled={slide === 0}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onVote(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                item.hasVoted
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
              {item.voteCount}
            </button>
            <button
              onClick={() => {
                onClose();
                onToggleComments(item);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
            >
              <MessageCircle className="w-3 h-3" />
              {item.commentCount}
            </button>
            {!isOwner && (
              <button
                onClick={() => {
                  onClose();
                  onCollaborate(item);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card text-muted-foreground hover:border-emerald-400 hover:text-emerald-500 transition-all"
              >
                <Users className="w-3 h-3" />
                Collaborate
              </button>
            )}
          </div>

          <button
            onClick={() => setSlide((s) => Math.min(total - 1, s + 1))}
            disabled={slide === total - 1}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function buildSlides(item: FeedItem, analysis: Analysis | null) {
  const slides: { label: string; content: React.ReactNode }[] = [];

  // Slide 1: Overview
  slides.push({
    label: "Overview",
    content: (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground leading-snug">
            {item.ideaTitle}
          </h2>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
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
        </div>
        <div className="rounded-xl bg-muted/40 border border-border p-4">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {item.ideaDescription}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
        {!analysis && (
          <p className="text-xs text-muted-foreground italic">
            AI analysis not yet available for this idea.
          </p>
        )}
      </div>
    ),
  });

  if (!analysis) return slides;

  // Slide 2: AI Scores
  if (
    analysis.overallScore != null ||
    analysis.feasibilityScore != null ||
    analysis.uniquenessScore != null
  ) {
    slides.push({
      label: "Scores",
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg text-foreground">AI Scores</h3>
          </div>
          {analysis.overallScore != null && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                Overall Score
              </p>
              <p className="text-5xl font-black text-primary">
                {analysis.overallScore}
              </p>
              <p className="text-xs text-muted-foreground mt-1">out of 100</p>
            </div>
          )}
          <div className="space-y-3">
            <ScoreBar
              label="Uniqueness"
              score={analysis.uniquenessScore}
              color="bg-violet-500"
            />
            <ScoreBar
              label="Feasibility"
              score={analysis.feasibilityScore}
              color="bg-blue-500"
            />
            <ScoreBar
              label="Impact"
              score={analysis.impactScore}
              color="bg-emerald-500"
            />
            <ScoreBar
              label="Innovation"
              score={analysis.innovationScore}
              color="bg-orange-500"
            />
          </div>
        </div>
      ),
    });
  }

  // Slide 3: Strengths & Weaknesses
  if (analysis.strengths?.length || analysis.weaknesses?.length) {
    slides.push({
      label: "S & W",
      content: (
        <div className="space-y-5">
          {analysis.strengths?.length ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <h4 className="font-semibold text-sm text-foreground">
                  Strengths
                </h4>
              </div>
              {analysis.strengths.map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3"
                >
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {s.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {analysis.weaknesses?.length ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <h4 className="font-semibold text-sm text-foreground">
                  Weaknesses
                </h4>
              </div>
              {analysis.weaknesses.map((w, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-red-500/5 border border-red-500/20 p-3"
                >
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                    {w.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {w.desc}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ),
    });
  }

  // Slide 4: Risks & Suggestions
  if (analysis.risks?.length || analysis.suggestions?.length) {
    slides.push({
      label: "Risks",
      content: (
        <div className="space-y-5">
          {analysis.risks?.length ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h4 className="font-semibold text-sm text-foreground">Risks</h4>
              </div>
              {analysis.risks.map((r, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3"
                >
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {r.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {r.desc}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {analysis.suggestions?.length ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm text-foreground">
                  Suggestions
                </h4>
              </div>
              {analysis.suggestions.map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-primary/5 border border-primary/20 p-3"
                >
                  <p className="text-xs font-semibold text-primary">
                    {s.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ),
    });
  }

  // Slide 5: Market Intelligence
  if (analysis.marketContext || analysis.verdictSummary) {
    slides.push({
      label: "Market",
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg text-foreground">
              Market Intelligence
            </h3>
          </div>
          {analysis.verdictSummary && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-2">
                AI Verdict
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {analysis.verdictSummary}
              </p>
            </div>
          )}
          {analysis.marketContext && (
            <div className="rounded-xl bg-muted/40 border border-border p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Market Context
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {analysis.marketContext}
              </p>
            </div>
          )}
        </div>
      ),
    });
  }

  // Slide 6: Tech Ecosystem
  if (analysis.techStack?.length || analysis.githubRepos?.length) {
    slides.push({
      label: "Tech",
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg text-foreground">
              Tech Ecosystem
            </h3>
          </div>
          {analysis.techStack?.length ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Tech Stack
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.techStack.map((t, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted border border-border text-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {analysis.githubRepos?.length ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5" />
                Similar GitHub Projects
              </p>
              {analysis.githubRepos.slice(0, 4).map((repo, i) => (
                <a
                  key={i}
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 hover:border-primary/40 transition-colors"
                >
                  <Github className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {repo.org}/{repo.name}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {repo.desc}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" />
                        {repo.stars.toLocaleString()}
                      </span>
                      {repo.lang && <span>{repo.lang}</span>}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ),
    });
  }

  return slides;
}

// ─── Inline Comment Section ───────────────────────────────────────────────────

function InlineComments({ item }: { item: FeedItem }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
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

  const toggleReaction = (commentId: number, r: "like" | "dislike") => {
    setReactions((prev) => {
      const next = new Map(prev);
      next.set(commentId, next.get(commentId) === r ? null : r);
      return next;
    });
  };

  const formatTime = (iso: string) => {
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
  };

  return (
    <div className="border-t border-border">
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
              <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                {c.content}
              </p>
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) addMutation.mutate(text.trim());
        }}
        className="px-4 pb-4 flex gap-2"
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

// ─── Feed Card ────────────────────────────────────────────────────────────────

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
        <div className="flex items-start gap-3">
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

          {!isOwner && (
            <button
              onClick={() => onCollaborate(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border bg-card text-muted-foreground hover:border-emerald-400 hover:text-emerald-500 transition-all duration-150"
            >
              <Users className="w-3.5 h-3.5" />
              Collaborate
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => onViewOffers(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border bg-card text-muted-foreground hover:border-amber-400 hover:text-amber-500 transition-all duration-150"
            >
              <Inbox className="w-3.5 h-3.5" />
              Offers
            </button>
          )}

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
        title: err?.message ?? "Failed to send offer",
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
            {mutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            )}
            Send Offer
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Feed Page ────────────────────────────────────────────────────────────────

type SortTab = "recent" | "votes" | "offers";

export function Feed() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const search = useSearch();
  const [sort, setSort] = useState<SortTab>(() => {
    const tab = new URLSearchParams(search).get("tab");
    return tab === "votes" || tab === "offers" ? tab : "recent";
  });
  const [page, setPage] = useState(1);
  const [openCommentId, setOpenCommentId] = useState<number | null>(null);
  const [collaborateItem, setCollaborateItem] = useState<FeedItem | null>(null);
  const [detailItem, setDetailItem] = useState<FeedItem | null>(null);
  const [conversationOffer, setConversationOffer] = useState<MyOffer | null>(
    null,
  );
  const [offerFilterPublicIdeaId, setOfferFilterPublicIdeaId] = useState<
    number | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FeedItem[] | null>(null);

  const { data: me } = useGetMe();
  const currentUserId = me?.id ?? null;

  const feedQuery = useQuery<FeedItem[]>({
    queryKey: ["feed", sort, page],
    queryFn: () => fetcher(`/api/feed?sort=${sort}&page=${page}&limit=20`),
    enabled: sort !== "offers",
  });

  const trendingQuery = useQuery<FeedItem[]>({
    queryKey: ["feed-trending"],
    queryFn: () => fetcher("/api/feed/trending"),
    enabled: sort !== "offers",
  });

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

  useFeedSocket((msg) => {
    if (
      [
        "vote_updated",
        "idea_published",
        "idea_unpublished",
        "comment_added",
        "comment_deleted",
      ].includes(msg.type)
    ) {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["feed-trending"] });
    }
  });

  const feed = feedQuery.data ?? [];
  const trending = trendingQuery.data ?? [];

  // Determine displayed feed: search results or regular feed
  const displayedFeed = searchResults !== null ? searchResults : feed;

  const handleToggleComments = (item: FeedItem) => {
    setOpenCommentId((prev) => (prev === item.id ? null : item.id));
  };

  const handleViewOffers = (item: FeedItem) => {
    setOfferFilterPublicIdeaId(item.id);
    setSort("offers");
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetcher<{ results: FeedItem[] }>(
        "/api/feed/search",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery.trim() }),
        },
      );
      setSearchResults(response.results);
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Could not search ideas. Please try again.",
        variant: "destructive",
      });
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const tabs: { key: SortTab; label: string; icon: React.ReactNode }[] = [
    {
      key: "recent",
      label: "Most Recent",
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    {
      key: "votes",
      label: "Most Voted",
      icon: <TrendingUp className="w-3.5 h-3.5" />,
    },
    {
      key: "offers",
      label: "Collaboration / Offers",
      icon: <Users className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          Public Feed
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Discover ideas, collaborate, and track your offers.
        </p>
      </div>

      {/* Trending — only on feed tabs */}
      {sort !== "offers" && trending.length > 0 && (
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

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => {
              setSort(key);
              setPage(1);
              setOpenCommentId(null);
              setSearchQuery("");
              setSearchResults(null);
              if (key !== "offers") setOfferFilterPublicIdeaId(null);
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              sort === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Search Bar - Show only on Recent and Votes tabs */}
      {sort !== "offers" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Search ideas by title, description, or domain..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted/60 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors placeholder:text-muted-foreground"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isSearching}
              size="sm"
              className="gap-1.5"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </Button>
            {searchResults !== null && (
              <Button
                onClick={handleClearSearch}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>
          {searchResults !== null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                Found{" "}
                <span className="font-semibold text-foreground">
                  {searchResults.length}
                </span>{" "}
                {searchResults.length === 1 ? "idea" : "ideas"} matching "
                {searchQuery}"
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tab content */}
      {sort === "offers" ? (
        currentUserId ? (
          <MyOffersTab
            currentUserId={currentUserId}
            filterPublicIdeaId={offerFilterPublicIdeaId}
            onOpenConversation={(offer) => setConversationOffer(offer)}
          />
        ) : (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )
      ) : (
        <div className="space-y-4">
          {feedQuery.isLoading && !searchResults && (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!feedQuery.isLoading && displayedFeed.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
              {searchResults !== null ? (
                <>
                  <p className="text-sm font-medium">No ideas found</p>
                  <p className="text-xs mt-1 opacity-70">
                    Try adjusting your search query or explore all ideas
                  </p>
                </>
              ) : (
                <p className="text-sm">No ideas published yet.</p>
              )}
            </div>
          )}
          {displayedFeed.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              isCommentOpen={openCommentId === item.id}
              onVote={(id) => voteMutation.mutate(id)}
              onToggleComments={handleToggleComments}
              onCollaborate={(i) => setCollaborateItem(i)}
              onViewDetails={(i) => setDetailItem(i)}
              onViewOffers={handleViewOffers}
            />
          ))}
          {searchResults === null && (feed.length === 20 || page > 1) && (
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
          )}
        </div>
      )}

      {/* Overlays */}
      {collaborateItem && (
        <CollaborateModal
          item={collaborateItem}
          onClose={() => setCollaborateItem(null)}
        />
      )}

      {detailItem && (
        <IdeaDetailCarousel
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onVote={(id) => voteMutation.mutate(id)}
          onToggleComments={handleToggleComments}
          onCollaborate={(i) => setCollaborateItem(i)}
          currentUserId={currentUserId}
        />
      )}

      {conversationOffer && currentUserId && (
        <ConversationModal
          offer={conversationOffer}
          currentUserId={currentUserId}
          onClose={() => setConversationOffer(null)}
        />
      )}
    </div>
  );
}
