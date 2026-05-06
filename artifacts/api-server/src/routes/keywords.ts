import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, keywordsTable } from "@workspace/db";
import {
  ListKeywordsParams,
  CreateKeywordParams,
  CreateKeywordBody,
  DeleteKeywordParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects/:projectId/keywords", async (req, res): Promise<void> => {
  const params = ListKeywordsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const keywords = await db
    .select()
    .from(keywordsTable)
    .where(eq(keywordsTable.projectId, params.data.projectId));
  res.json(keywords);
});

router.post("/projects/:projectId/keywords", async (req, res): Promise<void> => {
  const params = CreateKeywordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateKeywordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [keyword] = await db
    .insert(keywordsTable)
    .values({ projectId: params.data.projectId, term: parsed.data.term })
    .returning();
  res.status(201).json(keyword);
});

router.delete("/projects/:projectId/keywords/:id", async (req, res): Promise<void> => {
  const params = DeleteKeywordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(keywordsTable)
    .where(
      and(
        eq(keywordsTable.id, params.data.id),
        eq(keywordsTable.projectId, params.data.projectId)
      )
    )
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Keyword not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
