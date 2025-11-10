import { streamText } from "ai";
import type { NextRequest } from "next/server";

import { getChatModel } from "@/lib/ai-model";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { requireCronAuth } from "@/server/cron-auth";

import type { QAPair } from "@prisma/client";

const CLUSTER_BATCH_SIZE = 10;

type ConsolidatedFAQ = {
  question?: string;
  answer?: string;
  variations?: string[];
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const clusters = await db.qAPair.findMany({
    where: { clusterId: { not: null } },
    distinct: ["clusterId"],
    orderBy: { clusterId: "asc" },
    take: CLUSTER_BATCH_SIZE,
    select: { clusterId: true },
  });

  if (clusters.length === 0) {
    return Response.json({ processed: 0, message: "No clusters available" });
  }

  let processed = 0;

  for (const cluster of clusters) {
    if (!cluster.clusterId) continue;
    const qaPairs = await db.qAPair.findMany({
      where: { clusterId: cluster.clusterId },
      orderBy: { createdAt: "asc" },
    });

    if (qaPairs.length === 0) continue;
    const firstPair = qaPairs[0];
    if (!firstPair?.categoryId) continue;
    const categoryId = firstPair.categoryId;

    try {
      const consolidated = await consolidateCluster(qaPairs);
      if (!consolidated.question || !consolidated.answer) continue;

      const variations =
        consolidated.variations?.filter((entry) => typeof entry === "string" && entry.trim())
          .map((entry) => entry.trim()) ?? [];

      const totalFrequency = qaPairs.reduce((sum, qa) => sum + (qa.frequency ?? 1), 0);
      const isGlobal = qaPairs.length >= 5 || totalFrequency >= 5;

      await db.fAQEntry.upsert({
        where: { id: cluster.clusterId },
        create: {
          id: cluster.clusterId,
          categoryId,
          question: consolidated.question.trim(),
          answer: consolidated.answer.trim(),
          variations,
          sourceQAPairIds: qaPairs.map((qa) => qa.id),
          frequency: totalFrequency,
          isGlobal,
        },
        update: {
          question: consolidated.question.trim(),
          answer: consolidated.answer.trim(),
          variations,
          sourceQAPairIds: qaPairs.map((qa) => qa.id),
          frequency: totalFrequency,
          isGlobal,
        },
      });

      if (isGlobal) {
        await db.qAPair.updateMany({
          where: { id: { in: qaPairs.map((qa) => qa.id) } },
          data: { isGlobal: true },
        });
      }

      processed += 1;
    } catch (error) {
      logger.error("Failed to consolidate FAQ cluster", error, {
        clusterId: cluster.clusterId,
      });
    }
  }

  return Response.json({ processed });
}

async function consolidateCluster(qaPairs: QAPair[]): Promise<ConsolidatedFAQ> {
  const questions = qaPairs.map((qa) => `- ${qa.question}`).join("\n");
  const answers = qaPairs.map((qa) => qa.answer).join("\n\n---\n\n");

  const prompt = `
You are consolidating similar FAQ entries into a single canonical form.

Similar questions:
${questions}

Answers (separated by ---):
${answers}

Produce ONLY valid JSON:
{
  "question": "Canonical concise question",
  "answer": "Comprehensive merged answer",
  "variations": ["variation 1", "variation 2"]
}
`;

  const completion = streamText({
    model: getChatModel(),
    system: "You merge similar FAQs into a single definitive answer.",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.25,
    maxTokens: 1024,
  });

  const response = await completion.text;

  try {
    return JSON.parse(response) as ConsolidatedFAQ;
  } catch (error) {
    logger.error("Failed to parse consolidated FAQ response", error, { response });
    throw error;
  }
}
