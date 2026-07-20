import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const weeklyChallengesTable = pgTable("weekly_challenges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  createdBy: integer("created_by")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // New fields for automation
  status: text("status").notNull().default("active"), // 'active' | 'completed' | 'extended'
  originalEndsAt: timestamp("original_ends_at", { withTimezone: true }), // Store original end date when extended
  extensionCount: integer("extension_count").notNull().default(0), // Track number of extensions
  winnerCalculated: boolean("winner_calculated").notNull().default(false), // Track if winner was calculated
});

export type WeeklyChallenge = typeof weeklyChallengesTable.$inferSelect;
