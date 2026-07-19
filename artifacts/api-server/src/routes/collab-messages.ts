import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  collabMessagesTable,
  collaborationOffersTable,
  publicIdeasTable,
  ideasTable,
  usersTable,
} from "@workspace/db";
import { eq, and, or, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ─── Helper: verify user is a party to the offer ─────────────────────────────

async function getOfferParties(offerId: number) {
  const [row] = await db
    .select({
      offerId: collaborationOffersTable.id,
      publicIdeaId: collaborationOffersTable.publicIdeaId,
      offererId: collaborationOffersTable.offererId,
      ownerId: publicIdeasTable.userId,
    })
    .from(collaborationOffersTable)
    .innerJoin(
      publicIdeasTable,
      eq(publicIdeasTable.id, collaborationOffersTable.publicIdeaId),
    )
    .where(eq(collaborationOffersTable.id, offerId));
  return row ?? null;
}

// ─── GET /api/collab/my-offers ────────────────────────────────────────────────
// Returns all offers where the current user is either the offerer or idea owner.
router.get(
  "/collab/my-offers",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;

    const offererUsers = alias(usersTable, "offerer");
    const ownerUsers = alias(usersTable, "owner");

    const offers = await db
      .select({
        id: collaborationOffersTable.id,
        publicIdeaId: collaborationOffersTable.publicIdeaId,
        offererId: collaborationOffersTable.offererId,
        offererName: offererUsers.name,
        ownerId: publicIdeasTable.userId,
        ownerName: ownerUsers.name,
        ideaTitle: ideasTable.title,
        ideaDomain: ideasTable.domain,
        message: collaborationOffersTable.message,
        status: collaborationOffersTable.status,
        createdAt: collaborationOffersTable.createdAt,
      })
      .from(collaborationOffersTable)
      .innerJoin(
        publicIdeasTable,
        eq(publicIdeasTable.id, collaborationOffersTable.publicIdeaId),
      )
      .innerJoin(ideasTable, eq(ideasTable.id, publicIdeasTable.ideaId))
      .innerJoin(
        offererUsers,
        eq(offererUsers.id, collaborationOffersTable.offererId),
      )
      .innerJoin(ownerUsers, eq(ownerUsers.id, publicIdeasTable.userId))
      .where(
        or(
          eq(collaborationOffersTable.offererId, userId),
          eq(publicIdeasTable.userId, userId),
        ),
      )
      .orderBy(desc(collaborationOffersTable.createdAt));

    res.json(offers);
  },
);

// ─── GET /api/collab/:offerId/messages ────────────────────────────────────────
router.get(
  "/collab/:offerId/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const offerId = parseInt(String(req.params.offerId ?? ""), 10);
    if (isNaN(offerId)) {
      res.status(400).json({ error: "Invalid offer ID" });
      return;
    }

    const parties = await getOfferParties(offerId);
    if (!parties) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }
    if (parties.offererId !== userId && parties.ownerId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const senderAlias = alias(usersTable, "sender");

    const msgs = await db
      .select({
        id: collabMessagesTable.id,
        offerId: collabMessagesTable.offerId,
        senderId: collabMessagesTable.senderId,
        senderName: senderAlias.name,
        content: collabMessagesTable.content,
        contentType: collabMessagesTable.contentType,
        fileName: collabMessagesTable.fileName,
        createdAt: collabMessagesTable.createdAt,
      })
      .from(collabMessagesTable)
      .innerJoin(senderAlias, eq(senderAlias.id, collabMessagesTable.senderId))
      .where(eq(collabMessagesTable.offerId, offerId))
      .orderBy(collabMessagesTable.createdAt);

    res.json(msgs);
  },
);

// ─── POST /api/collab/:offerId/messages ───────────────────────────────────────
router.post(
  "/collab/:offerId/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const offerId = parseInt(String(req.params.offerId ?? ""), 10);
    if (isNaN(offerId)) {
      res.status(400).json({ error: "Invalid offer ID" });
      return;
    }

    const parties = await getOfferParties(offerId);
    if (!parties) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }
    if (parties.offererId !== userId && parties.ownerId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const content = (req.body?.content as string | undefined)?.trim();
    if (!content) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    const contentType = (req.body?.contentType as string | undefined) ?? "text";
    const fileName = (req.body?.fileName as string | undefined) ?? null;

    // Enforce 1 MB limit on content (covers base64 files/images)
    if (Buffer.byteLength(content, "utf8") > 1.5 * 1024 * 1024) {
      res.status(413).json({ error: "Content exceeds 1 MB limit" });
      return;
    }

    const [inserted] = await db
      .insert(collabMessagesTable)
      .values({ offerId, senderId: userId, content, contentType, fileName })
      .returning();

    const [sender] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    const fullMessage = {
      ...inserted,
      senderName: sender?.name ?? "Unknown",
    };

    logger.info({ offerId, messageId: inserted.id }, "Collab message sent");

    // Real-time broadcast to conversation subscribers
    (global as any).broadcastToCollabConvo?.(offerId, {
      type: "new_collab_message",
      offerId,
      message: fullMessage,
    });

    res.status(201).json(fullMessage);
  },
);

export default router;
