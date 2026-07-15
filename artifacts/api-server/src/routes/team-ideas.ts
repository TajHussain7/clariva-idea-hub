import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  teamIdeaAccessTable,
  ideasTable,
  teamsTable,
  teamMembersTable,
  usersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { requireTeamMember } from "../middlewares/team-auth.js";

const router: IRouter = Router();

// GET /teams/:id/ideas - List ideas shared with team
router.get(
  "/teams/:id/ideas",
  requireAuth,
  requireTeamMember,
  async (req: Request, res: Response): Promise<void> => {
    const teamId = parseInt(String(req.params.id ?? ""), 10);

    try {
      const ideas = await db
        .select({
          id: ideasTable.id,
          title: ideasTable.title,
          description: ideasTable.description,
          domain: ideasTable.domain,
          complexity: ideasTable.complexity,
          status: ideasTable.status,
          createdAt: ideasTable.createdAt,
          updatedAt: ideasTable.updatedAt,
          accessLevel: teamIdeaAccessTable.accessLevel,
          sharedBy: teamIdeaAccessTable.sharedBy,
          user: {
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            avatarUrl: usersTable.avatarUrl,
          },
        })
        .from(teamIdeaAccessTable)
        .innerJoin(ideasTable, eq(teamIdeaAccessTable.ideaId, ideasTable.id))
        .innerJoin(usersTable, eq(ideasTable.userId, usersTable.id))
        .where(eq(teamIdeaAccessTable.teamId, teamId));

      res.json(ideas);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team ideas" });
    }
  },
);

// POST /teams/:id/ideas - Share idea with team
router.post(
  "/teams/:id/ideas",
  requireAuth,
  requireTeamMember,
  async (req: Request, res: Response): Promise<void> => {
    const { ideaId, accessLevel } = req.body;
    const teamId = parseInt(String(req.params.id ?? ""), 10);
    const userId = req.session?.userId;

    if (typeof userId !== "number") {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (!ideaId || typeof ideaId !== "number") {
      res.status(400).json({ error: "Valid idea ID is required" });
      return;
    }

    if (!accessLevel || !["view", "comment"].includes(accessLevel)) {
      res
        .status(400)
        .json({ error: "Access level must be 'view' or 'comment'" });
      return;
    }

    try {
      // Verify idea exists and user owns it or it's shared with them
      const [idea] = await db
        .select()
        .from(ideasTable)
        .where(eq(ideasTable.id, ideaId));

      if (!idea) {
        res.status(404).json({ error: "Idea not found" });
        return;
      }

      // Check if already shared
      const [existing] = await db
        .select()
        .from(teamIdeaAccessTable)
        .where(
          and(
            eq(teamIdeaAccessTable.teamId, teamId),
            eq(teamIdeaAccessTable.ideaId, ideaId),
          ),
        );

      if (existing) {
        res
          .status(400)
          .json({ error: "Idea is already shared with this team" });
        return;
      }

      const [access] = await db
        .insert(teamIdeaAccessTable)
        .values({
          teamId,
          ideaId,
          sharedBy: userId,
          accessLevel,
        })
        .returning();

      res.status(201).json(access);
    } catch (error) {
      res.status(500).json({ error: "Failed to share idea" });
    }
  },
);

// DELETE /teams/:teamId/ideas/:ideaId - Unshare idea
router.delete(
  "/teams/:teamId/ideas/:ideaId",
  requireAuth,
  requireTeamMember,
  async (req: Request, res: Response): Promise<void> => {
    const teamId = parseInt(String(req.params.teamId ?? ""), 10);
    const ideaId = parseInt(String(req.params.ideaId ?? ""), 10);
    const userId = req.session?.userId;

    if (typeof userId !== "number") {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      // Check if user is team owner or shared the idea
      const [member] = await db
        .select()
        .from(teamMembersTable)
        .where(
          and(
            eq(teamMembersTable.teamId, teamId),
            eq(teamMembersTable.userId, userId),
          ),
        );

      const [access] = await db
        .select()
        .from(teamIdeaAccessTable)
        .where(
          and(
            eq(teamIdeaAccessTable.teamId, teamId),
            eq(teamIdeaAccessTable.ideaId, ideaId),
          ),
        );

      if (!access) {
        res.status(404).json({ error: "Idea not shared with this team" });
        return;
      }

      if (member?.role !== "owner" && access.sharedBy !== userId) {
        res.status(403).json({
          error: "Only team owner or the person who shared can unshare",
        });
        return;
      }

      await db
        .delete(teamIdeaAccessTable)
        .where(
          and(
            eq(teamIdeaAccessTable.teamId, teamId),
            eq(teamIdeaAccessTable.ideaId, ideaId),
          ),
        );

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to unshare idea" });
    }
  },
);

export default router;
