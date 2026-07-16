import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { publicIdeasTable } from "./public-ideas";

export const publicIdeaCommentsTable = pgTable("public_idea_comments", {
  id: serial("id").primaryKey(),
  publicIdeaId: integer("public_idea_id")
    .notNull()
    .references(() => publicIdeasTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PublicIdeaComment = typeof publicIdeaCommentsTable.$inferSelect;
