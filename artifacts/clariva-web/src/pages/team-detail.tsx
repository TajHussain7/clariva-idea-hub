import { useState, useEffect, useRef } from "react";
import { useTeamDetail, useDeleteTeam } from "@/hooks/use-teams";
import { useTeamMembers, useInviteTeamMember } from "@/hooks/use-team-members";
import {
  useTeamDiscussions,
  useCreateDiscussion,
} from "@/hooks/use-discussions";
import { useTeamPresence, useWebSocket } from "@/hooks/use-presence";
import { useCurrentUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Trash2,
  MessageSquare,
  Users,
  Radio,
  Plus,
  ArrowRight,
  Crown,
  ChevronRight,
  Calendar,
  UserPlus,
  Loader2,
  Clock,
} from "lucide-react";
import { fetcher } from "@workspace/api-client-react";

interface TeamDetailProps {
  teamId: number;
}

/* ---- Skeleton ---- */
function TeamDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="skeleton h-8 w-48 rounded" />
          <div className="skeleton h-4 w-72 rounded" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="skeleton h-10 w-64 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-16 w-full rounded" />
        ))}
      </div>
    </div>
  );
}

/* ---- Avatar ---- */
function Avatar({
  name,
  avatarUrl,
  size = "md",
  online,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  online?: boolean;
}) {
  const dim = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <div className="relative shrink-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${dim} rounded-full object-cover border border-border`}
        />
      ) : (
        <div
          className={`${dim} rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-primary`}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
            online ? "bg-emerald-500" : "bg-muted-foreground/30"
          }`}
          aria-label={online ? "Online" : "Offline"}
        />
      )}
    </div>
  );
}

/* ---- Time ago ---- */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* =================== Main Component =================== */
export function TeamDetail({ teamId }: TeamDetailProps) {
  const { data: team, isLoading: teamLoading } = useTeamDetail(teamId);
  const { data: members, isLoading: membersLoading } = useTeamMembers(teamId);
  const { data: discussions, isLoading: discussionsLoading } = useTeamDiscussions(teamId);
  const { data: presence, isLoading: presenceLoading } = useTeamPresence(teamId);
  const { data: currentUser } = useCurrentUser();
  const inviteTeamMember = useInviteTeamMember(teamId);
  const createDiscussion = useCreateDiscussion(teamId);
  const deleteTeam = useDeleteTeam();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Stable ref for the mutation function to avoid stale closure in useEffect
  const updatePresenceRef = useRef<(data: { teamId: number; isOnline: boolean; location: string }) => Promise<void>>(
    async () => {},
  );
  updatePresenceRef.current = async (data) => {
    try {
      await fetcher("/api/presence", {
        method: "POST",
        body: JSON.stringify(data),
      });
      queryClient.invalidateQueries({ queryKey: ["teams", teamId, "presence"] });
    } catch {
      // Presence is non-critical
    }
  };

  useWebSocket(teamId);

  // Mark self online on mount, offline on unmount — using stable ref to avoid re-fires
  useEffect(() => {
    if (!teamId || !currentUser?.id) return;

    updatePresenceRef.current({ teamId, isOnline: true, location: "team" });

    return () => {
      // Fire-and-forget on cleanup — mark offline
      updatePresenceRef.current({ teamId, isOnline: false, location: "team" });
    };
    // Only re-run if teamId or currentUser.id changes — NOT on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, currentUser?.id]);

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showDiscussionDialog, setShowDiscussionDialog] = useState(false);
  const [discussionTitle, setDiscussionTitle] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOwner = members?.some(
    (member) => member.userId === currentUser?.id && member.role === "owner",
  );

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast({ title: "Email required", description: "Please enter an email address to invite." });
      return;
    }
    try {
      await inviteTeamMember.mutateAsync(inviteEmail);
      setShowInviteDialog(false);
      setInviteEmail("");
      toast({ title: "Invitation sent", description: `An invitation has been sent to ${inviteEmail}.` });
    } catch (error: any) {
      const message = error?.message || "";
      toast({
        title: "Could not send invitation",
        description: message.toLowerCase().includes("not found")
          ? "No account found with that email address."
          : message.toLowerCase().includes("already")
            ? "This person is already a member of the team."
            : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateDiscussion = async () => {
    if (!discussionTitle.trim()) {
      toast({ title: "Title required", description: "Please enter a title for the discussion." });
      return;
    }
    try {
      const discussion = await createDiscussion.mutateAsync({ title: discussionTitle });
      setShowDiscussionDialog(false);
      setDiscussionTitle("");
      setLocation(`/team/${teamId}/discussion/${discussion.id}`);
    } catch {
      toast({
        title: "Could not create discussion",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTeam = async () => {
    try {
      await deleteTeam.mutateAsync(teamId);
      setShowDeleteDialog(false);
      toast({ title: "Team deleted", description: "The team and all its data have been permanently removed." });
      setLocation("/teams");
    } catch {
      toast({
        title: "Could not delete team",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (teamLoading) return <TeamDetailSkeleton />;

  if (!team) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">Team not found or you don&apos;t have access.</p>
        </CardContent>
      </Card>
    );
  }

  const onlineMembers = presence?.filter((p) => p.isOnline) ?? [];
  const offlineMembers = presence?.filter((p) => !p.isOnline) ?? [];
  const onlineCount = onlineMembers.length;

  return (
    <div className="space-y-6 pb-8">
      {/* ---- Page Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Users className="w-3 h-3" />
              Team
            </span>
            {onlineCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {onlineCount} online
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {team.name}
          </h1>
          {team.description && (
            <p className="text-muted-foreground mt-1 text-sm sm:text-base leading-relaxed max-w-xl">
              {team.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start">
          {isOwner && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Team
            </Button>
          )}
        </div>
      </div>

      {/* ---- Tabs ---- */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1 p-1 bg-muted/50 border border-border rounded-xl">
          <TabsTrigger
            value="members"
            className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            Members
            <span className="ml-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">
              {members?.length ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="discussions"
            className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Discussions
            <span className="ml-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">
              {discussions?.length ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="presence"
            className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            Online Now
            {onlineCount > 0 ? (
              <span className="ml-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 tabular-nums">
                {onlineCount}
              </span>
            ) : (
              <span className="ml-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">
                0
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ============ Members Tab ============ */}
        <TabsContent value="members" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? "s" : ""} in this team
            </p>
            <Button
              size="sm"
              onClick={() => setShowInviteDialog(true)}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </Button>
          </div>

          {membersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : members && members.length > 0 ? (
            <div className="space-y-2">
              {members.map((member) => {
                const presenceEntry = presence?.find((p) => p.userId === member.userId);
                return (
                  <div
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={member.user.name}
                        avatarUrl={(member.user as any).avatarUrl}
                        size="md"
                        online={presenceEntry?.isOnline}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {member.user.name}
                          </p>
                          {member.role === "owner" && (
                            <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border shrink-0 self-start sm:self-auto ${
                        member.role === "owner"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {member.role === "owner" ? "Owner" : "Member"}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 rounded-xl border border-dashed border-border">
              <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Users className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No members yet</p>
              <p className="text-xs text-muted-foreground mb-4">
                Invite people using their email address
              </p>
              <Button size="sm" onClick={() => setShowInviteDialog(true)} className="gap-2">
                <UserPlus className="w-4 h-4" />
                Invite Member
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ============ Discussions Tab ============ */}
        <TabsContent value="discussions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {discussions?.length ?? 0} discussion{(discussions?.length ?? 0) !== 1 ? "s" : ""}
            </p>
            <Button
              size="sm"
              onClick={() => setShowDiscussionDialog(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Discussion
            </Button>
          </div>

          {discussionsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : discussions && discussions.length > 0 ? (
            <div className="space-y-2">
              {discussions.map((discussion) => (
                <button
                  key={discussion.id}
                  onClick={() => setLocation(`/team/${teamId}/discussion/${discussion.id}`)}
                  className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-muted/30 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                        {discussion.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(discussion.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 rounded-xl border border-dashed border-border">
              <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No discussions yet</p>
              <p className="text-xs text-muted-foreground mb-4">
                Start a conversation with your team
              </p>
              <Button
                size="sm"
                onClick={() => setShowDiscussionDialog(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Start Discussion
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ============ Online Now Tab ============ */}
        <TabsContent value="presence" className="space-y-4 mt-4">
          {/* Status bar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {presenceLoading
                ? "Checking who's online…"
                : `${onlineCount} member${onlineCount !== 1 ? "s" : ""} currently active`}
            </p>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updates every 10s
              {presenceLoading && (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              )}
            </span>
          </div>

          {/* Online members */}
          {presenceLoading && !presence ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : onlineMembers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Now — {onlineMembers.length}
              </p>
              {onlineMembers.map((user) => (
                <div
                  key={user.userId}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={user.user.name}
                      avatarUrl={user.user.avatarUrl}
                      size="md"
                      online={true}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">
                        {user.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize flex items-center gap-1 mt-0.5">
                        <ArrowRight className="w-3 h-3" />
                        {user.location || "team"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Online
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 rounded-xl border border-dashed border-border">
              <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Radio className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No one is online right now</p>
              <p className="text-xs text-muted-foreground">
                Team members appear here when they&apos;re active
              </p>
            </div>
          )}

          {/* Offline members */}
          {offlineMembers.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
                Offline — {offlineMembers.length}
              </p>
              <div className="space-y-2 opacity-60">
                {offlineMembers.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-card"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={user.user.name}
                        avatarUrl={user.user.avatarUrl}
                        size="sm"
                        online={false}
                      />
                      <p className="text-sm text-muted-foreground truncate font-medium">
                        {user.user.name}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {user.lastActivity ? timeAgo(user.lastActivity) : "Offline"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ============ Invite Member Dialog ============ */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join this team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter email address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !inviteTeamMember.isPending && handleInviteMember()
              }
              disabled={inviteTeamMember.isPending}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInviteDialog(false);
                  setInviteEmail("");
                }}
                disabled={inviteTeamMember.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteMember}
                disabled={inviteTeamMember.isPending || !inviteEmail.trim()}
                className="gap-2"
              >
                {inviteTeamMember.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {inviteTeamMember.isPending ? "Sending…" : "Send Invitation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ Create Discussion Dialog ============ */}
      <Dialog open={showDiscussionDialog} onOpenChange={setShowDiscussionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a Discussion</DialogTitle>
            <DialogDescription>
              Create a new discussion for your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Discussion title"
              value={discussionTitle}
              onChange={(e) => setDiscussionTitle(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !createDiscussion.isPending && handleCreateDiscussion()
              }
              disabled={createDiscussion.isPending}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDiscussionDialog(false);
                  setDiscussionTitle("");
                }}
                disabled={createDiscussion.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateDiscussion}
                disabled={createDiscussion.isPending || !discussionTitle.trim()}
                className="gap-2"
              >
                {createDiscussion.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {createDiscussion.isPending ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ Delete Team Confirmation Dialog ============ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this team?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The team and all associated
              discussions, messages, and data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTeam.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTeam.isPending}
            >
              {deleteTeam.isPending ? "Deleting…" : "Delete Team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
