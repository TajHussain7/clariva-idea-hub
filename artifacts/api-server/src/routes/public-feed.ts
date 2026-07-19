import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  publicIdeasTable,
  ideaVotesTable,
  publicIdeaCommentsTable,
  collaborationOffersTable,
  ideasTable,
  usersTable,
  analysesTable,
} from "@workspace/db";
import { eq, and, sql, desc, gt } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip user identity when the idea is posted anonymously */
function maskIfAnonymous(row: {
  isAnonymous: boolean;
  submitterName: string | null;
  submitterId: number | null;
}) {
  if (row.isAnonymous) {
    return { ...row, submitterName: "Anonymous", submitterId: null };
  }
  return row;
}

// ─── POST /feed/publish/:ideaId ───────────────────────────────────────────────
// Publish an analyzed idea to the public feed.
router.post(
  "/feed/publish/:ideaId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const ideaId = parseInt(String(req.params.ideaId ?? ""), 10);
    if (isNaN(ideaId)) {
      res.status(400).json({ error: "Invalid idea ID" });
      return;
    }

    const isAnonymous = req.body?.isAnonymous === true;

    // Verify idea belongs to user and is analyzed
    const [idea] = await db
      .select()
      .from(ideasTable)
      .where(and(eq(ideasTable.id, ideaId), eq(ideasTable.userId, userId)));

    if (!idea) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }

    if (idea.status !== "analyzed") {
      res.status(400).json({ error: "Only analyzed ideas can be published" });
      return;
    }

    try {
      const [pub] = await db
        .insert(publicIdeasTable)
        .values({ ideaId, userId, isAnonymous })
        .returning();

      logger.info({ ideaId, publicIdeaId: pub.id }, "Idea published to feed");

      (global as any).broadcastToFeed?.({
        type: "idea_published",
        publicIdeaId: pub.id,
        ideaId,
        isAnonymous,
      });

      res.status(201).json(pub);
    } catch (err: any) {
      if (err?.code === "23505") {
        res.status(409).json({ error: "Idea is already published" });
        return;
      }
      throw err;
    }
  },
);

// ─── DELETE /feed/publish/:ideaId ─────────────────────────────────────────────
// Unpublish an idea (cascade deletes votes, comments, offers).
router.delete(
  "/feed/publish/:ideaId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const ideaId = parseInt(String(req.params.ideaId ?? ""), 10);
    if (isNaN(ideaId)) {
      res.status(400).json({ error: "Invalid idea ID" });
      return;
    }

    const [deleted] = await db
      .delete(publicIdeasTable)
      .where(
        and(
          eq(publicIdeasTable.ideaId, ideaId),
          eq(publicIdeasTable.userId, userId),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Published idea not found" });
      return;
    }

    logger.info({ ideaId }, "Idea unpublished from feed");

    (global as any).broadcastToFeed?.({
      type: "idea_unpublished",
      publicIdeaId: deleted.id,
      ideaId,
    });

    res.sendStatus(204);
  },
);

// ─── GET /feed/status/:ideaId ─────────────────────────────────────────────────
// Check whether the current user's idea is published.
router.get(
  "/feed/status/:ideaId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const ideaId = parseInt(String(req.params.ideaId ?? ""), 10);
    if (isNaN(ideaId)) {
      res.status(400).json({ error: "Invalid idea ID" });
      return;
    }

    const [pub] = await db
      .select()
      .from(publicIdeasTable)
      .where(
        and(
          eq(publicIdeasTable.ideaId, ideaId),
          eq(publicIdeasTable.userId, userId),
        ),
      );

    res.json({ published: !!pub, publicIdea: pub ?? null });
  },
);

