import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, engineTypesTable } from "@workspace/db";
import {
  CreateEngineTypeBody,
  UpdateEngineTypeParams,
  UpdateEngineTypeBody,
  DeleteEngineTypeParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/engine-types", async (_req, res): Promise<void> => {
  const types = await db.select().from(engineTypesTable).orderBy(engineTypesTable.createdAt);
  res.json(types);
});

router.post("/engine-types", async (req, res): Promise<void> => {
  const parsed = CreateEngineTypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [engineType] = await db.insert(engineTypesTable).values(parsed.data).returning();
  res.status(201).json(engineType);
});

router.patch("/engine-types/:id", async (req, res): Promise<void> => {
  const params = UpdateEngineTypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateEngineTypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.configSchema != null) updateData.configSchema = parsed.data.configSchema;

  const [engineType] = await db
    .update(engineTypesTable)
    .set(updateData)
    .where(eq(engineTypesTable.id, params.data.id))
    .returning();
  if (!engineType) {
    res.status(404).json({ error: "Engine type not found" });
    return;
  }
  res.json(engineType);
});

router.delete("/engine-types/:id", async (req, res): Promise<void> => {
  const params = DeleteEngineTypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(engineTypesTable).where(eq(engineTypesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Engine type not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
