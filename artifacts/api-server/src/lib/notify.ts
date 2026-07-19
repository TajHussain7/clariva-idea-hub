import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";

interface CreateNotificationInput {
  /** Recipient user id */
  userId: number;
  /** Discriminator – keep in sync with notificationsTable.type */
  type: string;
  /** Short headline (bell dropdown) */
  title: string;
  /** Longer description (notifications page) */
  body: string;
  /** Frontend route to navigate to on click */
  targetPath: string;
  entityType?: string;
  entityId?: number;
}

/**
 * Persist a notification and broadcast it to the recipient's live WebSocket
 * connection if they have one open. Fire-and-forget safe: errors are caught
 * internally so callers never throw because of a failed notification.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  try {
    const [notif] = await db
      .insert(notificationsTable)
      .values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        targetPath: input.targetPath,
        entityType: input.entityType,
        entityId: input.entityId,
      })
      .returning();

    // Push to the recipient's live WS connection (if subscribed)
    (global as any).broadcastToUser?.(input.userId, {
      type: "new_notification",
      notification: notif,
    });
  } catch (err) {
    // Notification delivery must never crash the calling request
    console.error("[notify] Failed to create notification:", err);
  }
}
