import { db } from "@workspace/db";
import {
  weeklyChallengesTable,
  challengeSubmissionsTable,
} from "@workspace/db/schema";
import { eq, and, lt, gte, sql } from "drizzle-orm";
import { logger } from "./logger.js";

export type ChallengeState =
  | "needs_new" // No active challenge exists
  | "active" // Challenge is running normally
  | "needs_extension" // Challenge has no submissions and is close to expiring
  | "needs_winner_calculation"; // Challenge has expired and needs winner

export interface ChallengeStateResult {
  state: ChallengeState;
  challengeId?: number;
  reason?: string;
}

/**
 * Check the current state of weekly challenges
 * Returns the state and any associated challenge ID
 */
export async function checkChallengeState(): Promise<ChallengeStateResult> {
  const now = new Date();
  logger.info("Checking challenge state");

  // Look for active or extended challenges
  const activeChallenge = await db
    .select()
    .from(weeklyChallengesTable)
    .where(
      and(
        sql`${weeklyChallengesTable.status} IN ('active', 'extended')`,
        lte(weeklyChallengesTable.startsAt, now),
        gte(weeklyChallengesTable.endsAt, now)
      )
    )
    .orderBy(sql`${weeklyChallengesTable.createdAt} DESC`)
    .limit(1);

  if (activeChallenge.length > 0) {
    const challenge = activeChallenge[0];
    const timeUntilEnd = challenge.endsAt.getTime() - now.getTime();
    const hoursUntilEnd = timeUntilEnd / (1000 * 60 * 60);

    // Check if challenge is within 24 hours of ending and has no submissions
    if (hoursUntilEnd <= 24 && challenge.status === "active") {
      // Check for submissions
      const submissionCount = await db
        .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
        .from(challengeSubmissionsTable)
        .where(eq(challengeSubmissionsTable.challengeId, challenge.id));

      if (submissionCount[0].count === 0) {
        logger.info(
          { challengeId: challenge.id, hoursUntilEnd },
          "Challenge needs extension - no submissions within 24h of end"
        );
        return {
          state: "needs_extension",
          challengeId: challenge.id,
          reason: "No submissions and less than 24 hours remaining",
        };
      }
    }

    logger.info({ challengeId: challenge.id }, "Challenge is active");
    return {
      state: "active",
      challengeId: challenge.id,
      reason: "Challenge running normally",
    };
  }

  // Look for expired challenges that need winner calculation
  const expiredChallenge = await db
    .select()
    .from(weeklyChallengesTable)
    .where(
      and(
        lt(weeklyChallengesTable.endsAt, now),
        eq(weeklyChallengesTable.winnerCalculated, false)
      )
    )
    .orderBy(sql`${weeklyChallengesTable.endsAt} DESC`)
    .limit(1);

  if (expiredChallenge.length > 0) {
    logger.info(
      { challengeId: expiredChallenge[0].id },
      "Challenge needs winner calculation"
    );
    return {
      state: "needs_winner_calculation",
      challengeId: expiredChallenge[0].id,
      reason: "Challenge has ended but winner not calculated",
    };
  }

  // No active or pending challenge - need new one
  logger.info("No active challenge found - needs new challenge");
  return {
    state: "needs_new",
    reason: "No active challenge exists",
  };
}

/**
 * Extend a challenge by adding extra days
 * Can only extend once per challenge
 */
export async function extendChallenge(
  challengeId: number,
  extensionDays: number = 2
): Promise<void> {
  logger.info({ challengeId, extensionDays }, "Attempting to extend challenge");

  try {
    const challenge = await db
      .select()
      .from(weeklyChallengesTable)
      .where(eq(weeklyChallengesTable.id, challengeId))
      .limit(1);

    if (challenge.length === 0) {
      logger.error({ challengeId }, "Challenge not found for extension");
      throw new Error("Challenge not found");
    }

    const current = challenge[0];

    // Check if already extended (idempotency)
    if (current.status === "extended") {
      logger.warn({ challengeId }, "Challenge already extended, skipping");
      return; // Idempotent - don't throw, just skip
    }

    // Check if challenge already ended
    if (current.status === "completed") {
      logger.warn({ challengeId }, "Cannot extend completed challenge");
      throw new Error("Cannot extend a completed challenge");
    }

    // Validate extension days
    if (extensionDays < 1 || extensionDays > 7) {
      logger.error({ challengeId, extensionDays }, "Invalid extension days");
      throw new Error("Extension days must be between 1 and 7");
    }

    // Calculate new end date
    const newEndsAt = new Date(current.endsAt);
    newEndsAt.setUTCDate(newEndsAt.getUTCDate() + extensionDays);

    // Update challenge with optimistic locking check
    const result = await db
      .update(weeklyChallengesTable)
      .set({
        status: "extended",
        originalEndsAt: current.endsAt,
        endsAt: newEndsAt,
        extensionCount: current.extensionCount + 1,
      })
      .where(
        and(
          eq(weeklyChallengesTable.id, challengeId),
          eq(weeklyChallengesTable.status, "active") // Optimistic lock
        )
      )
      .returning();

    if (result.length === 0) {
      logger.warn({ challengeId }, "Challenge state changed during extension, skipping");
      return; // Race condition - another process may have extended it
    }

    logger.info(
      {
        challengeId,
        originalEnd: current.endsAt,
        newEnd: newEndsAt,
        extensionDays,
      },
      "Challenge extended successfully"
    );
  } catch (error) {
    logger.error({ challengeId, error }, "Failed to extend challenge");
    throw error;
  }
}

/**
 * Close a challenge and mark it as completed
 * Should be called after winner calculation
 */
export async function closeChallenge(challengeId: number): Promise<void> {
  logger.info({ challengeId }, "Closing challenge");

  try {
    const result = await db
      .update(weeklyChallengesTable)
      .set({
        status: "completed",
        winnerCalculated: true,
      })
      .where(
        and(
          eq(weeklyChallengesTable.id, challengeId),
          sql`${weeklyChallengesTable.status} IN ('active', 'extended')` // Only close if not already completed
        )
      )
      .returning();

    if (result.length === 0) {
      logger.warn({ challengeId }, "Challenge already closed or not found");
      return; // Idempotent
    }

    logger.info({ challengeId }, "Challenge closed successfully");
  } catch (error) {
    logger.error({ challengeId, error }, "Failed to close challenge");
    throw error;
  }
}

/**
 * Get recent challenge domains for variety
 * Returns domains from last N challenges
 */
export async function getRecentChallengeDomains(
  count: number = 3
): Promise<string[]> {
  const recentChallenges = await db
    .select()
    .from(weeklyChallengesTable)
    .orderBy(sql`${weeklyChallengesTable.createdAt} DESC`)
    .limit(count);

  // Extract domain from description or title
  // For now, we'll need to add a domain field to challenges table
  // or parse from description. Let's return empty array for now
  // and enhance this later
  return [];
}

// Helper function for drizzle-orm comparisons
function lte(column: any, value: any) {
  return sql`${column} <= ${value}`;
}

function gte(column: any, value: any) {
  return sql`${column} >= ${value}`;
}
