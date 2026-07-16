import {
  pgTable,
  serial,
  integer,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { publicIdeasTable } from "./public-ideas";

export const ideaVotesTable = pgTable(
  "idea_votes",
  {
    id: serial("id").primaryKey(),
    publicIdeaId: integer("public_idea_id")
      .notNull()
      .references(() => publicIdeasTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.publicIdeaId, t.userId)],
);

export type IdeaVote = typeof ideaVotesTable.$inferSelect;
