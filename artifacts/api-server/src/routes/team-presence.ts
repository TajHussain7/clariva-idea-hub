import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { userPresenceTable, usersTable, teamMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { requireTeamMember } from "../middlewares/team-auth.js";

const router: IRouter = Router();

// POST /presence - Update user presence
router.post(
  "/presence",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { teamId, isOnline, location } = req.body;
    const userId = req.session?.userId;

    if (typeof userId !== "number") {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (typeof isOnline !== "boolean") {
      res.status(400).json({ error: "isOnline is required" });
      return;
    }

    if (
      location &&
      !["dashboard", "team", "idea", "discussion"].includes(location)
    ) {
      res.status(400).json({ error: "Invalid location" });
      return;
    }

    try {
      const [presence] = await db
        .insert(userPresenceTable)
        .values({
          userId,
          teamId: teamId || null,
          isOnline,
          lastActivity: new Date(),
          location: location || "dashboard",
        })
        .onConflictDoUpdate({
          target: [userPresenceTable.userId],
          set: {
            isOnline,
            lastActivity: new Date(),
            teamId: teamId || null,
            location: location || "dashboard",
          },
        })
        .returning();

      // Broadcast presence update via WebSocket
      if ((global as any).wss && teamId) {
        const wsMessage = {
          type: "presence_update",
          teamId,
          userId,
          isOnline,
          location,
        };
        (global as any).wss.clients?.forEach((client: any) => {
          if (client.readyState === 1 && client.teamId === teamId) {
            client.send(JSON.stringify(wsMessage));
          }
        });
      }

      res.json(presence);
    } catch (error) {
      res.status(500).json({ error: "Failed to update presence" });
    }
  },
);

// GET /teams/:id/presence - Get online users in team
router.get(
  "/teams/:id/presence",
  requireAuth,
  requireTeamMember,
  async (req: Request, res: Response): Promise<void> => {
    const teamId = parseInt(String(req.params.id ?? ""), 10);

    try {
      const presence = await db
        .select({
          userId: userPresenceTable.userId,
          isOnline: userPresenceTable.isOnline,
          lastActivity: userPresenceTable.lastActivity,
          location: userPresenceTable.location,
          user: {
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            avatarUrl: usersTable.avatarUrl,
          },
        })
        .from(userPresenceTable)
        .innerJoin(
          teamMembersTable,
          and(
            eq(userPresenceTable.userId, teamMembersTable.userId),
            eq(teamMembersTable.teamId, teamId),
          ),
        )
        .leftJoin(usersTable, eq(userPresenceTable.userId, usersTable.id));

      res.json(presence);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch presence" });
    }
  },
);

export default router;
