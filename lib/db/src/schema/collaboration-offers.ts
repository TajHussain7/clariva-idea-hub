import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { publicIdeasTable } from "./public-ideas";

export const collaborationOffersTable = pgTable(
  "collaboration_offers",
  {
    id: serial("id").primaryKey(),
    publicIdeaId: integer("public_idea_id")
      .notNull()
      .references(() => publicIdeasTable.id, { onDelete: "cascade" }),
    offererId: integer("offerer_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    /** pending | accepted | declined */
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.publicIdeaId, t.offererId)],
);

export type CollaborationOffer = typeof collaborationOffersTable.$inferSelect;
