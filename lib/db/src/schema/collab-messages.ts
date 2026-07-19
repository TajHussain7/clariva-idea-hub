import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { collaborationOffersTable } from "./collaboration-offers";
import { usersTable } from "./users";

export const collabMessagesTable = pgTable("collab_messages", {
  id: serial("id").primaryKey(),
  offerId: integer("offer_id")
    .notNull()
    .references(() => collaborationOffersTable.id, { onDelete: "cascade" }),
  senderId: integer("sender_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  /** Plain text or markdown-formatted content */
  content: text("content").notNull(),
  /** "text" | "image" | "file" */
  contentType: text("content_type").notNull().default("text"),
  /** Original filename for file/image attachments */
  fileName: text("file_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CollabMessage = typeof collabMessagesTable.$inferSelect;
