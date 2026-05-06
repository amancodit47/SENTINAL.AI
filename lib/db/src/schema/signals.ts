import { pgTable, text, serial, timestamp, integer, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { sourcesTable } from "./sources";

export const signalsTable = pgTable("signals", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  sourceId: integer("source_id").notNull().references(() => sourcesTable.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  externalId: text("external_id"),
  content: text("content").notNull(),
  author: text("author"),
  url: text("url"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  sentiment: text("sentiment"),
  sentimentScore: real("sentiment_score"),
  confidenceScore: real("confidence_score"),
  entities: jsonb("entities").$type<Array<{ text: string; type: string; confidence: number }>>().default([]),
  hasSafetyFlag: boolean("has_safety_flag").notNull().default(false),
  safetyReason: text("safety_reason"),
  hasPiiFlag: boolean("has_pii_flag").notNull().default(false),
  piiTypes: text("pii_types").array().default([]),
  isAnalyzed: boolean("is_analyzed").notNull().default(false),
  matchedKeywords: text("matched_keywords").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSignalSchema = createInsertSchema(signalsTable).omit({ id: true, createdAt: true });
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signalsTable.$inferSelect;
