import { useState } from "react";
import { useTeams, useCreateTeam } from "@/hooks/use-teams";
import {
  useUserInvitations,
  useAcceptInvitation,
  useRejectInvitation,
} from "@/hooks/use-team-members";
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
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function Teams() {
  const { data: teams, isLoading } = useTeams();
  const { data: invitations } = useUserInvitations();
  const createTeam = useCreateTeam();
  const acceptInvitation = useAcceptInvitation();
  const rejectInvitation = useRejectInvitation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast({ title: "Error", description: "Team name is required" });
      return;
    }

    try {
      await createTeam.mutateAsync({
        name: teamName,
        description: teamDescription,
      });
      setShowCreateDialog(false);
      setTeamName("");
      setTeamDescription("");
      toast({ title: "Success", description: "Team created successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create team" });
    }
  };

  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      await acceptInvitation.mutateAsync(invitationId);
      toast({ title: "Success", description: "Invitation accepted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to accept invitation" });
    }
  };

  const handleRejectInvitation = async (invitationId: number) => {
    try {
      await rejectInvitation.mutateAsync(invitationId);
      toast({ title: "Success", description: "Invitation rejected" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject invitation" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-gray-600">Collaborate with your team on ideas</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>Create Team</Button>
      </div>

      {/* Pending Invitations */}
      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              You have {invitations.length} pending team invitation(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div>
                  <p className="font-medium">{invitation.team?.name}</p>
                  <p className="text-sm text-gray-500">{invitation.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleAcceptInvitation(invitation.id)}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectInvitation(invitation.id)}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Teams List */}
      {isLoading ? (
        <div className="text-center py-8">Loading teams...</div>
      ) : teams && teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Card
              key={team.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setLocation(`/team/${team.id}`)}
            >
              <CardHeader>
                <CardTitle className="line-clamp-1">{team.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {team.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-600">
              No teams yet. Create one to get started!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Team Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Team</DialogTitle>
            <DialogDescription>
              Start collaborating with your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Team Name</label>
              <Input
                placeholder="Enter team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Description (optional)
              </label>
              <Input
                placeholder="What's this team about?"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTeam}
                disabled={createTeam.isPending}
              >
                {createTeam.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
