import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, sourcesTable, engineTypesTable } from "@workspace/db";
import {
  ListSourcesParams,
  CreateSourceParams,
  CreateSourceBody,
  UpdateSourceParams,
  UpdateSourceBody,
  DeleteSourceParams,
  TriggerSourceCollectionParams,
} from "@workspace/api-zod";
import { collectFromSource } from "../lib/data-collectors";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function formatSource(source: typeof sourcesTable.$inferSelect) {
  const [engineType] = await db.select().from(engineTypesTable).where(eq(engineTypesTable.id, source.engineTypeId));
  return {
    ...source,
    engineTypeName: engineType?.name ?? "Unknown",
  };
}

router.get("/projects/:projectId/sources", async (req, res): Promise<void> => {
  const params = ListSourcesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const sources = await db
    .select()
    .from(sourcesTable)
    .where(eq(sourcesTable.projectId, params.data.projectId));

  const result = await Promise.all(sources.map(formatSource));
  res.json(result);
});

router.post("/projects/:projectId/sources", async (req, res): Promise<void> => {
  const params = CreateSourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateSourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [source] = await db
    .insert(sourcesTable)
    .values({ projectId: params.data.projectId, ...parsed.data })
    .returning();
  const formatted = await formatSource(source!);
  res.status(201).json(formatted);
});

router.patch("/projects/:projectId/sources/:id", async (req, res): Promise<void> => {
  const params = UpdateSourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.config != null) updateData.config = parsed.data.config;
  if (parsed.data.latency != null) updateData.latency = parsed.data.latency;
  if (parsed.data.isEnabled != null) updateData.isEnabled = parsed.data.isEnabled;

  const [source] = await db
    .update(sourcesTable)
    .set(updateData)
    .where(and(eq(sourcesTable.id, params.data.id), eq(sourcesTable.projectId, params.data.projectId)))
    .returning();
  if (!source) {
    res.status(404).json({ error: "Source not found" });
    return;
  }
  const formatted = await formatSource(source);
  res.json(formatted);
});

router.delete("/projects/:projectId/sources/:id", async (req, res): Promise<void> => {
  const params = DeleteSourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(sourcesTable)
    .where(and(eq(sourcesTable.id, params.data.id), eq(sourcesTable.projectId, params.data.projectId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Source not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/projects/:projectId/sources/:id/trigger", async (req, res): Promise<void> => {
  const params = TriggerSourceCollectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [source] = await db
    .select()
    .from(sourcesTable)
    .where(and(eq(sourcesTable.id, params.data.id), eq(sourcesTable.projectId, params.data.projectId)));
  if (!source) {
    res.status(404).json({ error: "Source not found" });
    return;
  }
  try {
    const signalsCollected = await collectFromSource(source);
    res.json({ signalsCollected, message: `Collected ${signalsCollected} new signals` });
  } catch (err) {
    logger.error({ err, sourceId: source.id }, "Failed to collect from source");
    res.status(500).json({ error: "Collection failed" });
  }
});

export default router;
