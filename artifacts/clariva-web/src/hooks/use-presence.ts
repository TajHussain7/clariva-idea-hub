import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@workspace/api-client-react";
import { useEffect, useRef } from "react";

export interface UserPresence {
  userId: number;
  isOnline: boolean;
  lastActivity: string;
  location: "dashboard" | "team" | "idea" | "discussion";
  user: {
    id: number;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export function useTeamPresence(teamId: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handlePresenceUpdate = (event: CustomEvent) => {
      const { teamId: updatedTeamId } = event.detail || {};
      if (updatedTeamId === teamId) {
        queryClient.invalidateQueries({
          queryKey: ["teams", teamId, "presence"],
        });
      }
    };

    window.addEventListener(
      "presence-update",
      handlePresenceUpdate as EventListener,
    );

    return () => {
      window.removeEventListener(
        "presence-update",
        handlePresenceUpdate as EventListener,
      );
    };
  }, [teamId, queryClient]);

  return useQuery<UserPresence[], unknown>({
    queryKey: ["teams", teamId, "presence"],
    queryFn: async () => {
      try {
        return await fetcher<UserPresence[]>(`/api/teams/${teamId}/presence`);
      } catch (err) {
        console.warn("[Presence] Failed to fetch team presence:", err);
        return [] as UserPresence[];
      }
    },
    enabled: !!teamId,
    refetchInterval: 10000, // Refetch every 10 seconds to ensure fresh data
    staleTime: 5000, // Consider data stale after 5 seconds
    retry: false, // Don't retry if presence fails - it's not critical
  });
}

export function useUpdatePresence() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    unknown,
    {
      teamId?: number;
      isOnline: boolean;
      location?: "dashboard" | "team" | "idea" | "discussion";
    }
  >({
    mutationFn: async (data) =>
      fetcher<any>("/api/presence", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      if (variables.teamId) {
        queryClient.invalidateQueries({
          queryKey: ["teams", variables.teamId, "presence"],
        });
      }
    },
    onError: (error: unknown) => {
      // Silently fail - presence is not critical
      console.warn("[Presence] Failed to update presence:", error);
    },
    retry: false, // Don't retry failed presence updates
  });
}

export function useWebSocket(teamId: number | null, enabled = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const queryClient = useQueryClient();

  useEffect(() => {
    // Disable WebSocket on Vercel or if not enabled
    if (
      !enabled ||
      !teamId ||
      window.location.hostname.includes("vercel.app")
    ) {
      return;
    }

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/api/ws`;

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log("[WebSocket] Connected");
          reconnectAttempts.current = 0;

          // Subscribe to team
          if (wsRef.current && teamId) {
            wsRef.current.send(JSON.stringify({ type: "subscribe", teamId }));
            console.log("[WebSocket] Subscribed to team:", teamId);
          }

          // Send heartbeat every 30 seconds
          const heartbeatInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: "ping" }));
            } else {
              clearInterval(heartbeatInterval);
            }
          }, 30000);
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log("[WebSocket] Message received:", message);

            if (message.type === "presence_update") {
              // Invalidate presence query to refetch
              queryClient.invalidateQueries({
                queryKey: ["teams", teamId, "presence"],
              });

              // Also dispatch custom event for other listeners
              window.dispatchEvent(
                new CustomEvent("presence-update", { detail: message }),
              );
            } else if (message.type === "subscribed") {
              console.log(
                "[WebSocket] Subscription confirmed for team:",
                message.teamId,
              );
            }
          } catch (error) {
            console.error("[WebSocket] Error parsing message:", error);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error("[WebSocket] Error:", error);
        };

        wsRef.current.onclose = () => {
          console.log("[WebSocket] Connection closed");
          wsRef.current = null;

          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttempts.current),
              30000,
            );
            console.log(
              `[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`,
            );
            setTimeout(connectWebSocket, delay);
          } else {
            console.error("[WebSocket] Max reconnection attempts reached");
          }
        };
      } catch (error) {
        console.error("[WebSocket] Connection error:", error);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "unsubscribe" }));
        wsRef.current.close();
        console.log("[WebSocket] Disconnected and unsubscribed");
      }
    };
  }, [teamId, enabled, queryClient]);

  return wsRef;
}
