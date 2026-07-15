import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { teamsTable } from "./teams";
import { usersTable } from "./users";

export const teamInvitationsTable = pgTable("team_invitations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'rejected'
  invitedBy: integer("invited_by")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  acceptedBy: integer("accepted_by").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

export const insertTeamInvitationSchema = createInsertSchema(
  teamInvitationsTable,
).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  acceptedBy: true,
  status: true,
});
// @ts-expect-error - compatibility issue between drizzle-zod and zod v3.25
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;
export type TeamInvitation = typeof teamInvitationsTable.$inferSelect;
