import { useState } from "react";
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
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Trash2 } from "lucide-react";

interface TeamDetailProps {
  teamId: number;
}

export function TeamDetail({ teamId }: TeamDetailProps) {
  const { data: team } = useTeamDetail(teamId);
  const { data: members } = useTeamMembers(teamId);
  const { data: discussions } = useTeamDiscussions(teamId);
  const { data: presence } = useTeamPresence(teamId);
  const { data: currentUser } = useCurrentUser();
  const inviteTeamMember = useInviteTeamMember(teamId);
  const createDiscussion = useCreateDiscussion(teamId);
  const deleteTeam = useDeleteTeam();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const wsRef = useWebSocket(teamId);

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showDiscussionDialog, setShowDiscussionDialog] = useState(false);
  const [discussionTitle, setDiscussionTitle] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Check if current user is the team owner
  const isOwner = members?.some(
    (member) => member.userId === currentUser?.id && member.role === "owner"
  );

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast({ title: "Error", description: "Email is required" });
      return;
    }

    try {
      await inviteTeamMember.mutateAsync(inviteEmail);
      setShowInviteDialog(false);
      setInviteEmail("");
      toast({ title: "Success", description: "Invitation sent" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to send invitation" });
    }
  };

  const handleCreateDiscussion = async () => {
    if (!discussionTitle.trim()) {
      toast({ title: "Error", description: "Discussion title is required" });
      return;
    }

    try {
      const discussion = await createDiscussion.mutateAsync({
        title: discussionTitle,
      });
      setShowDiscussionDialog(false);
      setDiscussionTitle("");
      setLocation(`/team/${teamId}/discussion/${discussion.id}`);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create discussion" });
    }
  };

  const handleDeleteTeam = async () => {
    try {
      await deleteTeam.mutateAsync(teamId);
      setShowDeleteDialog(false);
      toast({ 
        title: "Success", 
        description: "Team and all conversations deleted successfully" 
      });
      setLocation("/teams");
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to delete team" 
      });
    }
  };

  if (!team) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{team.name}</h1>
          <p className="text-muted-foreground">{team.description}</p>
        </div>
        {isOwner && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Team
          </Button>
        )}
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">
            Members ({members?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="discussions">
            Discussions ({discussions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="presence">
            Online Now ({presence?.filter((p) => p.isOnline).length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowInviteDialog(true)}>
              Invite Member
            </Button>
          </div>

          {members && members.length > 0 ? (
            <div className="space-y-2">
              {members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium text-foreground">
                        {member.user.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                    <div
                      className={`text-sm px-3 py-1 rounded font-medium border ${
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
                <p className="text-muted-foreground">No members yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="discussions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowDiscussionDialog(true)}>
              New Discussion
            </Button>
          </div>

          {discussions && discussions.length > 0 ? (
            <div className="space-y-2">
              {discussions.map((discussion) => (
                <Card
                  key={discussion.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() =>
                    setLocation(`/team/${teamId}/discussion/${discussion.id}`)
                  }
                >
                  <CardContent className="py-4">
                    <p className="font-medium text-foreground">
                      {discussion.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Created on{" "}
                      {new Date(discussion.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No discussions yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="presence" className="space-y-4">
          {presence && presence.length > 0 ? (
            <div className="space-y-2">
              {presence.map((user) => (
                <Card key={user.userId}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          user.isOnline
                            ? "bg-green-500"
                            : "bg-muted-foreground/40"
                        }`}
                      />
                      <div>
                        <p className="font-medium text-foreground">
                          {user.user.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.location}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {user.isOnline ? "Online now" : "Offline"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No one is online</p>
              </CardContent>
            </Card>
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
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteMember}
                disabled={inviteTeamMember.isPending}
              >
                {inviteTeamMember.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Discussion Dialog */}
      <Dialog
        open={showDiscussionDialog}
        onOpenChange={setShowDiscussionDialog}
      >
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
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDiscussionDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateDiscussion}
                disabled={createDiscussion.isPending}
              >
                {createDiscussion.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the team
              and all associated discussions, messages, and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTeam.isPending}
            >
              {deleteTeam.isPending ? "Deleting..." : "Delete Team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
