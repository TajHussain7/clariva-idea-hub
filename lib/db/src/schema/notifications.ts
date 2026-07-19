import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  /** The user who should receive this notification */
  userId: integer("user_id")
    .references(() => usersTable.id, { onDelete: "cascade" })
    .notNull(),
  /**
   * Discriminator for the notification category.
   * vote | comment | offer_received | offer_accepted | offer_declined
   * | collab_message | team_invite | team_joined | discussion_message
   */
  type: text("type").notNull(),
  /** Short headline shown in the bell dropdown */
  title: text("title").notNull(),
  /** Longer description shown on the notifications page */
  body: text("body").notNull(),
  /**
   * The frontend route the user is taken to when they click the notification.
   * e.g. "/feed", "/feed?tab=offers", "/team/3"
   */
  targetPath: text("target_path").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  /** Optional: the kind of entity this relates to */
  entityType: text("entity_type"),
  /** Optional: the DB id of the related entity */
  entityId: integer("entity_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
