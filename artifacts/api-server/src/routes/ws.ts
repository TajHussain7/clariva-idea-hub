import type { Express, Request } from "express";
import expressWs from "express-ws";
import { db } from "@workspace/db";
import { userPresenceTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function setupWebSocket(app: Express) {
  expressWs(app);

  const wsClients: Map<number, Set<WebSocket>> = new Map(); // teamId -> Set of clients
  const feedClients: Set<WebSocket> = new Set(); // global feed subscribers
  const challengeClients: Map<number, Set<WebSocket>> = new Map(); // challengeId -> Set of clients

  (app as any).ws("/api/ws", (ws: any, req: Request) => {
    const userId = (req.session as any)?.userId;

    if (!userId) {
      ws.close(4001, "Unauthorized");
      return;
    }

    let currentTeamId: number | null = null;
    let subscribedToFeed = false;
    let currentChallengeId: number | null = null;

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

          broadcastToTeam(teamId, {
            type: "presence_update",
            userId,
            isOnline: true,
          });

          ws.send(JSON.stringify({ type: "subscribed", teamId }));
        } else if (message.type === "unsubscribe") {
          if (currentTeamId) {
            wsClients.get(currentTeamId)?.delete(ws);

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
        } else if (message.type === "subscribe_feed") {
          // Subscribe to the global public feed channel
          feedClients.add(ws);
          subscribedToFeed = true;
          ws.send(JSON.stringify({ type: "subscribed_feed" }));
        } else if (message.type === "unsubscribe_feed") {
          feedClients.delete(ws);
          subscribedToFeed = false;
        } else if (message.type === "subscribe_challenge") {
          const challengeId = message.challengeId;
          if (!challengeId || typeof challengeId !== "number") {
            ws.send(
              JSON.stringify({ type: "error", error: "Invalid challengeId" }),
            );
            return;
          }
          currentChallengeId = challengeId;
          if (!challengeClients.has(challengeId)) {
            challengeClients.set(challengeId, new Set());
          }
          challengeClients.get(challengeId)!.add(ws);
          ws.send(
            JSON.stringify({ type: "subscribed_challenge", challengeId }),
          );
        } else if (message.type === "unsubscribe_challenge") {
          if (currentChallengeId) {
            challengeClients.get(currentChallengeId)?.delete(ws);
            currentChallengeId = null;
          }
        } else if (message.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch (error) {
        console.error("[WebSocket] Error processing message:", error);
      }
    });

    ws.on("close", async () => {
      // Clean up feed / challenge subscriptions
      if (subscribedToFeed) feedClients.delete(ws);
      if (currentChallengeId)
        challengeClients.get(currentChallengeId)?.delete(ws);

      if (currentTeamId) {
        wsClients.get(currentTeamId)?.delete(ws);

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
        if (client.readyState === 1) client.send(data);
      });
    }
  }

  function broadcastToFeed(message: any) {
    const data = JSON.stringify(message);
    feedClients.forEach((client) => {
      if (client.readyState === 1) client.send(data);
    });
  }

  function broadcastToChallenge(challengeId: number, message: any) {
    const clients = challengeClients.get(challengeId);
    if (clients) {
      const data = JSON.stringify(message);
      clients.forEach((client) => {
        if (client.readyState === 1) client.send(data);
      });
    }
  }

  // Register broadcast helpers globally so routes can use them
  (global as any).broadcastToTeam = broadcastToTeam;
  (global as any).broadcastToFeed = broadcastToFeed;
  (global as any).broadcastToChallenge = broadcastToChallenge;
}

export default setupWebSocket;
