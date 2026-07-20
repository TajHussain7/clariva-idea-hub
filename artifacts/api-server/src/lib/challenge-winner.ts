import { db } from "@workspace/db";
import {
  challengeSubmissionsTable,
  challengeVotesTable,
  userBadgesTable,
  ideasTable,
  weeklyChallengesTable,
} from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { routeCompletion } from "@workspace/integrations-openrouter-ai";
import { logger } from "./logger.js";

export interface WinnerResult {
  submissionId: number;
  userId: number;
  ideaId: number;
  voteCount: number;
  tiebreaker?: "timestamp" | "ai_evaluation";
  tiebreakerReason?: string;
}

interface SubmissionWithVotes {
  id: number;
  userId: number;
  ideaId: number;
  submittedAt: Date;
  voteCount: number;
}

/**
 * Calculate the winner for a completed challenge
 * Returns null if no submissions exist
 */
export async function calculateWinner(
  challengeId: number
): Promise<WinnerResult | null> {
  logger.info({ challengeId }, "Starting winner calculation");

  // Check if winner already calculated
  const challenge = await db
    .select()
    .from(weeklyChallengesTable)
    .where(eq(weeklyChallengesTable.id, challengeId))
    .limit(1);

  if (challenge.length === 0) {
    logger.error({ challengeId }, "Challenge not found");
    throw new Error("Challenge not found");
  }

  if (challenge[0].winnerCalculated) {
    logger.warn({ challengeId }, "Winner already calculated for this challenge");
    // Find existing winner
    const existingWinner = await db
      .select()
      .from(userBadgesTable)
      .where(
        and(
          eq(userBadgesTable.challengeId, challengeId),
          eq(userBadgesTable.type, "challenge_winner")
        )
      )
      .limit(1);

    if (existingWinner.length > 0) {
      const winnerSubmission = await db
        .select()
        .from(challengeSubmissionsTable)
        .where(
          and(
            eq(challengeSubmissionsTable.challengeId, challengeId),
            eq(challengeSubmissionsTable.userId, existingWinner[0].userId)
          )
        )
        .limit(1);

      if (winnerSubmission.length > 0) {
        return {
          submissionId: winnerSubmission[0].id,
          userId: winnerSubmission[0].userId,
          ideaId: winnerSubmission[0].ideaId,
          voteCount: 0, // Could query for actual count if needed
        };
      }
    }
  }

  // Get all submissions with vote counts
  const submissions = await db
    .select({
      id: challengeSubmissionsTable.id,
      userId: challengeSubmissionsTable.userId,
      ideaId: challengeSubmissionsTable.ideaId,
      submittedAt: challengeSubmissionsTable.submittedAt,
      voteCount: sql<number>`CAST(COUNT(${challengeVotesTable.id}) AS INTEGER)`,
    })
    .from(challengeSubmissionsTable)
    .leftJoin(
      challengeVotesTable,
      eq(challengeVotesTable.submissionId, challengeSubmissionsTable.id)
    )
    .where(eq(challengeSubmissionsTable.challengeId, challengeId))
    .groupBy(
      challengeSubmissionsTable.id,
      challengeSubmissionsTable.userId,
      challengeSubmissionsTable.ideaId,
      challengeSubmissionsTable.submittedAt
    );

  logger.info(
    { challengeId, submissionCount: submissions.length },
    "Retrieved submissions with vote counts"
  );

  // No submissions case
  if (submissions.length === 0) {
    logger.info({ challengeId }, "No submissions found, no winner");
    await markChallengeWinnerCalculated(challengeId);
    return null;
  }

  // Single submission - automatic winner
  if (submissions.length === 1) {
    logger.info({ challengeId }, "Single submission, automatic winner");
    const winner = submissions[0];
    await awardWinnerBadge(challengeId, winner.userId);
    await markChallengeWinnerCalculated(challengeId);
    return {
      submissionId: winner.id,
      userId: winner.userId,
      ideaId: winner.ideaId,
      voteCount: winner.voteCount,
    };
  }

  // Find max vote count
  const maxVotes = Math.max(...submissions.map((s) => s.voteCount));
  const topSubmissions = submissions.filter((s) => s.voteCount === maxVotes);

  // Clear winner - highest vote count
  if (topSubmissions.length === 1) {
    logger.info(
      { challengeId, winnerId: topSubmissions[0].userId, votes: maxVotes },
      "Clear winner by vote count"
    );
    const winner = topSubmissions[0];
    await awardWinnerBadge(challengeId, winner.userId);
    await markChallengeWinnerCalculated(challengeId);
    return {
      submissionId: winner.id,
      userId: winner.userId,
      ideaId: winner.ideaId,
      voteCount: winner.voteCount,
    };
  }

  // Multiple submissions tied - use tiebreaker
  logger.info(
    { challengeId, tiedCount: topSubmissions.length, votes: maxVotes },
    "Tie detected, applying tiebreaker logic"
  );

  return await resolveTie(challengeId, topSubmissions);
}

