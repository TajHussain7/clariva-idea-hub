import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { teamsTable } from "./teams";
import { ideasTable } from "./ideas";

export const teamDiscussionsTable = pgTable("team_discussions", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),
  ideaId: integer("idea_id").references(() => ideasTable.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertTeamDiscussionSchema = createInsertSchema(
  teamDiscussionsTable,
).omit({
  id: true,
  createdAt: true,
});
// @ts-expect-error - compatibility issue between drizzle-zod and zod v3.25
export type InsertTeamDiscussion = z.infer<typeof insertTeamDiscussionSchema>;
export type TeamDiscussion = typeof teamDiscussionsTable.$inferSelect;
