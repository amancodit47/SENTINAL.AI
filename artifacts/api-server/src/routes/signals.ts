import { Router, type IRouter } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, signalsTable } from "@workspace/db";
import {
  ListSignalsParams,
  ListSignalsQueryParams,
  GetSignalParams,
  GetSignalTimelineParams,
  GetSignalTimelineQueryParams,
  GetSafetyAlertsParams,
  GetSentimentBreakdownParams,
  GetSentimentBreakdownQueryParams,
  GetTopEntitiesParams,
  GetTopEntitiesQueryParams,
  AnalyzeSignalParams,
  AnalyzeProjectBatchParams,
} from "@workspace/api-zod";
import { analyzeContent } from "../lib/ai-analysis";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function formatSignal(s: typeof signalsTable.$inferSelect) {
  return {
    ...s,
    entities: s.entities ?? [],
    piiTypes: s.piiTypes ?? [],
    matchedKeywords: s.matchedKeywords ?? [],
  };
}

router.get("/projects/:projectId/signals", async (req, res): Promise<void> => {
  const params = ListSignalsParams.safeParse(req.params);
  const query = ListSignalsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  const { projectId } = params.data;
  const { sourceType, sentiment, hasSafetyFlag, limit = 50, offset = 0 } = query.data;

  const conditions = [eq(signalsTable.projectId, projectId)];
  if (sourceType) conditions.push(eq(signalsTable.sourceType, sourceType));
  if (sentiment) conditions.push(eq(signalsTable.sentiment, sentiment));
  if (hasSafetyFlag === "true") conditions.push(eq(signalsTable.hasSafetyFlag, true));

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0]!;

  const [signals, countResult] = await Promise.all([
    db.select().from(signalsTable).where(whereClause).orderBy(desc(signalsTable.createdAt)).limit(limit ?? 50).offset(offset ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(signalsTable).where(whereClause),
  ]);

  res.json({
    signals: signals.map(formatSignal),
    total: countResult[0]?.count ?? 0,
    limit: limit ?? 50,
    offset: offset ?? 0,
  });
});

router.get("/signals/:id", async (req, res): Promise<void> => {
  const params = GetSignalParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [signal] = await db.select().from(signalsTable).where(eq(signalsTable.id, params.data.id));
  if (!signal) { res.status(404).json({ error: "Signal not found" }); return; }
  res.json(formatSignal(signal));
});

router.get("/projects/:projectId/signals/timeline", async (req, res): Promise<void> => {
  const params = GetSignalTimelineParams.safeParse(req.params);
  const query = GetSignalTimelineQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const { projectId } = params.data;
  const days = query.data?.days ?? 30;

  const rows = await db.execute(sql`
    SELECT
      date_trunc('day', created_at)::date as date,
      count(*) as total,
      count(*) filter (where sentiment = 'positive') as positive,
      count(*) filter (where sentiment = 'negative') as negative,
      count(*) filter (where sentiment = 'neutral') as neutral,
      count(*) filter (where has_safety_flag = true) as safety_alerts
    FROM signals
    WHERE project_id = ${projectId}
      AND created_at >= now() - interval '1 day' * ${days}
    GROUP BY date_trunc('day', created_at)::date
    ORDER BY date
  `);

  const rowArr: Array<Record<string, unknown>> = Array.isArray(rows) ? rows : (rows as { rows: Array<Record<string, unknown>> }).rows ?? [];
  res.json(
    rowArr.map((r) => ({
      date: String(r["date"]),
      total: Number(r["total"]),
      positive: Number(r["positive"]),
      negative: Number(r["negative"]),
      neutral: Number(r["neutral"]),
      safetyAlerts: Number(r["safety_alerts"]),
    }))
  );
});

router.get("/projects/:projectId/signals/safety-alerts", async (req, res): Promise<void> => {
  const params = GetSafetyAlertsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const signals = await db
    .select()
    .from(signalsTable)
    .where(and(eq(signalsTable.projectId, params.data.projectId), eq(signalsTable.hasSafetyFlag, true)))
    .orderBy(desc(signalsTable.createdAt))
    .limit(50);
  res.json(signals.map(formatSignal));
});

