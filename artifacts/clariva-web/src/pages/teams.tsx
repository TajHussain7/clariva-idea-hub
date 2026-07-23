import { useState } from "react";
import { useTeams, useCreateTeam } from "@/hooks/use-teams";
import {
  useUserInvitations,
  useAcceptInvitation,
  useRejectInvitation,
} from "@/hooks/use-team-members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Users,
  Plus,
  Mail,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";

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
      toast({ title: "Team name required", description: "Please enter a name for your team." });
      return;
    }
    try {
      await createTeam.mutateAsync({ name: teamName, description: teamDescription });
      setShowCreateDialog(false);
      setTeamName("");
      setTeamDescription("");
      toast({ title: "Team created", description: `"${teamName}" is ready to use.` });
    } catch {
      toast({ title: "Could not create team", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      await acceptInvitation.mutateAsync(invitationId);
      toast({ title: "Invitation accepted" });
    } catch {
      toast({ title: "Failed to accept invitation", variant: "destructive" });
    }
  };

  const handleRejectInvitation = async (invitationId: number) => {
    try {
      await rejectInvitation.mutateAsync(invitationId);
      toast({ title: "Invitation declined" });
    } catch {
      toast({ title: "Failed to decline invitation", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* ---- Page Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Teams
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Collaborate with your team on ideas
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Create Team
        </Button>
      </div>

      {/* ---- Pending Invitations ---- */}
      {invitations && invitations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Pending Invitations
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {invitations.length}
            </span>
          </div>
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5"
            >
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm">
                  {invitation.team?.name ?? "Unknown Team"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {invitation.email}
                </p>
              </div>
              <div className="flex gap-2 shrink-0 self-start sm:self-auto">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleAcceptInvitation(invitation.id)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => handleRejectInvitation(invitation.id)}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Teams List ---- */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      ) : teams && teams.length > 0 ? (
        <>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Your Teams</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
              {teams.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setLocation(`/team/${team.id}`)}
                className="group text-left p-5 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 mt-1 shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                  {team.name}
                </p>
                {team.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {team.description}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/50 mt-1 italic">No description</p>
                )}
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-20 rounded-xl border border-dashed border-border">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <Users className="w-7 h-7 text-muted-foreground/30" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">No teams yet</p>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first team and start collaborating
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Team
          </Button>
        </div>
      )}

      {/* ---- Create Team Dialog ---- */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Team</DialogTitle>
            <DialogDescription>
              Start collaborating with your team on ideas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Team Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Product Team, Marketing Squad…"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !createTeam.isPending && handleCreateTeam()
                }
                disabled={createTeam.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="What's this team working on?"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                disabled={createTeam.isPending}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setTeamName("");
                  setTeamDescription("");
                }}
                disabled={createTeam.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTeam}
                disabled={createTeam.isPending || !teamName.trim()}
                className="gap-2"
              >
                {createTeam.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {createTeam.isPending ? "Creating…" : "Create Team"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
