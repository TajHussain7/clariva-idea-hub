import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@workspace/api-client-react";

export interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface TeamMember {
  id: number;
  userId: number;
  teamId: number;
  role: "owner" | "member";
  joinedAt: string;
  user: User;
}

export interface TeamInvitation {
  id: number;
  teamId: number;
  email: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  acceptedAt?: string;
  team?: {
    id: number;
    name: string;
    description?: string;
  };
}

export function useTeamMembers(teamId: number) {
  return useQuery({
    queryKey: ["teams", teamId, "members"],
    queryFn: async () => {
      return fetcher<TeamMember[]>(`/api/teams/${teamId}/members`);
    },
    enabled: !!teamId,
  });
}

export function useTeamInvitations(teamId: number) {
  return useQuery({
    queryKey: ["teams", teamId, "invitations"],
    queryFn: async () => {
      return fetcher<TeamInvitation[]>(`/api/teams/${teamId}/invitations`);
    },
    enabled: !!teamId,
  });
}

export function useUserInvitations() {
  return useQuery({
    queryKey: ["user", "invitations"],
    queryFn: async () => {
      return fetcher<TeamInvitation[]>("/api/user/invitations");
    },
  });
}

export function useInviteTeamMember(teamId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      return fetcher<TeamInvitation>(`/api/teams/${teamId}/members/invite`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teams", teamId, "invitations"],
      });
    },
  });
}

export function useRemoveTeamMember(teamId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number) => {
      return fetcher<void>(`/api/teams/${teamId}/members/${userId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", teamId, "members"] });
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: number) => {
      return fetcher<TeamInvitation>(`/api/invitations/${invitationId}/accept`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "invitations"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useRejectInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: number) => {
      return fetcher<TeamInvitation>(`/api/invitations/${invitationId}/reject`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "invitations"] });
    },
  });
}