router.get("/projects/:projectId/signals/sentiment-breakdown", async (req, res): Promise<void> => {
  const params = GetSentimentBreakdownParams.safeParse(req.params);
  const query = GetSentimentBreakdownQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const { projectId } = params.data;
  const days = query.data?.days ?? 30;

  const rows = await db.execute(sql`
    SELECT
      count(*) filter (where sentiment = 'positive') as positive,
      count(*) filter (where sentiment = 'negative') as negative,
      count(*) filter (where sentiment = 'neutral') as neutral,
      count(*) filter (where sentiment IS NULL) as unanalyzed,
      avg(sentiment_score) as avg_score
    FROM signals
    WHERE project_id = ${projectId}
      AND created_at >= now() - interval '1 day' * ${days}
  `);

  const rowArr2: Array<Record<string, unknown>> = Array.isArray(rows) ? rows : (rows as { rows: Array<Record<string, unknown>> }).rows ?? [];
  const row = rowArr2[0] ?? {};
  res.json({
    positive: Number(row["positive"] ?? 0),
    negative: Number(row["negative"] ?? 0),
    neutral: Number(row["neutral"] ?? 0),
    unanalyzed: Number(row["unanalyzed"] ?? 0),
    avgScore: row["avg_score"] != null ? Number(row["avg_score"]) : null,
  });
});

router.get("/projects/:projectId/signals/top-entities", async (req, res): Promise<void> => {
  const params = GetTopEntitiesParams.safeParse(req.params);
  const query = GetTopEntitiesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const { projectId } = params.data;
  const limit = query.data?.limit ?? 20;

  const rows = await db.execute(sql`
    SELECT
      entity->>'text' as text,
      entity->>'type' as type,
      count(*) as count
    FROM signals,
    jsonb_array_elements(entities) as entity
    WHERE project_id = ${projectId}
      AND entities != '[]'::jsonb
    GROUP BY entity->>'text', entity->>'type'
    ORDER BY count DESC
    LIMIT ${limit}
  `);

  const rowArr3: Array<Record<string, unknown>> = Array.isArray(rows) ? rows : (rows as { rows: Array<Record<string, unknown>> }).rows ?? [];
  res.json(
    rowArr3.map((r) => ({
      text: String(r["text"]),
      type: String(r["type"]),
      count: Number(r["count"]),
    }))
  );
});

// ─── Analysis ────────────────────────────────────────────────────────────────

router.post("/signals/:id/analyze", async (req, res): Promise<void> => {
  const params = AnalyzeSignalParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [signal] = await db.select().from(signalsTable).where(eq(signalsTable.id, params.data.id));
  if (!signal) { res.status(404).json({ error: "Signal not found" }); return; }

  try {
    const analysis = await analyzeContent(signal.content);
    const [updated] = await db
      .update(signalsTable)
      .set({
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        confidenceScore: analysis.confidenceScore,
        entities: analysis.entities,
        hasSafetyFlag: analysis.hasSafetyFlag,
        safetyReason: analysis.safetyReason,
        hasPiiFlag: analysis.hasPiiFlag,
        piiTypes: analysis.piiTypes,
        isAnalyzed: true,
      })
      .where(eq(signalsTable.id, params.data.id))
      .returning();
    res.json(formatSignal(updated!));
  } catch (err) {
    logger.error({ err, signalId: params.data.id }, "AI analysis failed");
    res.status(500).json({ error: "Analysis failed" });
  }
});

router.post("/projects/:projectId/analyze-batch", async (req, res): Promise<void> => {
  const params = AnalyzeProjectBatchParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const unanalyzed = await db
    .select()
    .from(signalsTable)
    .where(and(eq(signalsTable.projectId, params.data.projectId), eq(signalsTable.isAnalyzed, false)))
    .limit(20);

  let analyzed = 0;
  let errors = 0;

  for (const signal of unanalyzed) {
    try {
      const analysis = await analyzeContent(signal.content);
      await db.update(signalsTable).set({
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        confidenceScore: analysis.confidenceScore,
        entities: analysis.entities,
        hasSafetyFlag: analysis.hasSafetyFlag,
        safetyReason: analysis.safetyReason,
        hasPiiFlag: analysis.hasPiiFlag,
        piiTypes: analysis.piiTypes,
        isAnalyzed: true,
      }).where(eq(signalsTable.id, signal.id));
      analyzed++;
    } catch (err) {
      logger.error({ err, signalId: signal.id }, "Batch analysis error");
      errors++;
    }
  }

  res.json({ analyzed, errors, message: `Analyzed ${analyzed} signals, ${errors} errors` });
});

export default router;
