import { db } from "@workspace/db";
import { weeklyChallengesTable } from "@workspace/db/schema";
import { and, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import {
  checkChallengeState,
  extendChallenge,
  closeChallenge,
  getRecentChallengeDomains,
} from "../lib/challenge-lifecycle.js";
import { calculateWinner } from "../lib/challenge-winner.js";
import { generateChallenge } from "../lib/pipeline/challenge-generator.js";

// System user ID for automated challenge creation
const SYSTEM_USER_ID = 1; // Assumes user with ID 1 exists, adjust as needed

interface WorkerStats {
  cyclesRun: number;
  challengesCreated: number;
  challengesExtended: number;
  winnersCalculated: number;
  errors: number;
  lastRun: Date;
}

const stats: WorkerStats = {
  cyclesRun: 0,
  challengesCreated: 0,
  challengesExtended: 0,
  winnersCalculated: 0,
  errors: 0,
  lastRun: new Date(),
};

/**
 * Main worker cycle - checks challenge state and takes appropriate action
 * Includes retry logic and comprehensive error handling
 */
export async function runWorkerCycle(): Promise<void> {
  const cycleId = `cycle-${Date.now()}`;
  logger.info({ cycleId }, "Starting worker cycle");

  try {
    const state = await checkChallengeState();
    logger.info(
      { cycleId, state: state.state, reason: state.reason },
      "Challenge state checked",
    );

    switch (state.state) {
      case "needs_winner_calculation":
        if (state.challengeId) {
          await handleWinnerCalculation(state.challengeId);
          stats.winnersCalculated++;
        }
        break;

      case "needs_extension":
        if (state.challengeId) {
          await handleChallengeExtension(state.challengeId);
          stats.challengesExtended++;
        }
        break;

      case "needs_new":
        await handleNewChallenge();
        stats.challengesCreated++;
        break;

      case "active":
        logger.info(
          { cycleId, challengeId: state.challengeId },
          "Challenge active, no action needed",
        );
        break;

      default:
        logger.warn({ cycleId, state }, "Unknown challenge state");
    }

    stats.cyclesRun++;
    stats.lastRun = new Date();
    logger.info({ cycleId, stats }, "Worker cycle completed successfully");
  } catch (error) {
    stats.errors++;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(
      { cycleId, error: errorMessage, stack: errorStack, stats },
      "Worker cycle failed",
    );

    // Don't throw - let worker continue on next cycle
    // Critical errors will be logged and can be monitored
  }
}

/**
 * Calculate winner for expired challenge with retry logic
 */
async function handleWinnerCalculation(challengeId: number): Promise<void> {
  logger.info({ challengeId }, "Handling winner calculation");

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const winner = await calculateWinner(challengeId);

      if (winner) {
        logger.info(
          {
            challengeId,
            winnerId: winner.userId,
            submissionId: winner.submissionId,
            voteCount: winner.voteCount,
            tiebreaker: winner.tiebreaker,
          },
          "Winner calculated and badge awarded",
        );

        // Broadcast winner announcement if WebSocket available
        await broadcastWinnerAnnouncement(challengeId, winner.userId);
      } else {
        logger.info({ challengeId }, "No submissions - no winner declared");
      }

      await closeChallenge(challengeId);
      await broadcastChallengeCompleted(challengeId);

      return; // Success
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(
        { challengeId, attempt, maxRetries, error: lastError.message },
        "Winner calculation attempt failed",
      );

      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delayMs = Math.pow(2, attempt) * 1000;
        logger.info({ challengeId, delayMs }, "Retrying after delay");
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed
  logger.error(
    { challengeId, error: lastError?.message, stack: lastError?.stack },
    "Failed to calculate winner after all retries",
  );
  throw lastError!;
}

/**
 * Extend challenge when no submissions exist near expiration
 */
async function handleChallengeExtension(challengeId: number): Promise<void> {
  logger.info({ challengeId }, "Handling challenge extension");

  try {
    await extendChallenge(challengeId, 2); // Extend by 2 days
    logger.info({ challengeId }, "Challenge extended by 2 days");

    // Broadcast extension notification
    await broadcastChallengeExtended(challengeId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("already been extended") ||
      errorMessage.includes("already extended")
    ) {
      logger.warn({ challengeId }, "Challenge already extended, skipping");
      // Not an error - idempotent operation
    } else {
      logger.error(
        { challengeId, error: errorMessage },
        "Failed to extend challenge",
      );
      throw error;
    }
  }
}

/**
 * Create new challenge using AI generation with retry logic
 */
async function handleNewChallenge(): Promise<void> {
  logger.info("Handling new challenge creation");

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get recent domains to avoid repetition
      const recentDomains = await getRecentChallengeDomains(3);

      // Generate new challenge
      const challenge = await generateChallenge(recentDomains, undefined, true);

      // Check for duplicate before inserting (race condition protection)
      const existing = await db
        .select()
        .from(weeklyChallengesTable)
        .where(
          and(
            sql`${weeklyChallengesTable.status} IN ('active', 'extended')`,
            sql`${weeklyChallengesTable.endsAt} > NOW()`,
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        logger.warn(
          { existingChallengeId: existing[0].id },
          "Active challenge already exists, skipping creation",
        );
        return; // Idempotent - another worker may have created it
      }

      // Insert into database
      const result = await db
        .insert(weeklyChallengesTable)
        .values({
          title: challenge.title,
          description: challenge.description,
          startsAt: challenge.startsAt,
          endsAt: challenge.endsAt,
          createdBy: SYSTEM_USER_ID,
          status: "active",
          extensionCount: 0,
          winnerCalculated: false,
        })
        .returning();

      const createdChallenge = result[0];

      logger.info(
        {
          challengeId: createdChallenge.id,
          title: challenge.title,
          domain: challenge.domain,
          startsAt: challenge.startsAt,
          endsAt: challenge.endsAt,
        },
        "New challenge created successfully",
      );

      // Broadcast new challenge
      await broadcastChallengeCreated(createdChallenge.id);

      return; // Success
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a duplicate key error (race condition)
      if (
        lastError.message.includes("duplicate") ||
        lastError.message.includes("unique")
      ) {
        logger.warn("Duplicate challenge detected, skipping creation");
        return; // Idempotent
      }

      logger.warn(
        { attempt, maxRetries, error: lastError.message },
        "Challenge creation attempt failed",
      );

      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000;
        logger.info({ delayMs }, "Retrying after delay");
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed
  logger.error(
    { error: lastError?.message, stack: lastError?.stack },
    "Failed to create new challenge after all retries",
  );
  throw lastError!;
}

/**
 * Broadcast winner announcement via WebSocket
 * Note: This assumes WebSocket broadcast function exists
 */
async function broadcastWinnerAnnouncement(
  challengeId: number,
  winnerId: number,
): Promise<void> {
  try {
    // Import dynamically to avoid circular dependencies
    const { broadcastToChallenge } = await import("../routes/ws.js");
    await broadcastToChallenge(challengeId, {
      type: "winner_declared",
      payload: { challengeId, winnerId },
    });
    logger.info({ challengeId, winnerId }, "Winner announcement broadcast");
  } catch (error) {
    logger.error(
      { error, challengeId },
      "Failed to broadcast winner announcement",
    );
    // Non-critical error, don't throw
  }
}

/**
 * Broadcast challenge extended notification
 */
async function broadcastChallengeExtended(challengeId: number): Promise<void> {
  try {
    const { broadcastToChallenge } = await import("../routes/ws.js");
    await broadcastToChallenge(challengeId, {
      type: "challenge_extended",
      payload: { challengeId, extensionDays: 2 },
    });
    logger.info({ challengeId }, "Challenge extension broadcast");
  } catch (error) {
    logger.error({ error, challengeId }, "Failed to broadcast extension");
  }
}

/**
 * Broadcast challenge completed notification
 */
async function broadcastChallengeCompleted(challengeId: number): Promise<void> {
  try {
    const { broadcastToChallenge } = await import("../routes/ws.js");
    await broadcastToChallenge(challengeId, {
      type: "challenge_completed",
      payload: { challengeId },
    });
    logger.info({ challengeId }, "Challenge completion broadcast");
  } catch (error) {
    logger.error({ error, challengeId }, "Failed to broadcast completion");
  }
}

/**
 * Broadcast new challenge created
 */
async function broadcastChallengeCreated(challengeId: number): Promise<void> {
  try {
    const { broadcastToFeed } = await import("../routes/ws.js");
    await broadcastToFeed({
      type: "challenge_created",
      payload: { challengeId },
    });
    logger.info({ challengeId }, "New challenge broadcast");
  } catch (error) {
    logger.error({ error, challengeId }, "Failed to broadcast new challenge");
  }
}

/**
 * Get worker statistics
 */
export function getWorkerStats(): WorkerStats {
  return { ...stats };
}

/**
 * Reset worker statistics (for testing)
 */
export function resetWorkerStats(): void {
  stats.cyclesRun = 0;
  stats.challengesCreated = 0;
  stats.challengesExtended = 0;
  stats.winnersCalculated = 0;
  stats.errors = 0;
  stats.lastRun = new Date();
}