// ─── GET /feed ────────────────────────────────────────────────────────────────
// Paginated public feed. ?sort=recent|votes&page=1&limit=20
router.get("/feed", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const sort = req.query.sort === "votes" ? "votes" : "recent";
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const limit = Math.min(50, parseInt((req.query.limit as string) || "20", 10));
  const offset = (page - 1) * limit;

  const voteCountExpr = sql<number>`(
    SELECT COUNT(*)::int FROM idea_votes iv WHERE iv.public_idea_id = ${publicIdeasTable.id}
  )`;
  const hasVotedExpr = sql<boolean>`EXISTS (
    SELECT 1 FROM idea_votes iv WHERE iv.public_idea_id = ${publicIdeasTable.id} AND iv.user_id = ${userId}
  )`;
  const commentCountExpr = sql<number>`(
    SELECT COUNT(*)::int FROM public_idea_comments pic WHERE pic.public_idea_id = ${publicIdeasTable.id}
  )`;

  const rows = await db
    .select({
      id: publicIdeasTable.id,
      ideaId: publicIdeasTable.ideaId,
      isAnonymous: publicIdeasTable.isAnonymous,
      publishedAt: publicIdeasTable.publishedAt,
      submitterId: publicIdeasTable.userId,
      submitterName: usersTable.name,
      ideaTitle: ideasTable.title,
      ideaDomain: ideasTable.domain,
      ideaDescription: ideasTable.description,
      voteCount: voteCountExpr,
      hasVoted: hasVotedExpr,
      commentCount: commentCountExpr,
    })
    .from(publicIdeasTable)
    .innerJoin(ideasTable, eq(ideasTable.id, publicIdeasTable.ideaId))
    .innerJoin(usersTable, eq(usersTable.id, publicIdeasTable.userId))
    .orderBy(
      sort === "votes"
        ? desc(voteCountExpr)
        : desc(publicIdeasTable.publishedAt),
    )
    .limit(limit)
    .offset(offset);

  res.json(rows.map(maskIfAnonymous));
});

// ─── GET /feed/trending ───────────────────────────────────────────────────────
// Top 10 ideas by vote count in the last 7 days.
router.get("/feed/trending", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const voteCountExpr = sql<number>`(
    SELECT COUNT(*)::int FROM idea_votes iv
    WHERE iv.public_idea_id = ${publicIdeasTable.id}
      AND iv.created_at > ${sevenDaysAgo}
  )`;
  const hasVotedExpr = sql<boolean>`EXISTS (
    SELECT 1 FROM idea_votes iv WHERE iv.public_idea_id = ${publicIdeasTable.id} AND iv.user_id = ${userId}
  )`;
  const commentCountExpr = sql<number>`(
    SELECT COUNT(*)::int FROM public_idea_comments pic WHERE pic.public_idea_id = ${publicIdeasTable.id}
  )`;

  const rows = await db
    .select({
      id: publicIdeasTable.id,
      ideaId: publicIdeasTable.ideaId,
      isAnonymous: publicIdeasTable.isAnonymous,
      publishedAt: publicIdeasTable.publishedAt,
      submitterId: publicIdeasTable.userId,
      submitterName: usersTable.name,
      ideaTitle: ideasTable.title,
      ideaDomain: ideasTable.domain,
      ideaDescription: ideasTable.description,
      voteCount: voteCountExpr,
      hasVoted: hasVotedExpr,
      commentCount: commentCountExpr,
    })
    .from(publicIdeasTable)
    .innerJoin(ideasTable, eq(ideasTable.id, publicIdeasTable.ideaId))
    .innerJoin(usersTable, eq(usersTable.id, publicIdeasTable.userId))
    .where(gt(publicIdeasTable.publishedAt, sevenDaysAgo))
    .orderBy(desc(voteCountExpr))
    .limit(10);

  res.json(rows.map(maskIfAnonymous));
});

