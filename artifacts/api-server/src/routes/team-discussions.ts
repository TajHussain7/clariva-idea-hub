import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  teamDiscussionsTable,
  discussionMessagesTable,
  usersTable,
  teamMembersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { requireTeamMember } from "../middlewares/team-auth.js";
import { createNotification } from "../lib/notify.js";

const router: IRouter = Router();

// POST /teams/:id/discussions - Create discussion
router.post(
  "/teams/:id/discussions",
  requireAuth,
  requireTeamMember,
  async (req: Request, res: Response): Promise<void> => {
    const { title, ideaId } = req.body;
    const teamId = parseInt(String(req.params.id ?? ""), 10);

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      res.status(400).json({ error: "Discussion title is required" });
      return;
    }

    try {
      const [discussion] = await db
        .insert(teamDiscussionsTable)
        .values({
          teamId,
          ideaId: ideaId || null,
          title: title.trim(),
        })
        .returning();

      res.status(201).json(discussion);
    } catch (error) {
      res.status(500).json({ error: "Failed to create discussion" });
    }
  },
);

// GET /teams/:id/discussions - List discussions
router.get(
  "/teams/:id/discussions",
  requireAuth,
  requireTeamMember,
  async (req: Request, res: Response): Promise<void> => {
    const teamId = parseInt(String(req.params.id ?? ""), 10);

    try {
      const discussions = await db
        .select()
        .from(teamDiscussionsTable)
        .where(eq(teamDiscussionsTable.teamId, teamId));

      res.json(discussions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch discussions" });
    }
  },
);

// GET /discussions/:id - Get single discussion
router.get(
  "/discussions/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const discussionId = parseInt(String(req.params.id ?? ""), 10);
    const userId = req.session?.userId;

    if (typeof userId !== "number") {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const [discussion] = await db
        .select()
        .from(teamDiscussionsTable)
        .where(eq(teamDiscussionsTable.id, discussionId));

      if (!discussion) {
        res.status(404).json({ error: "Discussion not found" });
        return;
      }

      // Verify user is member of team that has this discussion
      const [member] = await db
        .select()
        .from(teamMembersTable)
        .where(
          and(
            eq(teamMembersTable.teamId, discussion.teamId),
            eq(teamMembersTable.userId, userId),
          ),
        );

      if (!member) {
        res.status(403).json({ error: "Not a member of this team" });
        return;
      }

      res.json(discussion);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch discussion" });
    }
  },
);

// GET /discussions/:id/messages - Get messages in discussion
router.get(
  "/discussions/:id/messages",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const discussionId = parseInt(String(req.params.id ?? ""), 10);
    const userId = req.session?.userId;

    if (typeof userId !== "number") {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      // Verify user is member of team that has this discussion
      const [discussion] = await db
        .select()
        .from(teamDiscussionsTable)
        .where(eq(teamDiscussionsTable.id, discussionId));

      if (!discussion) {
        res.status(404).json({ error: "Discussion not found" });
        return;
      }

      const [member] = await db
        .select()
        .from(teamMembersTable)
        .where(
          and(
            eq(teamMembersTable.teamId, discussion.teamId),
            eq(teamMembersTable.userId, userId),
          ),
        );

      if (!member) {
        res.status(403).json({ error: "Not a member of this team" });
        return;
      }

      const messages = await db
        .select({
          id: discussionMessagesTable.id,
          discussionId: discussionMessagesTable.discussionId,
          userId: discussionMessagesTable.userId,
          content: discussionMessagesTable.content,
          createdAt: discussionMessagesTable.createdAt,
          updatedAt: discussionMessagesTable.updatedAt,
          user: {
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            avatarUrl: usersTable.avatarUrl,
          },
        })
        .from(discussionMessagesTable)
        .leftJoin(usersTable, eq(discussionMessagesTable.userId, usersTable.id))
        .where(eq(discussionMessagesTable.discussionId, discussionId));

      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  },
);

// POST /discussions/:id/messages - Send message
router.post(
  "/discussions/:id/messages",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { content } = req.body;
    const discussionId = parseInt(String(req.params.id ?? ""), 10);
    const userId = req.session?.userId;

    if (typeof userId !== "number") {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      res.status(400).json({ error: "Message content is required" });
      return;
    }

    try {
      // Verify discussion exists and user is team member
      const [discussion] = await db
        .select()
        .from(teamDiscussionsTable)
        .where(eq(teamDiscussionsTable.id, discussionId));

      if (!discussion) {
        res.status(404).json({ error: "Discussion not found" });
        return;
      }

      const [member] = await db
        .select()
        .from(teamMembersTable)
        .where(
          and(
            eq(teamMembersTable.teamId, discussion.teamId),
            eq(teamMembersTable.userId, userId),
          ),
        );

      if (!member) {
        res.status(403).json({ error: "Not a member of this team" });
        return;
      }

      const [message] = await db
        .insert(discussionMessagesTable)
        .values({
          discussionId,
          userId,
          content: content.trim(),
        })
        .returning();

      // Fetch message with user details
      const [fullMessage] = await db
        .select({
          id: discussionMessagesTable.id,
          discussionId: discussionMessagesTable.discussionId,
          userId: discussionMessagesTable.userId,
          content: discussionMessagesTable.content,
          createdAt: discussionMessagesTable.createdAt,
          updatedAt: discussionMessagesTable.updatedAt,
          user: {
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            avatarUrl: usersTable.avatarUrl,
          },
        })
        .from(discussionMessagesTable)
        .leftJoin(usersTable, eq(discussionMessagesTable.userId, usersTable.id))
        .where(eq(discussionMessagesTable.id, message.id));

      // Emit WebSocket event for real-time update
      if ((global as any).wss) {
        const wsMessage = {
          type: "message",
          discussionId,
          message: fullMessage,
        };
        (global as any).wss.clients?.forEach((client: any) => {
          if (client.readyState === 1 && client.teamId === discussion.teamId) {
            client.send(JSON.stringify(wsMessage));
          }
        });
      }

      // Notify all other team members about the new message
      const otherMembers = await db
        .select({ userId: teamMembersTable.userId })
        .from(teamMembersTable)
        .where(
          and(
            eq(teamMembersTable.teamId, discussion.teamId),
            // exclude sender — we have to do this client-side since drizzle
            // doesn't support ne() without importing it; use a simple filter
          ),
        );

      const senderName = fullMessage.user?.name ?? "Someone";
      const snippet =
        content.trim().slice(0, 80) + (content.trim().length > 80 ? "…" : "");

      for (const m of otherMembers) {
        if (m.userId === userId) continue; // skip sender
        createNotification({
          userId: m.userId,
          type: "discussion_message",
          title: `${senderName} posted in a team discussion`,
          body: `"${discussion.title}" — "${snippet}"`,
          targetPath: `/team/${discussion.teamId}`,
          entityType: "discussion",
          entityId: discussionId,
        });
      }

      res.status(201).json(fullMessage);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  },
);

export default router;
