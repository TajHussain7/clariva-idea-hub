import { pgTable, text, timestamp, json } from "drizzle-orm/pg-core";

/**
 * Session table for connect-pg-simple.
 * This mirrors the schema that connect-pg-simple creates automatically,
 * but defining it here lets Drizzle push it via `pnpm db:push`.
 *
 * Reference: https://github.com/voxpelli/node-connect-pg-simple#table-setup
 */
export const sessionTable = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { withTimezone: false, precision: 6 }).notNull(),
});
