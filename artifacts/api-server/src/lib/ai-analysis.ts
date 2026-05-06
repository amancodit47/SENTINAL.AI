import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";

export interface AnalysisResult {
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number;
  confidenceScore: number;
  entities: Array<{ text: string; type: string; confidence: number }>;
  hasSafetyFlag: boolean;
  safetyReason: string | null;
  hasPiiFlag: boolean;
  piiTypes: string[];
}

const ANALYSIS_PROMPT = `You are a healthcare safety and patient experience analyst. Analyze the following social media post/text.

Return ONLY valid JSON with these fields:
{
  "sentiment": "positive" | "negative" | "neutral",
  "sentimentScore": number between -1.0 (very negative) and 1.0 (very positive),
  "confidenceScore": number between 0.0 and 1.0,
  "entities": [
    { "text": "entity text", "type": "DRUG|CONDITION|SYMPTOM|TREATMENT|ORGANIZATION|PERSON|LOCATION|OTHER", "confidence": 0.0-1.0 }
  ],
  "hasSafetyFlag": boolean (true if adverse event, side effect, safety concern, or harm mentioned),
  "safetyReason": string or null (brief explanation if hasSafetyFlag is true),
  "hasPiiFlag": boolean (true if personally identifiable or protected health info detected),
  "piiTypes": ["NAME"|"EMAIL"|"PHONE"|"ADDRESS"|"SSN"|"DOB"|"MEDICAL_RECORD"|"INSURANCE"|"OTHER"] (empty array if none)
}

Focus on:
- Healthcare adverse events, drug side effects, treatment failures
- Patient safety signals
- Protected health information (PHI/PII)
- Medical entities: drugs, conditions, symptoms, treatments`;

export async function analyzeContent(content: string): Promise<AnalysisResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 1024,
    messages: [
      { role: "system", content: ANALYSIS_PROMPT },
      { role: "user", content: `Analyze this text:\n\n${content.substring(0, 2000)}` },
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw) as AnalysisResult;
    return {
      sentiment: parsed.sentiment ?? "neutral",
      sentimentScore: typeof parsed.sentimentScore === "number" ? parsed.sentimentScore : 0,
      confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0.5,
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      hasSafetyFlag: parsed.hasSafetyFlag === true,
      safetyReason: parsed.safetyReason ?? null,
      hasPiiFlag: parsed.hasPiiFlag === true,
      piiTypes: Array.isArray(parsed.piiTypes) ? parsed.piiTypes : [],
    };
  } catch (err) {
    logger.error({ err, raw }, "Failed to parse AI analysis response");
    return {
      sentiment: "neutral",
      sentimentScore: 0,
      confidenceScore: 0,
      entities: [],
      hasSafetyFlag: false,
      safetyReason: null,
      hasPiiFlag: false,
      piiTypes: [],
    };
  }
}
