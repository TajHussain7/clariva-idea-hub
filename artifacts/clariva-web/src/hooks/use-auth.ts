import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@workspace/api-client-react";

export interface CurrentUser {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string;
  notifications?: boolean;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      return fetcher<CurrentUser>("/api/auth/me");
    },
    retry: false,
  });
}
