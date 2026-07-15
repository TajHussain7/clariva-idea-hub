import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@workspace/api-client-react";

export interface Team {
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      return fetcher<Team[]>("/api/teams");
    },
  });
}

export function useTeamDetail(teamId: number) {
  return useQuery({
    queryKey: ["teams", teamId],
    queryFn: async () => {
      return fetcher<Team>(`/api/teams/${teamId}`);
    },
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return fetcher("/api/teams", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useUpdateTeam(teamId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name?: string; description?: string }) => {
      return fetcher(`/api/teams/${teamId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: number) => {
      return fetcher<void>(`/api/teams/${teamId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}
