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
  return useQuery({
    queryKey: ["teams", teamId, "presence"],
    queryFn: async () => {
      return fetcher<UserPresence[]>(`/api/teams/${teamId}/presence`);
    },
    enabled: !!teamId,
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}

export function useUpdatePresence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      teamId?: number;
      isOnline: boolean;
      location?: "dashboard" | "team" | "idea" | "discussion";
    }) => {
      return fetcher<any>("/api/presence", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, variables) => {
      if (variables.teamId) {
        queryClient.invalidateQueries({
          queryKey: ["teams", variables.teamId, "presence"],
        });
      }
    },
  });
}

export function useWebSocket(teamId: number | null, enabled = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!enabled || !teamId) return;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/api/ws`;

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          reconnectAttempts.current = 0;
          // Subscribe to team
          wsRef.current?.send(JSON.stringify({ type: "subscribe", teamId }));

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
            if (message.type === "presence_update") {
              // Invalidate presence query to refetch
              window.dispatchEvent(
                new CustomEvent("presence-update", { detail: message }),
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
          wsRef.current = null;

          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttempts.current),
              30000,
            );
            setTimeout(connectWebSocket, delay);
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
      }
    };
  }, [teamId, enabled]);

  return wsRef;
}
