import type { Express, Request } from "express";
import expressWs from "express-ws";
import { db } from "@workspace/db";
import { userPresenceTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function setupWebSocket(app: Express) {
  expressWs(app);

  const wsClients: Map<number, Set<WebSocket>> = new Map(); // teamId -> Set of clients

  (app as any).ws("/api/ws", (ws: any, req: Request) => {
    const userId = (req.session as any)?.userId;

    if (!userId) {
      ws.close(4001, "Unauthorized");
      return;
    }

    let currentTeamId: number | null = null;

    ws.on("message", async (data: string) => {
      try {
        const message = JSON.parse(data);

        if (message.type === "subscribe") {
          // Subscribe to team
          const teamId = message.teamId;
          if (!teamId || typeof teamId !== "number") {
            ws.send(JSON.stringify({ type: "error", error: "Invalid teamId" }));
            return;
          }

          currentTeamId = teamId;

          // Add client to team's WebSocket group
          if (!wsClients.has(teamId)) {
            wsClients.set(teamId, new Set());
          }
          wsClients.get(teamId)!.add(ws);

          // Update presence
          await db
            .insert(userPresenceTable)
            .values({
              userId,
              teamId,
              isOnline: true,
              lastActivity: new Date(),
              location: "team",
            })
            .onConflictDoUpdate({
              target: [userPresenceTable.userId],
              set: {
                teamId,
                isOnline: true,
                lastActivity: new Date(),
                location: "team",
              },
            });

          // Broadcast presence update to team
          broadcastToTeam(teamId, {
            type: "presence_update",
            userId,
            isOnline: true,
          });

          ws.send(JSON.stringify({ type: "subscribed", teamId }));
        } else if (message.type === "unsubscribe") {
          // Unsubscribe from team
          if (currentTeamId) {
            wsClients.get(currentTeamId)?.delete(ws);

            // Update presence
            await db
              .insert(userPresenceTable)
              .values({
                userId,
                teamId: null,
                isOnline: false,
                lastActivity: new Date(),
              })
              .onConflictDoUpdate({
                target: [userPresenceTable.userId],
                set: {
                  teamId: null,
                  isOnline: false,
                  lastActivity: new Date(),
                },
              });

            broadcastToTeam(currentTeamId, {
              type: "presence_update",
              userId,
              isOnline: false,
            });

            currentTeamId = null;
          }
        } else if (message.type === "ping") {
          // Keep-alive heartbeat
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch (error) {
        console.error("[WebSocket] Error processing message:", error);
      }
    });

    ws.on("close", async () => {
      if (currentTeamId) {
        wsClients.get(currentTeamId)?.delete(ws);

        // Update presence on disconnect
        await db
          .insert(userPresenceTable)
          .values({
            userId,
            teamId: null,
            isOnline: false,
            lastActivity: new Date(),
          })
          .onConflictDoUpdate({
            target: [userPresenceTable.userId],
            set: {
              teamId: null,
              isOnline: false,
              lastActivity: new Date(),
            },
          });

        broadcastToTeam(currentTeamId, {
          type: "presence_update",
          userId,
          isOnline: false,
        });
      }
    });

    ws.on("error", (error: Error) => {
      console.error("[WebSocket] Error:", error);
    });
  });

  function broadcastToTeam(teamId: number, message: any) {
    const clients = wsClients.get(teamId);
    if (clients) {
      const data = JSON.stringify(message);
      clients.forEach((client) => {
        if (client.readyState === 1) {
          // OPEN
          client.send(data);
        }
      });
    }
  }

  // Store broadcast function globally for use in routes
  (global as any).broadcastToTeam = broadcastToTeam;
}

export default setupWebSocket;
