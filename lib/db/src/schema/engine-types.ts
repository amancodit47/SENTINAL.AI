import { pgTable, text, serial, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const engineTypesTable = pgTable("engine_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  configSchema: jsonb("config_schema").$type<Record<string, unknown>>().default({}),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEngineTypeSchema = createInsertSchema(engineTypesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEngineType = z.infer<typeof insertEngineTypeSchema>;
export type EngineType = typeof engineTypesTable.$inferSelect;
