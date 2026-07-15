import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  teamInvitationsTable,
  teamMembersTable,
  usersTable,
  teamsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import {
  requireTeamMember,
  requireTeamOwner,
} from "../middlewares/team-auth.js";

const router: IRouter = Router();

// POST /teams/:id/members/invite - Invite user by email
router.post(
  "/teams/:id/members/invite",
  requireAuth,
  requireTeamOwner,
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    const teamId = parseInt(String(req.params.id ?? ""), 10);
    const userId = req.session?.userId;

    if (typeof userId !== "number") {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Valid email is required" });
      return;
    }

    try {
      // Check if user already exists in team
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email.toLowerCase()));

      if (user) {
        const [existingMember] = await db
          .select()
          .from(teamMembersTable)
          .where(
            and(
              eq(teamMembersTable.teamId, teamId),
              eq(teamMembersTable.userId, user.id),
            ),
          );

        if (existingMember) {
          res
            .status(400)
            .json({ error: "User is already a member of this team" });
          return;
        }
      }

      // Create or update invitation
      const [invitation] = await db
        .insert(teamInvitationsTable)
        .values({
          teamId,
          email: email.toLowerCase(),
          status: "pending",
          invitedBy: userId,
        })
        .onConflictDoUpdate({
          target: [teamInvitationsTable.teamId, teamInvitationsTable.email],
          set: { status: "pending" },
        })
        .returning();

      // TODO: Send invitation email
      res.status(201).json(invitation);
    } catch (error) {
      res.status(500).json({ error: "Failed to send invitation" });
    }
  },
);

// GET /teams/:id/invitations - List pending invitations
router.get(
  "/teams/:id/invitations",
  requireAuth,
  requireTeamMember,
  async (req: Request, res: Response): Promise<void> => {
    const teamId = parseInt(String(req.params.id ?? ""), 10);

    try {
      const invitations = await db
        .select()
        .from(teamInvitationsTable)
        .where(
          and(
            eq(teamInvitationsTable.teamId, teamId),
            eq(teamInvitationsTable.status, "pending"),
          ),
        );

      res.json(invitations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  },
);

// GET /user/invitations - List invitations for current user
router.get(
  "/user/invitations",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.session?.userId;

    if (typeof userId !== "number") {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const invitations = await db
        .select({
          id: teamInvitationsTable.id,
          teamId: teamInvitationsTable.teamId,
          email: teamInvitationsTable.email,
          status: teamInvitationsTable.status,
          createdAt: teamInvitationsTable.createdAt,
          team: {
            id: teamsTable.id,
            name: teamsTable.name,
            description: teamsTable.description,
          },
        })
        .from(teamInvitationsTable)
        .innerJoin(teamsTable, eq(teamInvitationsTable.teamId, teamsTable.id))
        .where(
          and(
            eq(teamInvitationsTable.email, user.email),
            eq(teamInvitationsTable.status, "pending"),
          ),
        );

      res.json(invitations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  },
);

// POST /invitations/:id/accept - Accept invitation
router.post(
  "/invitations/:id/accept",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const invitationId = parseInt(String(req.params.id ?? ""), 10);
    const userId = req.session?.userId;

    if (typeof userId !== "number") {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const [invitation] = await db
        .select()
        .from(teamInvitationsTable)
        .where(eq(teamInvitationsTable.id, invitationId));

      if (!invitation) {
        res.status(404).json({ error: "Invitation not found" });
        return;
      }

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      if (!user || user.email !== invitation.email) {
        res.status(403).json({ error: "This invitation is not for you" });
        return;
      }

      if (invitation.status !== "pending") {
        res.status(400).json({ error: "Invitation already processed" });
        return;
      }

      // Check if already a member
      const [existingMember] = await db
        .select()
        .from(teamMembersTable)
        .where(
          and(
            eq(teamMembersTable.teamId, invitation.teamId),
            eq(teamMembersTable.userId, userId),
          ),
        );

      if (existingMember) {
        res.status(400).json({ error: "Already a team member" });
        return;
      }

      // Add user to team and update invitation
      await db.insert(teamMembersTable).values({
        teamId: invitation.teamId,
        userId: userId,
        role: "member",
      });

      const [updatedInvitation] = await db
        .update(teamInvitationsTable)
        .set({
          status: "accepted",
          acceptedBy: userId,
          acceptedAt: new Date(),
        })
        .where(eq(teamInvitationsTable.id, invitationId))
        .returning();

      res.json(updatedInvitation);
    } catch (error) {
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  },
);

// POST /invitations/:id/reject - Reject invitation
router.post(
  "/invitations/:id/reject",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const invitationId = parseInt(String(req.params.id ?? ""), 10);
    const userId = req.session?.userId;

    if (typeof userId !== "number") {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const [invitation] = await db
        .select()
        .from(teamInvitationsTable)
        .where(eq(teamInvitationsTable.id, invitationId));

      if (!invitation) {
        res.status(404).json({ error: "Invitation not found" });
        return;
      }

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      if (!user || user.email !== invitation.email) {
        res.status(403).json({ error: "This invitation is not for you" });
        return;
      }

      const [updatedInvitation] = await db
        .update(teamInvitationsTable)
        .set({ status: "rejected" })
        .where(eq(teamInvitationsTable.id, invitationId))
        .returning();

      res.json(updatedInvitation);
    } catch (error) {
      res.status(500).json({ error: "Failed to reject invitation" });
    }
  },
);

export default router;
