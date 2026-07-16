import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { weeklyChallengesTable } from "./weekly-challenges";

export const userBadgesTable = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  /** challenge_winner */
  type: text("type").notNull(),
  challengeId: integer("challenge_id").references(
    () => weeklyChallengesTable.id,
    {
      onDelete: "set null",
    },
  ),
  awardedAt: timestamp("awarded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserBadge = typeof userBadgesTable.$inferSelect;
