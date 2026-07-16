import {
  pgTable,
  serial,
  integer,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ideasTable } from "./ideas";
import { weeklyChallengesTable } from "./weekly-challenges";

export const challengeSubmissionsTable = pgTable(
  "challenge_submissions",
  {
    id: serial("id").primaryKey(),
    challengeId: integer("challenge_id")
      .notNull()
      .references(() => weeklyChallengesTable.id, { onDelete: "cascade" }),
    ideaId: integer("idea_id")
      .notNull()
      .references(() => ideasTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.challengeId, t.ideaId)],
);

export type ChallengeSubmission = typeof challengeSubmissionsTable.$inferSelect;