/**
 * Resolve a tie between multiple submissions
 * Step 1: Earliest submission wins
 * Step 2: If timestamps match exactly, use AI evaluation
 */
async function resolveTie(
  challengeId: number,
  tiedSubmissions: SubmissionWithVotes[]
): Promise<WinnerResult> {
  // Sort by submission timestamp (earliest first)
  const sortedByTime = [...tiedSubmissions].sort(
    (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()
  );

  const earliest = sortedByTime[0];
  const earliestTime = earliest.submittedAt.getTime();

  // Check if multiple submissions have the exact same timestamp
  const sameTimeSubmissions = sortedByTime.filter(
    (s) => s.submittedAt.getTime() === earliestTime
  );

  // If only one earliest submission, that's the winner
  if (sameTimeSubmissions.length === 1) {
    logger.info(
      { challengeId, winnerId: earliest.userId },
      "Winner determined by earliest submission timestamp"
    );
    await awardWinnerBadge(challengeId, earliest.userId);
    await markChallengeWinnerCalculated(challengeId);
    return {
      submissionId: earliest.id,
      userId: earliest.userId,
      ideaId: earliest.ideaId,
      voteCount: earliest.voteCount,
      tiebreaker: "timestamp",
      tiebreakerReason: "Earliest submission among tied entries",
    };
  }

  // Multiple submissions at exact same time - use AI evaluation
  logger.info(
    {
      challengeId,
      tiedCount: sameTimeSubmissions.length,
      timestamp: earliest.submittedAt,
    },
    "Multiple submissions at exact same time, using AI evaluation"
  );

  const aiWinner = await evaluateTiedSubmissionsWithAI(
    challengeId,
    sameTimeSubmissions
  );

  await awardWinnerBadge(challengeId, aiWinner.userId);
  await markChallengeWinnerCalculated(challengeId);

  return {
    submissionId: aiWinner.id,
    userId: aiWinner.userId,
    ideaId: aiWinner.ideaId,
    voteCount: aiWinner.voteCount,
    tiebreaker: "ai_evaluation",
    tiebreakerReason: "AI selected best fit among simultaneously submitted tied entries",
  };
}

/**
 * Use AI to evaluate tied submissions and pick the best one
 */
async function evaluateTiedSubmissionsWithAI(
  challengeId: number,
  submissions: SubmissionWithVotes[]
): Promise<SubmissionWithVotes> {
  try {
    // Get challenge details
    const challenge = await db
      .select()
      .from(weeklyChallengesTable)
      .where(eq(weeklyChallengesTable.id, challengeId))
      .limit(1);

    if (challenge.length === 0) {
      throw new Error("Challenge not found");
    }

    // Get idea details for all tied submissions
    const ideaIds = submissions.map((s) => s.ideaId);
    const ideas = await db
      .select()
      .from(ideasTable)
      .where(
        sql`${ideasTable.id} IN (${sql.raw(ideaIds.join(","))})`
      );

    const ideaMap = new Map(ideas.map((idea) => [idea.id, idea]));

    // Handle edge case: ideas may have been deleted
    const submissionsWithIdeas = submissions.filter(s => ideaMap.has(s.ideaId));
    
    if (submissionsWithIdeas.length === 0) {
      logger.error({ challengeId }, "All tied submissions have deleted ideas");
      throw new Error("No valid submissions for AI evaluation");
    }

    if (submissionsWithIdeas.length === 1) {
      logger.info({ challengeId }, "Only one valid submission remains after filtering deleted ideas");
      return submissionsWithIdeas[0];
    }

    // Build evaluation prompt
    const submissionDetails = submissionsWithIdeas.map((sub, idx) => {
      const idea = ideaMap.get(sub.ideaId);
      return `
SUBMISSION ${idx + 1}:
Title: ${idea?.title || "Unknown"}
Description: ${idea?.description || "No description"}
Domain: ${idea?.domain || "Unknown"}
Complexity: ${idea?.complexity || 0}/4
`;
    });

    const systemPrompt = `You are an expert judge for a startup idea competition. You must evaluate tied submissions and select the single best one based on the challenge criteria.

Your response MUST be ONLY a JSON object with this exact structure:
{
  "winnerIndex": <0-based index of winning submission>,
  "reasoning": "<brief explanation of why this submission best fits the challenge>"
}`;

    const userPrompt = `CHALLENGE:
Title: ${challenge[0].title}
Description: ${challenge[0].description}

These ${submissionsWithIdeas.length} submissions are tied with equal votes. Select the ONE that best matches the challenge criteria:

${submissionDetails.join("\n---\n")}

Evaluate based on:
- Relevance to the challenge theme
- Innovation and uniqueness
- Feasibility and clarity
- Potential impact

Return ONLY the JSON response.`;

    logger.info(
      { challengeId, submissionCount: submissionsWithIdeas.length },
      "Requesting AI tiebreaker evaluation"
    );

    const result = await routeCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    // Parse AI response
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      winnerIndex: number;
      reasoning: string;
    };

    if (
      typeof parsed.winnerIndex !== "number" ||
      parsed.winnerIndex < 0 ||
      parsed.winnerIndex >= submissionsWithIdeas.length
    ) {
      throw new Error("Invalid winner index from AI");
    }

    logger.info(
      {
        challengeId,
        winnerIndex: parsed.winnerIndex,
        reasoning: parsed.reasoning,
      },
      "AI tiebreaker evaluation complete"
    );

    return submissionsWithIdeas[parsed.winnerIndex];
  } catch (err) {
    logger.error(
      { err, challengeId },
      "AI evaluation failed, defaulting to first submission"
    );
    // Fallback to first submission if AI fails
    return submissions[0];
  }
}

/**
 * Award challenge_winner badge to user
 */
async function awardWinnerBadge(
  challengeId: number,
  userId: number
): Promise<void> {
  try {
    // Check if badge already exists
    const existing = await db
      .select()
      .from(userBadgesTable)
      .where(
        and(
          eq(userBadgesTable.userId, userId),
          eq(userBadgesTable.challengeId, challengeId),
          eq(userBadgesTable.type, "challenge_winner")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      logger.info(
        { challengeId, userId },
        "Badge already awarded to this user"
      );
      return;
    }

    await db.insert(userBadgesTable).values({
      userId,
      type: "challenge_winner",
      challengeId,
    });

    logger.info({ challengeId, userId }, "Winner badge awarded");
  } catch (err) {
    logger.error({ err, challengeId, userId }, "Failed to award winner badge");
    throw err;
  }
}

/**
 * Mark challenge as having winner calculated
 */
async function markChallengeWinnerCalculated(
  challengeId: number
): Promise<void> {
  await db
    .update(weeklyChallengesTable)
    .set({ winnerCalculated: true, status: "completed" })
    .where(eq(weeklyChallengesTable.id, challengeId));

  logger.info({ challengeId }, "Challenge marked as winner calculated");
}
