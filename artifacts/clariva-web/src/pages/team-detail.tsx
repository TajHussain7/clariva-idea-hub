import { useState, useEffect } from "react";
import { useTeamDetail, useDeleteTeam } from "@/hooks/use-teams";
import { useTeamMembers, useInviteTeamMember } from "@/hooks/use-team-members";
import {
  useTeamDiscussions,
  useCreateDiscussion,
} from "@/hooks/use-discussions";
import { useTeamPresence, useWebSocket, useUpdatePresence } from "@/hooks/use-presence";
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
import { Trash2, MessageSquare, Users, Wifi } from "lucide-react";

interface TeamDetailProps {
  teamId: number;
}

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

export function TeamDetail({ teamId }: TeamDetailProps) {
  const { data: team, isLoading: teamLoading } = useTeamDetail(teamId);
  const { data: members, isLoading: membersLoading } = useTeamMembers(teamId);
  const { data: discussions, isLoading: discussionsLoading } = useTeamDiscussions(teamId);
  const { data: presence, isLoading: presenceLoading } = useTeamPresence(teamId);
  const { data: currentUser } = useCurrentUser();
  const inviteTeamMember = useInviteTeamMember(teamId);
  const createDiscussion = useCreateDiscussion(teamId);
  const deleteTeam = useDeleteTeam();
  const updatePresence = useUpdatePresence();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useWebSocket(teamId);

  // Update user presence when component mounts
  useEffect(() => {
    if (!teamId || !currentUser?.id) return;

    updatePresence.mutate({
      teamId,
      isOnline: true,
      location: "team",
    });

    const handlePresenceUpdate = () => {
      queryClient.invalidateQueries({
        queryKey: ["teams", teamId, "presence"],
      });
    };

    window.addEventListener("presence-update", handlePresenceUpdate);

    return () => {
      window.removeEventListener("presence-update", handlePresenceUpdate);
    };
  }, [teamId, currentUser?.id, queryClient]);

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showDiscussionDialog, setShowDiscussionDialog] = useState(false);
  const [discussionTitle, setDiscussionTitle] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOwner = members?.some(
    (member) => member.userId === currentUser?.id && member.role === "owner"
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
      const discussion = await createDiscussion.mutateAsync({
        title: discussionTitle,
      });
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
      toast({
        title: "Team deleted",
        description: "The team and all its data have been permanently removed.",
      });
      setLocation("/teams");
    } catch {
      toast({
        title: "Could not delete team",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (teamLoading) {
    return <TeamDetailSkeleton />;
  }

  if (!team) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">Team not found or you don&apos;t have access.</p>
        </CardContent>
      </Card>
    );
  }

  const onlineCount = presence?.filter((p) => p.isOnline).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{team.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">{team.description}</p>
        </div>
        {isOwner && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="shrink-0 self-start"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Team
          </Button>
        )}
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="members" className="cursor-pointer">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Members ({members?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="discussions" className="cursor-pointer">
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            Discussions ({discussions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="presence" className="cursor-pointer">
            <Wifi className="w-3.5 h-3.5 mr-1.5" />
            Online Now ({onlineCount})
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowInviteDialog(true)}>
              Invite Member
            </Button>
          </div>

          {membersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-16 w-full rounded" />
              ))}
            </div>
          ) : members && members.length > 0 ? (
            <div className="space-y-2">
              {members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {member.user.name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.user.email}
                      </p>
                    </div>
                    <div
                      className={`text-sm px-3 py-1 rounded font-medium border shrink-0 self-start sm:self-auto ${
                        member.role === "owner"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {member.role === "owner" ? "Team Owner" : "Member"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground">No members yet</p>
                <p className="text-xs text-muted-foreground opacity-70 mt-1">
                  Invite people using their email address
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Discussions Tab */}
        <TabsContent value="discussions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowDiscussionDialog(true)}>
              New Discussion
            </Button>
          </div>

          {discussionsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton h-16 w-full rounded" />
              ))}
            </div>
          ) : discussions && discussions.length > 0 ? (
            <div className="space-y-2">
              {discussions.map((discussion) => (
                <Card
                  key={discussion.id}
                  className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
                  onClick={() =>
                    setLocation(`/team/${teamId}/discussion/${discussion.id}`)
                  }
                >
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {discussion.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Created on{" "}
                          {new Date(discussion.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground mb-2">No discussions yet</p>
                <p className="text-xs text-muted-foreground opacity-70">
                  Start a conversation with your team
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Online Tab */}
        <TabsContent value="presence" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Updates automatically every 10 seconds
            </p>
            {presenceLoading && (
              <span className="text-xs text-muted-foreground animate-pulse">
                Refreshing&hellip;
              </span>
            )}
          </div>

          {presenceLoading && !presence ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton h-16 w-full rounded" />
              ))}
            </div>
          ) : presence && presence.filter((p) => p.isOnline).length > 0 ? (
            <div className="space-y-2">
              {presence
                .filter((user) => user.isOnline)
                .map((user) => (
                  <Card key={user.userId}>
                    <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {user.user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {user.user.name}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {user.location || "team"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <p className="text-xs font-medium text-green-600">
                          Online
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-muted-foreground/20" />
                </div>
                <p className="text-muted-foreground mb-2">No one is online right now</p>
                <p className="text-xs text-muted-foreground opacity-70">
                  Team members appear here when they&apos;re active
                </p>
              </CardContent>
            </Card>
          )}

          {presence && presence.filter((p) => !p.isOnline).length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                Offline Members
              </h3>
              <div className="space-y-2 opacity-60">
                {presence
                  .filter((user) => !user.isOnline)
                  .map((user) => (
                    <Card key={user.userId}>
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {user.user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.user.name}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground shrink-0">Offline</p>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Invite Member Dialog */}
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
              >
                {inviteTeamMember.isPending ? "Sending\u2026" : "Send Invitation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Discussion Dialog */}
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
              >
                {createDiscussion.isPending ? "Creating\u2026" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation Dialog */}
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
              {deleteTeam.isPending ? "Deleting\u2026" : "Delete Team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
