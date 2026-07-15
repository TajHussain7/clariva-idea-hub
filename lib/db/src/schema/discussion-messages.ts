import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { teamDiscussionsTable } from "./team-discussions";
import { usersTable } from "./users";

export const discussionMessagesTable = pgTable("discussion_messages", {
  id: serial("id").primaryKey(),
  discussionId: integer("discussion_id")
    .notNull()
    .references(() => teamDiscussionsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertDiscussionMessageSchema = createInsertSchema(
  discussionMessagesTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// @ts-expect-error - compatibility issue between drizzle-zod and zod v3.25
export type InsertDiscussionMessage = z.infer<typeof insertDiscussionMessageSchema>;
export type DiscussionMessage = typeof discussionMessagesTable.$inferSelect;
