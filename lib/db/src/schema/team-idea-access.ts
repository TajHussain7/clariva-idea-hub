import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { teamsTable } from "./teams";
import { ideasTable } from "./ideas";
import { usersTable } from "./users";

export const teamIdeaAccessTable = pgTable("team_idea_access", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),
  ideaId: integer("idea_id")
    .notNull()
    .references(() => ideasTable.id, { onDelete: "cascade" }),
  sharedBy: integer("shared_by")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  accessLevel: text("access_level").notNull().default("view"), // 'view' | 'comment'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertTeamIdeaAccessSchema = createInsertSchema(
  teamIdeaAccessTable,
).omit({
  id: true,
  createdAt: true,
});
// @ts-expect-error - compatibility issue between drizzle-zod and zod v3.25
export type InsertTeamIdeaAccess = z.infer<typeof insertTeamIdeaAccessSchema>;
export type TeamIdeaAccess = typeof teamIdeaAccessTable.$inferSelect;
