import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { teamsTable, teamMembersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import {
  requireTeamMember,
  requireTeamOwner,
} from "../middlewares/team-auth.js";

const router: IRouter = Router();

// POST /teams - Create a new team
router.post(
  "/teams",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { name, description } = req.body;
    const userId = req.session!.userId as number;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Team name is required" });
      return;
    }

    try {
      const [team] = await db
        .insert(teamsTable)
        .values({
          name: name.trim(),
          description: description?.trim() || null,
          ownerId: userId,
        })
        .returning();

      // Add creator as owner
      await db.insert(teamMembersTable).values({
        teamId: team.id,
        userId: userId,
        role: "owner",
      });

      res.status(201).json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to create team" });
    }
  },
);

// GET /teams - List user's teams
router.get(
  "/teams",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.session!.userId as number;

    try {
      const teams = await db
        .select({
          id: teamsTable.id,
          name: teamsTable.name,
          description: teamsTable.description,
          ownerId: teamsTable.ownerId,
          createdAt: teamsTable.createdAt,
          updatedAt: teamsTable.updatedAt,
        })
        .from(teamsTable)
        .innerJoin(teamMembersTable, eq(teamMembersTable.teamId, teamsTable.id))
        .where(eq(teamMembersTable.userId, userId));

      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  },
);

// GET /teams/:id - Get team details
router.get(
  "/teams/:id",
  requireAuth,
  requireTeamMember,
  async (req: Request, res: Response): Promise<void> => {
    const teamId = parseInt(req.params.id as string, 10);

    try {
      const [team] = await db
        .select()
        .from(teamsTable)
        .where(eq(teamsTable.id, teamId));

      if (!team) {
        res.status(404).json({ error: "Team not found" });
        return;
      }

      const memberCount = await db
        .select()
        .from(teamMembersTable)
        .where(eq(teamMembersTable.teamId, teamId));

      res.json({ ...team, memberCount: memberCount.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team" });
    }
  },
);

// PUT /teams/:id - Update team
router.put(
  "/teams/:id",
  requireAuth,
  requireTeamOwner,
  async (req: Request, res: Response): Promise<void> => {
    const teamId = parseInt(req.params.id as string, 10);
    const { name, description } = req.body;

    if (name && (typeof name !== "string" || name.trim().length === 0)) {
      res.status(400).json({ error: "Team name must be a non-empty string" });
      return;
    }

    try {
      const [team] = await db
        .update(teamsTable)
        .set({
          name: name?.trim() || undefined,
          description: description?.trim() || undefined,
          updatedAt: new Date(),
        })
        .where(eq(teamsTable.id, teamId))
        .returning();

      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to update team" });
    }
  },
);

// DELETE /teams/:id - Delete team
router.delete(
  "/teams/:id",
  requireAuth,
  requireTeamOwner,
  async (req: Request, res: Response): Promise<void> => {
    const teamId = parseInt(req.params.id as string, 10);

    try {
      await db.delete(teamsTable).where(eq(teamsTable.id, teamId));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete team" });
    }
  },
);

// GET /teams/:id/members - List team members
router.get(
  "/teams/:id/members",
  requireAuth,
  requireTeamMember,
  async (req: Request, res: Response): Promise<void> => {
    const teamId = parseInt(req.params.id as string, 10);

    try {
      const members = await db
        .select({
          id: teamMembersTable.id,
          userId: teamMembersTable.userId,
          teamId: teamMembersTable.teamId,
          role: teamMembersTable.role,
          joinedAt: teamMembersTable.joinedAt,
          user: {
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            avatarUrl: usersTable.avatarUrl,
          },
        })
        .from(teamMembersTable)
        .leftJoin(usersTable, eq(teamMembersTable.userId, usersTable.id))
        .where(eq(teamMembersTable.teamId, teamId));

      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  },
);

// DELETE /teams/:id/members/:userId - Remove team member
router.delete(
  "/teams/:id/members/:userId",
  requireAuth,
  requireTeamOwner,
  async (req: Request, res: Response): Promise<void> => {
    const teamId = parseInt(req.params.id as string, 10);
    const userId = parseInt(req.params.userId as string, 10);

    if (userId === req.session!.userId) {
      res.status(400).json({ error: "Cannot remove yourself from team" });
      return;
    }

    try {
      await db
        .delete(teamMembersTable)
        .where(
          and(
            eq(teamMembersTable.teamId, teamId),
            eq(teamMembersTable.userId, userId),
          ),
        );

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove member" });
    }
  },
);

export default router;
