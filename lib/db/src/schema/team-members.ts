import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { teamsTable } from "./teams";

export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // 'owner' | 'member'
  joinedAt: timestamp("joined_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembersTable).omit(
  { id: true, joinedAt: true },
);
// @ts-expect-error - compatibility issue between drizzle-zod and zod v3.25
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembersTable.$inferSelect;
