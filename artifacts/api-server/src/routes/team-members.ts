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
import { sendInvitationEmail } from "../lib/email.js";
import { createNotification } from "../lib/notify.js";

function resolveFrontendUrl(): string {
  const configuredUrl =
    process.env.FRONTEND_URL?.trim() ??
    process.env.CORS_ORIGIN?.split(",")[0]?.trim();

  if (process.env.NODE_ENV === "production") {
    if (!configuredUrl) {
      throw new Error(
        "FRONTEND_URL or CORS_ORIGIN must be configured in production",
      );
    }
    return configuredUrl;
  }

  return configuredUrl ?? "http://localhost:5173";
}

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
      // ── 1. Check if invited user already exists in the system ──────────────
      const [existingUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email.toLowerCase()));

      if (existingUser) {
        // Already a member? Reject early.
        const [existingMember] = await db
          .select()
          .from(teamMembersTable)
          .where(
            and(
              eq(teamMembersTable.teamId, teamId),
              eq(teamMembersTable.userId, existingUser.id),
            ),
          );

        if (existingMember) {
          res
            .status(400)
            .json({ error: "User is already a member of this team" });
          return;
        }
      }

      // ── 2. Fetch team and inviter details for the email ────────────────────
      const [team] = await db
        .select()
        .from(teamsTable)
        .where(eq(teamsTable.id, teamId));

      if (!team) {
        res.status(404).json({ error: "Team not found" });
        return;
      }

      const [inviter] = await db
        .select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      // ── 3. Upsert invitation (safe select-then-insert/update) ──────────────
      // NOTE: We deliberately avoid .onConflictDoUpdate() here because it
      // requires a unique index on (team_id, email) in the database that is
      // not present in the current schema migration. The select-then-upsert
      // pattern achieves the same idempotent behaviour without schema changes.
      const [existingInvitation] = await db
        .select()
        .from(teamInvitationsTable)
        .where(
          and(
            eq(teamInvitationsTable.teamId, teamId),
            eq(teamInvitationsTable.email, email.toLowerCase()),
          ),
        );

      let invitation;
      if (existingInvitation) {
        // Re-send: bump status back to pending so the user can act on it again.
        const [updated] = await db
          .update(teamInvitationsTable)
          .set({ status: "pending", invitedBy: userId })
          .where(eq(teamInvitationsTable.id, existingInvitation.id))
          .returning();
        invitation = updated;
      } else {
        const [inserted] = await db
          .insert(teamInvitationsTable)
          .values({
            teamId,
            email: email.toLowerCase(),
            status: "pending",
            invitedBy: userId,
          })
          .returning();
        invitation = inserted;
      }

      // ── 4. Send invitation email ───────────────────────────────────────────
      const frontendUrl = resolveFrontendUrl();
      const isNewUser = !existingUser;
      // New users land on /auth?tab=register so the Create Account tab is pre-selected.
      // Existing users land on /auth so they can log in and then see the invitation.
      const inviteLink = isNewUser
        ? `${frontendUrl}/auth?tab=register`
        : `${frontendUrl}/auth`;

      // Fire-and-forget — a send failure must never block the API response.
      sendInvitationEmail({
        toEmail: email.toLowerCase(),
        inviterName: inviter?.name ?? "A team member",
        teamName: team.name,
        inviteLink,
        isNewUser,
      }).catch((err) => {
        // Log but do not propagate — invitation record already created.
        console.error("[email] Failed to send invitation email:", err);
      });

      // In-app notification for already-registered users only
      if (existingUser) {
        createNotification({
          userId: existingUser.id,
          type: "team_invite",
          title: `${inviter?.name ?? "Someone"} invited you to join a team`,
          body: `You've been invited to join "${team.name}". Visit the Teams page to accept.`,
          targetPath: "/teams",
          entityType: "team",
          entityId: teamId,
        });
      }

      res.status(201).json(invitation);
    } catch (error) {
      console.error("[invite] Unexpected error:", error);
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

      // Notify the inviter that their invitee has joined
      if (invitation.invitedBy) {
        const [team] = await db
          .select({ name: teamsTable.name })
          .from(teamsTable)
          .where(eq(teamsTable.id, invitation.teamId));
        createNotification({
          userId: invitation.invitedBy,
          type: "team_joined",
          title: `${user.name} joined your team`,
          body: `${user.name} has accepted your invitation and joined "${team?.name ?? "the team"}".`,
          targetPath: `/team/${invitation.teamId}`,
          entityType: "team",
          entityId: invitation.teamId,
        });
      }

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