// ─── POST /feed/:publicIdeaId/vote ────────────────────────────────────────────
// Toggle an upvote. Returns { voted: boolean, voteCount: number }.
router.post(
  "/feed/:publicIdeaId/vote",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const publicIdeaId = parseInt(String(req.params.publicIdeaId ?? ""), 10);
    if (isNaN(publicIdeaId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [pub] = await db
      .select()
      .from(publicIdeasTable)
      .where(eq(publicIdeasTable.id, publicIdeaId));

    if (!pub) {
      res.status(404).json({ error: "Published idea not found" });
      return;
    }

    const [existing] = await db
      .select()
      .from(ideaVotesTable)
      .where(
        and(
          eq(ideaVotesTable.publicIdeaId, publicIdeaId),
          eq(ideaVotesTable.userId, userId),
        ),
      );

    let voted: boolean;
    if (existing) {
      await db.delete(ideaVotesTable).where(eq(ideaVotesTable.id, existing.id));
      voted = false;
    } else {
      await db.insert(ideaVotesTable).values({ publicIdeaId, userId });
      voted = true;
    }

    const [{ voteCount }] = await db
      .select({ voteCount: sql<number>`COUNT(*)::int` })
      .from(ideaVotesTable)
      .where(eq(ideaVotesTable.publicIdeaId, publicIdeaId));

    (global as any).broadcastToFeed?.({
      type: "vote_updated",
      publicIdeaId,
      voteCount,
    });

    res.json({ voted, voteCount });
  },
);

// ─── GET /feed/:publicIdeaId/comments ─────────────────────────────────────────
router.get(
  "/feed/:publicIdeaId/comments",
  requireAuth,
  async (req, res): Promise<void> => {
    const publicIdeaId = parseInt(String(req.params.publicIdeaId ?? ""), 10);
    if (isNaN(publicIdeaId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const comments = await db
      .select({
        id: publicIdeaCommentsTable.id,
        publicIdeaId: publicIdeaCommentsTable.publicIdeaId,
        userId: publicIdeaCommentsTable.userId,
        authorName: usersTable.name,
        content: publicIdeaCommentsTable.content,
        createdAt: publicIdeaCommentsTable.createdAt,
      })
      .from(publicIdeaCommentsTable)
      .innerJoin(usersTable, eq(usersTable.id, publicIdeaCommentsTable.userId))
      .where(eq(publicIdeaCommentsTable.publicIdeaId, publicIdeaId))
      .orderBy(publicIdeaCommentsTable.createdAt);

    res.json(comments);
  },
);

// ─── POST /feed/:publicIdeaId/comments ────────────────────────────────────────
router.post(
  "/feed/:publicIdeaId/comments",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const publicIdeaId = parseInt(String(req.params.publicIdeaId ?? ""), 10);
    if (isNaN(publicIdeaId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const content = (req.body?.content as string | undefined)?.trim();
    if (!content) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    const [pub] = await db
      .select()
      .from(publicIdeasTable)
      .where(eq(publicIdeasTable.id, publicIdeaId));

    if (!pub) {
      res.status(404).json({ error: "Published idea not found" });
      return;
    }

    const [comment] = await db
      .insert(publicIdeaCommentsTable)
      .values({ publicIdeaId, userId, content })
      .returning();

    const [user] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    const fullComment = { ...comment, authorName: user?.name ?? "Unknown" };

    (global as any).broadcastToFeed?.({
      type: "comment_added",
      publicIdeaId,
      comment: fullComment,
    });

    res.status(201).json(fullComment);
  },
);

// ─── DELETE /feed/:publicIdeaId/comments/:commentId ──────────────────────────
router.delete(
  "/feed/:publicIdeaId/comments/:commentId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const publicIdeaId = parseInt(String(req.params.publicIdeaId ?? ""), 10);
    const commentId = parseInt(String(req.params.commentId ?? ""), 10);

    if (isNaN(publicIdeaId) || isNaN(commentId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [deleted] = await db
      .delete(publicIdeaCommentsTable)
      .where(
        and(
          eq(publicIdeaCommentsTable.id, commentId),
          eq(publicIdeaCommentsTable.publicIdeaId, publicIdeaId),
          eq(publicIdeaCommentsTable.userId, userId),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Comment not found or not yours" });
      return;
    }

    (global as any).broadcastToFeed?.({
      type: "comment_deleted",
      publicIdeaId,
      commentId,
    });

    res.sendStatus(204);
  },
);

// ─── GET /feed/:publicIdeaId/offers ──────────────────────────────────────────
// List collaboration offers for an idea (only the idea owner can see all).
router.get(
  "/feed/:publicIdeaId/offers",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const publicIdeaId = parseInt(String(req.params.publicIdeaId ?? ""), 10);
    if (isNaN(publicIdeaId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [pub] = await db
      .select()
      .from(publicIdeasTable)
      .where(eq(publicIdeasTable.id, publicIdeaId));

    if (!pub) {
      res.status(404).json({ error: "Published idea not found" });
      return;
    }

    if (pub.userId !== userId) {
      res.status(403).json({ error: "Only the idea owner can view offers" });
      return;
    }

    const offers = await db
      .select({
        id: collaborationOffersTable.id,
        publicIdeaId: collaborationOffersTable.publicIdeaId,
        offererId: collaborationOffersTable.offererId,
        offererName: usersTable.name,
        message: collaborationOffersTable.message,
        status: collaborationOffersTable.status,
        createdAt: collaborationOffersTable.createdAt,
      })
      .from(collaborationOffersTable)
      .innerJoin(
        usersTable,
        eq(usersTable.id, collaborationOffersTable.offererId),
      )
      .where(eq(collaborationOffersTable.publicIdeaId, publicIdeaId))
      .orderBy(desc(collaborationOffersTable.createdAt));

    res.json(offers);
  },
);

// ─── POST /feed/:publicIdeaId/offers ─────────────────────────────────────────
// Submit a collaboration offer. One offer per user per idea.
router.post(
  "/feed/:publicIdeaId/offers",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const publicIdeaId = parseInt(String(req.params.publicIdeaId ?? ""), 10);
    if (isNaN(publicIdeaId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const message = (req.body?.message as string | undefined)?.trim();
    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const [pub] = await db
      .select()
      .from(publicIdeasTable)
      .where(eq(publicIdeasTable.id, publicIdeaId));

    if (!pub) {
      res.status(404).json({ error: "Published idea not found" });
      return;
    }

    if (pub.userId === userId) {
      res
        .status(400)
        .json({ error: "You cannot offer to collaborate on your own idea" });
      return;
    }

    try {
      const [offer] = await db
        .insert(collaborationOffersTable)
        .values({ publicIdeaId, offererId: userId, message })
        .returning();

      res.status(201).json(offer);
    } catch (err: any) {
      if (err?.code === "23505") {
        res.status(409).json({
          error: "You have already sent a collaboration offer for this idea",
        });
        return;
      }
      throw err;
    }
  },
);

// ─── PATCH /feed/:publicIdeaId/offers/:offerId ────────────────────────────────
// Accept or decline an offer. Only the idea owner can do this.
router.patch(
  "/feed/:publicIdeaId/offers/:offerId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const publicIdeaId = parseInt(String(req.params.publicIdeaId ?? ""), 10);
    const offerId = parseInt(String(req.params.offerId ?? ""), 10);

    if (isNaN(publicIdeaId) || isNaN(offerId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const status = req.body?.status as string | undefined;
    if (status !== "accepted" && status !== "declined") {
      res
        .status(400)
        .json({ error: "status must be 'accepted' or 'declined'" });
      return;
    }

    // Verify requester owns the idea
    const [pub] = await db
      .select()
      .from(publicIdeasTable)
      .where(eq(publicIdeasTable.id, publicIdeaId));

    if (!pub) {
      res.status(404).json({ error: "Published idea not found" });
      return;
    }

    if (pub.userId !== userId) {
      res
        .status(403)
        .json({ error: "Only the idea owner can respond to offers" });
      return;
    }

    const [updated] = await db
      .update(collaborationOffersTable)
      .set({ status })
      .where(
        and(
          eq(collaborationOffersTable.id, offerId),
          eq(collaborationOffersTable.publicIdeaId, publicIdeaId),
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    res.json(updated);
  },
);

// ─── GET /feed/:publicIdeaId/analysis ────────────────────────────────────────
// Returns the AI analysis for a published idea (any authenticated user).
router.get(
  "/feed/:publicIdeaId/analysis",
  requireAuth,
  async (req, res): Promise<void> => {
    const publicIdeaId = parseInt(String(req.params.publicIdeaId ?? ""), 10);
    if (isNaN(publicIdeaId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [pub] = await db
      .select({ ideaId: publicIdeasTable.ideaId })
      .from(publicIdeasTable)
      .where(eq(publicIdeasTable.id, publicIdeaId));

    if (!pub) {
      res.status(404).json({ error: "Published idea not found" });
      return;
    }

    const [analysis] = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.ideaId, pub.ideaId));

    res.json(analysis ?? null);
  },
);

export default router;
