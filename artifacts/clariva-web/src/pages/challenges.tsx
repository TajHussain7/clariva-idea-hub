import { useState, useEffect, useRef } from "react";
import {
  Trophy,
  ThumbsUp,
  Loader2,
  Crown,
  Send,
  AlertTriangle,
  X,
  Clock,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher, useListIdeas } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Challenge {
  id: number;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  createdBy: number;
  status: string;
  originalEndsAt?: string;
  extensionCount: number;
  isExtended?: boolean;
  extensionInfo?: {
    originalEndsAt: string;
    extensionCount: number;
  };
}

interface Submission {
  id: number;
  challengeId: number;
  ideaId: number;
  userId: number;
  submittedAt: string;
  ideaTitle: string;
  ideaDomain: string;
  submitterName: string;
  voteCount: number;
  hasVoted: boolean;
  isOwnSubmission: boolean;
}

interface Winner {
  id: number;
  ideaId: number;
  userId: number;
  ideaTitle: string;
  submitterName: string;
  voteCount: number;
}

// ─── WebSocket hook ───────────────────────────────────────────────────────────

function useChallengeSocket(
  challengeId: number | undefined,
  onMessage: (msg: any) => void,
) {
  const ref = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!challengeId || window.location.hostname.includes("vercel.app")) return;

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/ws`);
    ref.current = ws;

    ws.onopen = () =>
      ws.send(JSON.stringify({ type: "subscribe_challenge", challengeId }));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        onMessage(msg);
      } catch {}
    };
    ws.onerror = () => {};

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "unsubscribe_challenge" }));
      }
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId]);
}

// ─── Feed socket for global updates ───────────────────────────────────────────

function useFeedSocket(onMessage: (msg: any) => void) {
  const ref = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (window.location.hostname.includes("vercel.app")) return;

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
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "unsubscribe_feed" }));
      }
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ─── Countdown helper ─────────────────────────────────────────────────────────

function useCountdown(endsAt: string | undefined) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Ended");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLabel(d > 0 ? `${d}d ${h}h left` : `${h}h ${m}m left`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [endsAt]);

  return label;
}

// ─── Submit Modal ─────────────────────────────────────────────────────────────

function SubmitModal({
  challengeId,
  onClose,
}: {
  challengeId: number;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: ideas = [] } = useListIdeas({
    query: { queryKey: ["ideas"] },
  });

  const analyzedIdeas = (ideas as any[]).filter(
    (i: any) => i.status === "analyzed",
  );

  const submitMutation = useMutation({
    mutationFn: (ideaId: number) =>
      fetcher(`/api/challenges/${challengeId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId }),
      }),
    onSuccess: () => {
      toast({ title: "Idea submitted to the challenge!" });
      queryClient.invalidateQueries({
        queryKey: ["challenge-submissions", challengeId],
      });
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Submission failed",
        description: err?.message,
        variant: "destructive",
      }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Submit an Idea
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose one of your analyzed ideas to enter in this challenge.
        </p>

        {analyzedIdeas.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            You have no analyzed ideas yet. Analyze an idea first.
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {analyzedIdeas.map((idea: any) => (
            <button
              key={idea.id}
              onClick={() => setSelectedId(idea.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                selectedId === idea.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">
                {idea.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 uppercase">
                {idea.domain}
              </p>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => selectedId && submitMutation.mutate(selectedId)}
            disabled={!selectedId || submitMutation.isPending}
          >
            {submitMutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            )}
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Challenges Page ──────────────────────────────────────────────────────────

export function Challenges() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Fetch active challenge
  const { data: challenge, isLoading: challengeLoading } = useQuery<Challenge>({
    queryKey: ["challenge-active"],
    queryFn: () => fetcher("/api/challenges/active"),
    retry: false,
  });

  const countdown = useCountdown(challenge?.endsAt);
  const isEnded = challenge ? new Date(challenge.endsAt) <= new Date() : false;

  // Submissions / leaderboard
  const { data: submissions = [], isLoading: subLoading } = useQuery<
    Submission[]
  >({
    queryKey: ["challenge-submissions", challenge?.id],
    queryFn: () => fetcher(`/api/challenges/${challenge!.id}/submissions`),
    enabled: !!challenge,
  });

  // Winner (only when ended)
  const winnerQuery = useQuery<{
    winner: Winner | null;
    badgeAwarded?: boolean;
    message?: string;
  }>({
    queryKey: ["challenge-winner", challenge?.id],
    queryFn: () => fetcher(`/api/challenges/${challenge!.id}/winner`),
    enabled: !!challenge && isEnded,
    retry: false,
  });

  // Vote mutation with self-voting check
  const voteMutation = useMutation({
    mutationFn: (submissionId: number) =>
      fetcher(
        `/api/challenges/${challenge!.id}/submissions/${submissionId}/vote`,
        { method: "POST" },
      ),
    onMutate: async (submissionId) => {
      await queryClient.cancelQueries({
        queryKey: ["challenge-submissions", challenge?.id],
      });
      const prev = queryClient.getQueryData<Submission[]>([
        "challenge-submissions",
        challenge?.id,
      ]);
      queryClient.setQueryData<Submission[]>(
        ["challenge-submissions", challenge?.id],
        (old) =>
          old?.map((s) =>
            s.id === submissionId
              ? {
                  ...s,
                  hasVoted: !s.hasVoted,
                  voteCount: s.hasVoted ? s.voteCount - 1 : s.voteCount + 1,
                }
              : s,
          ),
      );
      return { prev };
    },
    onError: (error: any, _id, ctx) => {
      queryClient.setQueryData(
        ["challenge-submissions", challenge?.id],
        ctx?.prev,
      );
      const message = error?.message || "Vote failed";
      toast({
        title: message.includes("own submission")
          ? "Cannot vote on own submission"
          : "Vote failed",
        description: message.includes("own submission")
          ? "You cannot vote for your own idea"
          : undefined,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["challenge-submissions", challenge?.id],
      });
    },
  });

  // Real-time updates for challenge events
  useChallengeSocket(challenge?.id, (msg) => {
    if (msg.type === "vote_updated" || msg.type === "submission_added") {
      queryClient.invalidateQueries({
        queryKey: ["challenge-submissions", challenge?.id],
      });
    } else if (msg.type === "challenge_extended") {
      queryClient.invalidateQueries({ queryKey: ["challenge-active"] });
      toast({
        title: "Challenge Extended!",
        description: "Challenge extended by 2 days due to low submissions.",
      });
    } else if (msg.type === "challenge_completed") {
      queryClient.invalidateQueries({ queryKey: ["challenge-active"] });
      queryClient.invalidateQueries({
        queryKey: ["challenge-winner", challenge?.id],
      });
    } else if (msg.type === "winner_declared") {
      queryClient.invalidateQueries({
        queryKey: ["challenge-winner", challenge?.id],
      });
      toast({
        title: "🎉 Winner Announced!",
        description: "Check out the winning idea below.",
      });
    }
  });

  // Listen for new challenges on feed
  useFeedSocket((msg) => {
    if (msg.type === "challenge_created") {
      queryClient.invalidateQueries({ queryKey: ["challenge-active"] });
      toast({
        title: "New Challenge Available!",
        description: "A fresh weekly challenge just dropped.",
      });
    }
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  if (challengeLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="text-center py-20 space-y-4 animate-in fade-in duration-500">
        <div className="relative">
          <Trophy className="w-16 h-16 mx-auto text-muted-foreground/20" />
          <Sparkles className="w-6 h-6 absolute top-0 right-1/3 text-amber-500/40 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          No Active Challenge Yet
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
          A new AI-generated weekly challenge will appear here soon. Check back
          in a bit, or the system will automatically create one within the hour.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
          <AlertCircle className="w-4 h-4" />
          <span>Challenges are created automatically every week</span>
        </div>
      </div>
    );
  }

  // Find user's own submission
  const userSubmission = submissions.find((s) => s.isOwnSubmission);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          Weekly Challenge
          {challenge.isExtended && (
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
              Extended
            </span>
          )}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Submit your best idea and let the community vote.
        </p>
      </div>

      {/* Winner Banner */}
      {isEnded && winnerQuery.data?.winner && (
        <div className="flex items-center gap-4 p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 animate-in slide-in-from-top duration-700">
          <Crown className="w-8 h-8 text-amber-500 shrink-0 animate-pulse" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-0.5">
              🎉 Challenge Winner
            </p>
            <p className="font-bold text-foreground">
              {winnerQuery.data.winner.ideaTitle}
            </p>
            <p className="text-sm text-muted-foreground">
              by {winnerQuery.data.winner.submitterName} ·{" "}
              {winnerQuery.data.winner.voteCount} vote
              {winnerQuery.data.winner.voteCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {/* Pending winner calculation */}
      {isEnded && !winnerQuery.data?.winner && winnerQuery.data?.message && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
          <Loader2 className="w-5 h-5 text-blue-500 shrink-0 animate-spin" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Calculating Winner...
            </p>
            <p className="text-xs text-muted-foreground">
              Results will be announced shortly
            </p>
          </div>
        </div>
      )}

      {/* Problem Statement Card */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-primary to-amber-400" />
        <CardHeader className="pb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            This week's problem
          </p>
          <CardTitle className="text-xl font-bold leading-snug">
            {challenge.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {challenge.description}
          </p>

          {/* Extension info */}
          {challenge.isExtended && challenge.extensionInfo && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700">
                <p className="font-semibold">Challenge Extended</p>
                <p className="text-amber-600/80 mt-0.5">
                  Extended by 2 days due to low submissions. New deadline:{" "}
                  {new Date(challenge.endsAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {isEnded ? (
                <span className="text-destructive font-medium">Ended</span>
              ) : (
                <span className="font-medium text-foreground">{countdown}</span>
              )}
            </div>
            {!isEnded && (
              <Button
                size="sm"
                onClick={() => setShowSubmitModal(true)}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Submit My Idea
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User's Own Submission Card */}
      {userSubmission && (
        <Card className="bg-primary/5 border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">
                Your Submission
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">
                  {userSubmission.ideaTitle}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted{" "}
                  {new Date(userSubmission.submittedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {userSubmission.voteCount}
                </p>
                <p className="text-xs text-muted-foreground">votes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <div className="space-y-4">
        <h2 className="font-semibold text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Leaderboard
          <span className="ml-auto text-xs text-muted-foreground font-normal">
            {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
          </span>
        </h2>

        {subLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!subLoading && submissions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No submissions yet. Be the first!</p>
          </div>
        )}

        <div className="space-y-3">
          {submissions.map((sub, idx) => (
            <div
              key={sub.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                sub.isOwnSubmission
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : idx === 0
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border bg-card"
              }`}
            >
              {/* Rank */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  idx === 0
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {idx === 0 ? <Crown className="w-4 h-4" /> : idx + 1}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {sub.ideaTitle}
                  </p>
                  {sub.isOwnSubmission && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-primary/10 text-primary">
                      YOU
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  by {sub.submitterName}
                </p>
              </div>

              {/* Vote Button */}
              {!isEnded && (
                <button
                  onClick={() => voteMutation.mutate(sub.id)}
                  disabled={voteMutation.isPending || sub.isOwnSubmission}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    sub.isOwnSubmission
                      ? "bg-muted text-muted-foreground/50 border-border cursor-not-allowed"
                      : sub.hasVoted
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
                  }`}
                  title={
                    sub.isOwnSubmission
                      ? "Cannot vote on your own submission"
                      : undefined
                  }
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {sub.voteCount}
                </button>
              )}

              {isEnded && (
                <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                  {sub.voteCount} vote{sub.voteCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <SubmitModal
          challengeId={challenge.id}
          onClose={() => setShowSubmitModal(false)}
        />
      )}
    </div>
  );
}
