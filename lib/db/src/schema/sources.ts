import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { engineTypesTable } from "./engine-types";

export const sourcesTable = pgTable("sources", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  engineTypeId: integer("engine_type_id").notNull().references(() => engineTypesTable.id),
  name: text("name").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  latency: text("latency").notNull().default("daily"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSourceSchema = createInsertSchema(sourcesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type Source = typeof sourcesTable.$inferSelect;
