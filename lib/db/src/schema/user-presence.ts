import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { teamsTable } from "./teams";

export const userPresenceTable = pgTable("user_presence", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teamsTable.id, {
    onDelete: "cascade",
  }),
  isOnline: boolean("is_online").notNull().default(false),
  lastActivity: timestamp("last_activity", { withTimezone: true })
    .notNull()
    .defaultNow(),
  location: text("location").default("dashboard"), // 'dashboard' | 'team' | 'idea' | 'discussion'
});

export const insertUserPresenceSchema = createInsertSchema(
  userPresenceTable,
).omit({
  id: true,
});
// @ts-expect-error - compatibility issue between drizzle-zod and zod v3.25
export type InsertUserPresence = z.infer<typeof insertUserPresenceSchema>;
export type UserPresence = typeof userPresenceTable.$inferSelect;
