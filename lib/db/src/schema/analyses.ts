import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { ideasTable } from "./ideas";

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  ideaId: integer("idea_id").notNull().references(() => ideasTable.id, { onDelete: "cascade" }).unique(),
  status: text("status").notNull().default("pending"),
  uniquenessScore: integer("uniqueness_score"),
  feasibilityScore: integer("feasibility_score"),
  impactScore: integer("impact_score"),
  innovationScore: integer("innovation_score"),
  overallScore: integer("overall_score"),
  strengths: jsonb("strengths").$type<Array<{ title: string; desc: string }>>(),
  weaknesses: jsonb("weaknesses").$type<Array<{ title: string; desc: string }>>(),
  risks: jsonb("risks").$type<Array<{ title: string; desc: string }>>(),
  suggestions: jsonb("suggestions").$type<Array<{ title: string; desc: string }>>(),
  githubRepos: jsonb("github_repos").$type<Array<{ name: string; org: string; stars: number; desc: string; lang: string; url: string }>>(),
  techStack: jsonb("tech_stack").$type<string[]>(),
  marketContext: text("market_context"),
  verdictSummary: text("verdict_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({ id: true, createdAt: true, updatedAt: true });
// @ts-expect-error - compatibility issue between drizzle-zod and zod v3.25
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
