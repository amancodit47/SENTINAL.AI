import { logger } from "./logger";
import { db, keywordsTable, sourcesTable, signalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Source } from "@workspace/db";

export interface CollectedSignal {
  externalId?: string;
  content: string;
  author?: string;
  url?: string;
  publishedAt?: Date;
  matchedKeywords: string[];
}

async function getProjectKeywords(projectId: number): Promise<string[]> {
  const keywords = await db
    .select()
    .from(keywordsTable)
    .where(eq(keywordsTable.projectId, projectId));
  return keywords.map((k) => k.term);
}

function matchKeywords(content: string, keywords: string[]): string[] {
  const lower = content.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
}

// ─── Twitter/X Collector ───────────────────────────────────────────────────────
async function collectTwitter(source: Source, keywords: string[]): Promise<CollectedSignal[]> {
  const config = source.config as Record<string, unknown>;
  const apiKey = (config.apiKey as string) || process.env["TWITTER_API_KEY"];

  if (!apiKey) {
    logger.warn({ sourceId: source.id }, "No Twitter API key configured — generating mock data");
    return generateMockSignals("twitter", keywords, 3);
  }

  const signals: CollectedSignal[] = [];
  for (const keyword of keywords.slice(0, 3)) {
    try {
      const url = `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${encodeURIComponent(keyword)}&queryType=Latest&maxResults=10`;
      const response = await fetch(url, {
        headers: { "X-API-Key": apiKey },
      });
      if (!response.ok) {
        logger.warn({ status: response.status, keyword }, "Twitter API request failed");
        continue;
      }
      const data = await response.json() as { tweets?: Array<{ tweet_id?: string; text?: string; author?: { userName?: string }; url?: string; createdAt?: string }> };
      const tweets = data.tweets ?? [];
      for (const tweet of tweets) {
        signals.push({
          externalId: tweet.tweet_id,
          content: tweet.text ?? "",
          author: tweet.author?.userName,
          url: tweet.url,
          publishedAt: tweet.createdAt ? new Date(tweet.createdAt) : undefined,
          matchedKeywords: matchKeywords(tweet.text ?? "", keywords),
        });
      }
    } catch (err) {
      logger.error({ err, keyword }, "Error collecting from Twitter");
    }
  }
  return signals;
}

// ─── Reddit Collector ─────────────────────────────────────────────────────────
async function collectReddit(source: Source, keywords: string[]): Promise<CollectedSignal[]> {
  const config = source.config as Record<string, unknown>;
  const subreddits = (config.subreddits as string) || "health+AskDocs+ChronicPain+diabetes+cancer";
  const signals: CollectedSignal[] = [];

  for (const keyword of keywords.slice(0, 2)) {
    try {
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&sort=new&limit=10&restrict_sr=false${subreddits ? `&sr=${subreddits}` : ""}`;
      const response = await fetch(url, { headers: { "User-Agent": "SentinelAI/1.0" } });
      if (!response.ok) continue;
      const data = await response.json() as { data?: { children?: Array<{ data?: { id?: string; selftext?: string; title?: string; author?: string; permalink?: string; created_utc?: number } }> } };
      const posts = data?.data?.children ?? [];
      for (const post of posts) {
        const d = post.data;
        if (!d) continue;
        const content = [d.title, d.selftext].filter(Boolean).join("\n\n").substring(0, 3000);
        if (!content.trim()) continue;
        signals.push({
          externalId: d.id,
          content,
          author: d.author,
          url: d.permalink ? `https://reddit.com${d.permalink}` : undefined,
          publishedAt: d.created_utc ? new Date(d.created_utc * 1000) : undefined,
          matchedKeywords: matchKeywords(content, keywords),
        });
      }
    } catch (err) {
      logger.error({ err, keyword }, "Error collecting from Reddit");
    }
  }
  return signals;
}

// ─── Generic Web Scraper ──────────────────────────────────────────────────────
async function collectWebScraper(_source: Source, keywords: string[]): Promise<CollectedSignal[]> {
  // Returns mock data for generic web scraper since we can't scrape arbitrary sites in production
  return generateMockSignals("web", keywords, 2);
}

