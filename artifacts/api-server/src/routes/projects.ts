import { Router, type IRouter } from "express";
import { eq, and, count, sql } from "drizzle-orm";
import { db, projectsTable, keywordsTable, sourcesTable, signalsTable } from "@workspace/db";
import {
  CreateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  UpdateProjectBody,
  DeleteProjectParams,
  GetProjectSummaryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects", async (req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);

  const result = await Promise.all(
    projects.map(async (project) => {
      const [totalRow] = await db
        .select({ count: count() })
        .from(signalsTable)
        .where(eq(signalsTable.projectId, project.id));
      const [safetyRow] = await db
        .select({ count: count() })
        .from(signalsTable)
        .where(and(eq(signalsTable.projectId, project.id), eq(signalsTable.hasSafetyFlag, true)));
      return {
        ...project,
        totalSignals: totalRow?.count ?? 0,
        safetyAlerts: safetyRow?.count ?? 0,
      };
    })
  );

  res.json(result);
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db.insert(projectsTable).values(parsed.data).returning();
  res.status(201).json({ ...project, totalSignals: 0, safetyAlerts: 0 });
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [totalRow] = await db.select({ count: count() }).from(signalsTable).where(eq(signalsTable.projectId, project.id));
  const [safetyRow] = await db.select({ count: count() }).from(signalsTable).where(and(eq(signalsTable.projectId, project.id), eq(signalsTable.hasSafetyFlag, true)));
  res.json({ ...project, totalSignals: totalRow?.count ?? 0, safetyAlerts: safetyRow?.count ?? 0 });
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.status != null) updateData.status = parsed.data.status;

  const [project] = await db.update(projectsTable).set(updateData).where(eq(projectsTable.id, params.data.id)).returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [totalRow] = await db.select({ count: count() }).from(signalsTable).where(eq(signalsTable.projectId, project.id));
  const [safetyRow] = await db.select({ count: count() }).from(signalsTable).where(and(eq(signalsTable.projectId, project.id), eq(signalsTable.hasSafetyFlag, true)));
  res.json({ ...project, totalSignals: totalRow?.count ?? 0, safetyAlerts: safetyRow?.count ?? 0 });
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/projects/:id/summary", async (req, res): Promise<void> => {
  const params = GetProjectSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { id } = params.data;

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [totalRow] = await db.select({ count: count() }).from(signalsTable).where(eq(signalsTable.projectId, id));
  const [safetyRow] = await db.select({ count: count() }).from(signalsTable).where(and(eq(signalsTable.projectId, id), eq(signalsTable.hasSafetyFlag, true)));
  const [piiRow] = await db.select({ count: count() }).from(signalsTable).where(and(eq(signalsTable.projectId, id), eq(signalsTable.hasPiiFlag, true)));
  const [posRow] = await db.select({ count: count() }).from(signalsTable).where(and(eq(signalsTable.projectId, id), eq(signalsTable.sentiment, "positive")));
  const [negRow] = await db.select({ count: count() }).from(signalsTable).where(and(eq(signalsTable.projectId, id), eq(signalsTable.sentiment, "negative")));
  const [neuRow] = await db.select({ count: count() }).from(signalsTable).where(and(eq(signalsTable.projectId, id), eq(signalsTable.sentiment, "neutral")));

  const sourceCounts = await db
    .select({ sourceType: signalsTable.sourceType, count: count() })
    .from(signalsTable)
    .where(eq(signalsTable.projectId, id))
    .groupBy(signalsTable.sourceType);

  const recentSignals = await db
    .select()
    .from(signalsTable)
    .where(eq(signalsTable.projectId, id))
    .orderBy(sql`${signalsTable.createdAt} DESC`)
    .limit(5);

  res.json({
    projectId: id,
    totalSignals: totalRow?.count ?? 0,
    safetyAlerts: safetyRow?.count ?? 0,
    piiFlags: piiRow?.count ?? 0,
    positiveCount: posRow?.count ?? 0,
    negativeCount: negRow?.count ?? 0,
    neutralCount: neuRow?.count ?? 0,
    sourceCounts: sourceCounts.map((r) => ({ sourceType: r.sourceType, count: r.count })),
    recentSignals: recentSignals.map((s) => ({
      ...s,
      entities: s.entities ?? [],
      piiTypes: s.piiTypes ?? [],
      matchedKeywords: s.matchedKeywords ?? [],
    })),
  });
});

export default router;
