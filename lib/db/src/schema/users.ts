import {
  pgTable,
  text,
  serial,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export interface UserNotifications {
  weeklyDigest: boolean;
  analysisComplete: boolean;
}

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  domain: text("domain"),
  phone: text("phone"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  theme: text("theme").default("light"),
  language: text("language").default("en-US"),
  notifications: jsonb("notifications").$type<UserNotifications>().default({
    weeklyDigest: false,
    analysisComplete: true,
  }),
  isAdmin: boolean("is_admin").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
// @ts-expect-error - compatibility issue between drizzle-zod and zod v3.25
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
