import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@workspace/api-client-react";

export interface DiscussionMessage {
  id: number;
  discussionId: number;
  userId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface Discussion {
  id: number;
  teamId: number;
  ideaId?: number;
  title: string;
  createdAt: string;
}

export function useTeamDiscussions(teamId: number) {
  return useQuery({
    queryKey: ["teams", teamId, "discussions"],
    queryFn: async () => {
      return fetcher<Discussion[]>(`/api/teams/${teamId}/discussions`);
    },
    enabled: !!teamId,
  });
}

export function useDiscussion(discussionId: number) {
  return useQuery({
    queryKey: ["discussions", discussionId],
    queryFn: async () => {
      return fetcher<Discussion>(`/api/discussions/${discussionId}`);
    },
    enabled: !!discussionId,
  });
}

export function useDiscussionMessages(discussionId: number) {
  return useQuery({
    queryKey: ["discussions", discussionId, "messages"],
    queryFn: async () => {
      return fetcher<DiscussionMessage[]>(`/api/discussions/${discussionId}/messages`);
    },
    enabled: !!discussionId,
  });
}

export function useCreateDiscussion(teamId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; ideaId?: number }) => {
      return fetcher<Discussion>(`/api/teams/${teamId}/discussions`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teams", teamId, "discussions"],
      });
    },
  });
}

export function useSendMessage(discussionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      return fetcher<DiscussionMessage>(`/api/discussions/${discussionId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["discussions", discussionId, "messages"],
      });
    },
  });
}