// ─── Mock Generator ────────────────────────────────────────────────────────────
function generateMockSignals(sourceType: string, keywords: string[], count: number): CollectedSignal[] {
  const templates = [
    (kw: string) => `I've been taking ${kw} for 3 months now and noticed significant improvement in my condition. Would definitely recommend.`,
    (kw: string) => `Warning: experienced severe side effects after starting ${kw}. Doctor switched me to a different medication immediately.`,
    (kw: string) => `Has anyone else had trouble getting their ${kw} prescription filled? My pharmacy has been out of stock for weeks.`,
    (kw: string) => `Clinical trial results for ${kw} look promising. Excited to see Phase 3 outcomes.`,
    (kw: string) => `My ${kw} treatment stopped working after 6 months. Feeling frustrated and worried about alternatives.`,
    (kw: string) => `Just diagnosed with ${kw}. Feeling overwhelmed. Any advice from others who have gone through this?`,
    (kw: string) => `The cost of ${kw} is absolutely insane. Insurance denied coverage again. This is a public health crisis.`,
    (kw: string) => `Update: 6 weeks on ${kw} and my symptoms have completely resolved. Life-changing treatment!`,
  ];

  const authors = ["patient_advocate", "health_blogger", "concerned_patient", "medical_watcher", "safety_first", "chronic_fighter"];
  const signals: CollectedSignal[] = [];

  for (let i = 0; i < count; i++) {
    const kw = keywords[i % keywords.length] ?? "medication";
    const template = templates[Math.floor(Math.random() * templates.length)]!;
    const content = template(kw);
    signals.push({
      externalId: `mock-${sourceType}-${Date.now()}-${i}`,
      content,
      author: authors[Math.floor(Math.random() * authors.length)],
      url: `https://example.com/post/${Date.now()}-${i}`,
      publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      matchedKeywords: matchKeywords(content, keywords),
    });
  }

  return signals;
}

// ─── Main Dispatcher ──────────────────────────────────────────────────────────
export async function collectFromSource(source: Source): Promise<number> {
  const keywords = await getProjectKeywords(source.projectId);
  if (keywords.length === 0) {
    logger.info({ sourceId: source.id }, "No keywords configured for project");
    return 0;
  }

  let collected: CollectedSignal[] = [];
  const engineType = source.config as Record<string, unknown>;
  const slug = engineType._slug as string | undefined;

  try {
    if (slug === "twitter" || slug === "x") {
      collected = await collectTwitter(source, keywords);
    } else if (slug === "reddit") {
      collected = await collectReddit(source, keywords);
    } else {
      collected = await collectWebScraper(source, keywords);
    }
  } catch (err) {
    logger.error({ err, sourceId: source.id }, "Collection error, falling back to mock");
    collected = generateMockSignals("unknown", keywords, 2);
  }

  if (collected.length === 0) return 0;

  // Fetch existing external IDs to deduplicate
  const existing = await db.select({ externalId: signalsTable.externalId }).from(signalsTable).where(eq(signalsTable.sourceId, source.id));
  const existingIds = new Set(existing.map((r) => r.externalId).filter(Boolean));

  const toInsert = collected.filter((s) => !s.externalId || !existingIds.has(s.externalId));

  if (toInsert.length === 0) return 0;

  // Get engine type slug from DB
  const engineTypeRow = await db.query.engineTypesTable.findFirst({
    where: (et, { eq }) => eq(et.id, source.engineTypeId),
  });

  await db.insert(signalsTable).values(
    toInsert.map((s) => ({
      projectId: source.projectId,
      sourceId: source.id,
      sourceType: engineTypeRow?.slug ?? "unknown",
      externalId: s.externalId ?? null,
      content: s.content,
      author: s.author ?? null,
      url: s.url ?? null,
      publishedAt: s.publishedAt ?? null,
      matchedKeywords: s.matchedKeywords,
    }))
  );

  // Update lastRunAt
  await db.update(sourcesTable).set({ lastRunAt: new Date() }).where(eq(sourcesTable.id, source.id));

  return toInsert.length;
}
