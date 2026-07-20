import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  weeklyChallengesTable,
  challengeSubmissionsTable,
  challengeVotesTable,
  userBadgesTable,
  ideasTable,
  usersTable,
} from "@workspace/db";
import { eq, and, sql, gt, lt, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { requireAdmin } from "../middlewares/admin-auth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function now() {
  return new Date();
}

// ─── GET /challenges/active ──────────────────────────────────────────────────
// Returns the currently active challenge (startsAt <= now <= endsAt).
// Includes extension info if challenge was extended.
// Returns 404 when there is no active challenge.
router.get(
  "/challenges/active",
  requireAuth,
  async (req, res): Promise<void> => {
    const n = now();

    const [challenge] = await db
      .select()
      .from(weeklyChallengesTable)
      .where(
        and(
          lt(weeklyChallengesTable.startsAt, n),
          gt(weeklyChallengesTable.endsAt, n),
        ),
      )
      .orderBy(desc(weeklyChallengesTable.startsAt))
      .limit(1);

    if (!challenge) {
      res.status(404).json({ error: "No active challenge" });
      return;
    }

    // Include extension info in response
    const response = {
      ...challenge,
      isExtended: challenge.status === "extended",
      extensionInfo:
        challenge.status === "extended"
          ? {
              originalEndsAt: challenge.originalEndsAt,
              extensionCount: challenge.extensionCount,
            }
          : null,
    };

    res.json(response);
  },
);

// ─── GET /challenges ─────────────────────────────────────────────────────────
// Lists all challenges ordered by most recent start date (admin or any user).
router.get("/challenges", requireAuth, async (_req, res): Promise<void> => {
  const challenges = await db
    .select()
    .from(weeklyChallengesTable)
    .orderBy(desc(weeklyChallengesTable.startsAt));

  res.json(challenges);
});

// ─── POST /challenges ────────────────────────────────────────────────────────
// Create a new challenge. Admin only.
router.post(
  "/challenges",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const { title, description, startsAt, endsAt } = req.body as {
      title?: string;
      description?: string;
      startsAt?: string;
      endsAt?: string;
    };

    if (!title || !description || !startsAt || !endsAt) {
      res
        .status(400)
        .json({ error: "title, description, startsAt, endsAt are required" });
      return;
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res
        .status(400)
        .json({ error: "Invalid date format for startsAt or endsAt" });
      return;
    }

    if (end <= start) {
      res.status(400).json({ error: "endsAt must be after startsAt" });
      return;
    }

    const [challenge] = await db
      .insert(weeklyChallengesTable)
      .values({
        title,
        description,
        startsAt: start,
        endsAt: end,
        createdBy: userId,
      })
      .returning();

    logger.info({ challengeId: challenge.id }, "Challenge created");

    // Notify all connected feed/challenge subscribers
    (global as any).broadcastToFeed?.({ type: "challenge_created", challenge });

    res.status(201).json(challenge);
  },
);

