import { useState } from "react";
import { Globe, EyeOff, AlertTriangle, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { fetcher } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  ideaId: number;
  ideaTitle: string;
  isPublished: boolean;
  isAnonymous?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PublishIdeaModal({
  ideaId,
  ideaTitle,
  isPublished,
  isAnonymous: currentAnonymous = false,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [anonymous, setAnonymous] = useState(currentAnonymous);
  const [isPending, setIsPending] = useState(false);

  const handlePublish = async () => {
    setIsPending(true);
    try {
      await fetcher(`/api/feed/publish/${ideaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAnonymous: anonymous }),
      });
      toast({ title: "Idea published to the feed!" });
      queryClient.invalidateQueries({ queryKey: ["feed-status", ideaId] });
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Failed to publish",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleUnpublish = async () => {
    setIsPending(true);
    try {
      await fetcher(`/api/feed/publish/${ideaId}`, { method: "DELETE" });
      toast({ title: "Idea removed from the feed." });
      queryClient.invalidateQueries({ queryKey: ["feed-status", ideaId] });
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Failed to unpublish",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {isPublished ? "Manage Publication" : "Publish to Public Feed"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isPublished
              ? `"${ideaTitle}" is live on the public feed.`
              : `Share "${ideaTitle}" with the Clariva community.`}
          </DialogDescription>
        </DialogHeader>

        {!isPublished && (
          <div className="py-2 space-y-4">
            {/* Anonymous toggle */}
            <button
              type="button"
              onClick={() => setAnonymous((v) => !v)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-150 text-left ${
                anonymous
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  anonymous
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              >
                {anonymous && <Check className="w-3 h-3 text-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Post anonymously
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your name won't appear on the feed card.
                </p>
              </div>
              <EyeOff className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
            </button>

            <p className="text-xs text-muted-foreground px-1">
              Community members can upvote, comment, and offer to collaborate.
              You can unpublish at any time — this will remove all votes,
              comments and collaboration offers.
            </p>
          </div>
        )}

        {isPublished && (
          <div className="py-2 space-y-3">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unpublishing will permanently delete all{" "}
                <span className="font-semibold text-foreground">
                  votes, comments and collaboration offers
                </span>{" "}
                for this idea.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          {isPublished ? (
            <Button
              variant="destructive"
              onClick={handleUnpublish}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Unpublish
            </Button>
          ) : (
            <Button onClick={handlePublish} disabled={isPending}>
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Globe className="w-4 h-4 mr-2" />
              )}
              Publish
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
