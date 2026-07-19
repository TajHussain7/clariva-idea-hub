import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

// ─── GET /api/notifications ────────────────────────────────────────────────────
// Returns the latest notifications for the current user (newest first).
router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const limit = Math.min(
    parseInt(String(req.query.limit ?? "50"), 10) || 50,
    100,
  );
  const onlyUnread = req.query.unread === "true";

  const conditions = onlyUnread
    ? and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.isRead, false),
      )
    : eq(notificationsTable.userId, userId);

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(conditions)
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit);

  res.json(rows);
});

// ─── GET /api/notifications/unread-count ──────────────────────────────────────
router.get(
  "/notifications/unread-count",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.isRead, false),
        ),
      );

    res.json({ count });
  },
);

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────
router.patch(
  "/notifications/:id/read",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;
    const id = parseInt(String(req.params.id ?? ""), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid notification id" });
      return;
    }

    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.userId, userId),
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    res.json(updated);
  },
);

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────
router.patch(
  "/notifications/read-all",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.session.userId!;

    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.isRead, false),
        ),
      );

    res.json({ ok: true });
  },
);

export default router;