// ─── GET /challenges/:id/submissions ─────────────────────────────────────────
// List all submissions for a challenge with vote counts and submitter name.
// Includes isOwnSubmission flag to identify user's own submission.
router.get(
  "/challenges/:id/submissions",
  requireAuth,
  async (req, res): Promise<void> => {
    const challengeId = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(challengeId)) {
      res.status(400).json({ error: "Invalid challenge ID" });
      return;
    }

    const userId = req.session.userId!;

    // Verify challenge exists
    const [challenge] = await db
      .select()
      .from(weeklyChallengesTable)
      .where(eq(weeklyChallengesTable.id, challengeId));

    if (!challenge) {
      res.status(404).json({ error: "Challenge not found" });
      return;
    }

    // Fetch submissions with idea title and vote counts
    const submissions = await db
      .select({
        id: challengeSubmissionsTable.id,
        challengeId: challengeSubmissionsTable.challengeId,
        ideaId: challengeSubmissionsTable.ideaId,
        userId: challengeSubmissionsTable.userId,
        submittedAt: challengeSubmissionsTable.submittedAt,
        ideaTitle: ideasTable.title,
        ideaDomain: ideasTable.domain,
        submitterName: usersTable.name,
        voteCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM challenge_votes cv
          WHERE cv.submission_id = ${challengeSubmissionsTable.id}
        )`,
        hasVoted: sql<boolean>`EXISTS (
          SELECT 1
          FROM challenge_votes cv
          WHERE cv.submission_id = ${challengeSubmissionsTable.id}
            AND cv.user_id = ${userId}
        )`,
        isOwnSubmission: sql<boolean>`${challengeSubmissionsTable.userId} = ${userId}`,
      })
      .from(challengeSubmissionsTable)
      .innerJoin(
        ideasTable,
        eq(ideasTable.id, challengeSubmissionsTable.ideaId),
      )
      .innerJoin(
        usersTable,
        eq(usersTable.id, challengeSubmissionsTable.userId),
      )
      .where(eq(challengeSubmissionsTable.challengeId, challengeId))
      .orderBy(
        desc(
          sql`(
            SELECT COUNT(*)::int
            FROM challenge_votes cv
            WHERE cv.submission_id = ${challengeSubmissionsTable.id}
          )`,
        ),
      );

    res.json(submissions);
  },
);

// ─── POST /challenges/:id/submit ─────────────────────────────────────────────
// Submit an analyzed idea to a challenge. Only works while challenge is active.
router.post(
  "/challenges/:id/submit",
  requireAuth,
  async (req, res): Promise<void> => {
    const challengeId = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(challengeId)) {
      res.status(400).json({ error: "Invalid challenge ID" });
      return;
    }

    const userId = req.session.userId!;
    const { ideaId } = req.body as { ideaId?: number };

    if (!ideaId || typeof ideaId !== "number") {
      res.status(400).json({ error: "ideaId is required" });
      return;
    }

    // Verify challenge exists and is active
    const [challenge] = await db
      .select()
      .from(weeklyChallengesTable)
      .where(eq(weeklyChallengesTable.id, challengeId));

    if (!challenge) {
      res.status(404).json({ error: "Challenge not found" });
      return;
    }

    const n = now();
    if (n < challenge.startsAt || n > challenge.endsAt) {
      res.status(400).json({ error: "Challenge is not currently active" });
      return;
    }

    // Verify the idea belongs to this user and is analyzed
    const [idea] = await db
      .select()
      .from(ideasTable)
      .where(and(eq(ideasTable.id, ideaId), eq(ideasTable.userId, userId)));

    if (!idea) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }

    if (idea.status !== "analyzed") {
      res.status(400).json({ error: "Only analyzed ideas can be submitted" });
      return;
    }

    try {
      const [submission] = await db
        .insert(challengeSubmissionsTable)
        .values({ challengeId, ideaId, userId })
        .returning();

      logger.info(
        { challengeId, ideaId, submissionId: submission.id },
        "Idea submitted to challenge",
      );

      // Notify challenge subscribers
      (global as any).broadcastToChallenge?.(challengeId, {
        type: "submission_added",
        submission: { ...submission, ideaTitle: idea.title },
      });

      res.status(201).json(submission);
    } catch (err: any) {
      // Unique constraint: already submitted
      if (err?.code === "23505") {
        res.status(409).json({
          error: "This idea has already been submitted to this challenge",
        });
        return;
      }
      throw err;
    }
  },
);

// ─── POST /challenges/:id/submissions/:submissionId/vote ─────────────────────
// Toggle vote on a challenge submission. Returns { voted: boolean, voteCount: number }.
// Prevents users from voting on their own submissions.
router.post(
  "/challenges/:id/submissions/:submissionId/vote",
  requireAuth,
  async (req, res): Promise<void> => {
    const challengeId = parseInt(String(req.params.id ?? ""), 10);
    const submissionId = parseInt(String(req.params.submissionId ?? ""), 10);

    if (isNaN(challengeId) || isNaN(submissionId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const userId = req.session.userId!;

    // Verify submission belongs to this challenge
    const [submission] = await db
      .select()
      .from(challengeSubmissionsTable)
      .where(
        and(
          eq(challengeSubmissionsTable.id, submissionId),
          eq(challengeSubmissionsTable.challengeId, challengeId),
        ),
      );

    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    // Prevent self-voting
    if (submission.userId === userId) {
      res.status(403).json({ error: "You cannot vote on your own submission" });
      return;
    }

    // Verify challenge is still active (votes only during active period)
    const [challenge] = await db
      .select()
      .from(weeklyChallengesTable)
      .where(eq(weeklyChallengesTable.id, challengeId));

    if (!challenge) {
      res.status(404).json({ error: "Challenge not found" });
      return;
    }

    const n = now();
    if (n < challenge.startsAt || n > challenge.endsAt) {
      res
        .status(400)
        .json({ error: "Voting is only allowed during an active challenge" });
      return;
    }

    // Toggle
    const [existing] = await db
      .select()
      .from(challengeVotesTable)
      .where(
        and(
          eq(challengeVotesTable.submissionId, submissionId),
          eq(challengeVotesTable.userId, userId),
        ),
      );

    let voted: boolean;

    if (existing) {
      await db
        .delete(challengeVotesTable)
        .where(eq(challengeVotesTable.id, existing.id));
      voted = false;
    } else {
      await db.insert(challengeVotesTable).values({ submissionId, userId });
      voted = true;
    }

    const [{ voteCount }] = await db
      .select({ voteCount: sql<number>`COUNT(*)::int` })
      .from(challengeVotesTable)
      .where(eq(challengeVotesTable.submissionId, submissionId));

    // Notify challenge subscribers
    (global as any).broadcastToChallenge?.(challengeId, {
      type: "vote_updated",
      submissionId,
      voteCount,
    });

    res.json({ voted, voteCount });
  },
);

// ─── GET /challenges/:id/winner ───────────────────────────────────────────────
// Returns the winning submission (most votes) after the challenge has ended.
// Returns null if no winner calculated yet or no submissions.
// On first call after challenge ends, awards a 'challenge_winner' badge to the
// winner's user if they don't already have one for this challenge.
router.get(
  "/challenges/:id/winner",
  requireAuth,
  async (req, res): Promise<void> => {
    const challengeId = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(challengeId)) {
      res.status(400).json({ error: "Invalid challenge ID" });
      return;
    }

    const [challenge] = await db
      .select()
      .from(weeklyChallengesTable)
      .where(eq(weeklyChallengesTable.id, challengeId));

    if (!challenge) {
      res.status(404).json({ error: "Challenge not found" });
      return;
    }

    if (now() <= challenge.endsAt) {
      res.status(400).json({ error: "Challenge has not ended yet" });
      return;
    }

    // If winner not calculated yet, return null
    if (!challenge.winnerCalculated) {
      res.json({ winner: null, message: "Winner calculation pending" });
      return;
    }

    // Find submission with most votes
    const submissions = await db
      .select({
        id: challengeSubmissionsTable.id,
        ideaId: challengeSubmissionsTable.ideaId,
        userId: challengeSubmissionsTable.userId,
        submittedAt: challengeSubmissionsTable.submittedAt,
        ideaTitle: ideasTable.title,
        submitterName: usersTable.name,
        voteCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM challenge_votes cv
          WHERE cv.submission_id = ${challengeSubmissionsTable.id}
        )`,
      })
      .from(challengeSubmissionsTable)
      .innerJoin(
        ideasTable,
        eq(ideasTable.id, challengeSubmissionsTable.ideaId),
      )
      .innerJoin(
        usersTable,
        eq(usersTable.id, challengeSubmissionsTable.userId),
      )
      .where(eq(challengeSubmissionsTable.challengeId, challengeId))
      .orderBy(
        desc(
          sql`(
            SELECT COUNT(*)::int
            FROM challenge_votes cv
            WHERE cv.submission_id = ${challengeSubmissionsTable.id}
          )`,
        ),
      )
      .limit(1);

    if (submissions.length === 0) {
      res.json({ winner: null, message: "No submissions for this challenge" });
      return;
    }

    const winner = submissions[0];

    // Check if badge already awarded
    const [existingBadge] = await db
      .select()
      .from(userBadgesTable)
      .where(
        and(
          eq(userBadgesTable.userId, winner.userId),
          eq(userBadgesTable.type, "challenge_winner"),
          eq(userBadgesTable.challengeId!, challengeId),
        ),
      );

    let badgeAwarded = false;
    if (!existingBadge) {
      await db.insert(userBadgesTable).values({
        userId: winner.userId,
        type: "challenge_winner",
        challengeId,
      });
      badgeAwarded = true;
      logger.info(
        { challengeId, userId: winner.userId },
        "Challenge winner badge awarded",
      );
    }

    res.json({ winner, badgeAwarded });
  },
);

// ─── POST /admin/challenges/trigger-worker ───────────────────────────────────
// Manually trigger the challenge worker cycle (admin only, for testing/emergency)
router.post(
  "/admin/challenges/trigger-worker",
  requireAuth,
  requireAdmin,
  async (_req, res): Promise<void> => {
    try {
      logger.info("Manual worker trigger requested by admin");

      // Import worker dynamically to avoid circular dependencies
      const { runWorkerCycle, getWorkerStats } = await import(
        "../workers/challenge-worker.js"
      );

      await runWorkerCycle();
      const stats = getWorkerStats();

      logger.info({ stats }, "Manual worker cycle completed");

      res.json({
        success: true,
        message: "Worker cycle triggered successfully",
        stats,
      });
    } catch (error) {
      logger.error({ error }, "Manual worker trigger failed");
      res.status(500).json({
        error: "Worker cycle failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

export default router;
