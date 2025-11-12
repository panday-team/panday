import { embed } from "ai";
import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";

import { getEmbeddingModel } from "@/lib/ai-model";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { requireCronAuth } from "@/server/cron-auth";

import { Prisma } from "@prisma/client";
import type { QAPair } from "@prisma/client";

const EMBEDDING_BATCH_SIZE = 25;
const CLUSTER_SAMPLE_SIZE = 200;
const SIMILARITY_THRESHOLD = 0.88;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const embeddingModel = getEmbeddingModel();
  const qasWithoutEmbedding = await db.qAPair.findMany({
    where: { embedding: { equals: Prisma.JsonNull } },
    orderBy: { createdAt: "asc" },
    take: EMBEDDING_BATCH_SIZE,
  });

  for (const qa of qasWithoutEmbedding) {
    try {
      const { embedding } = await embed({
        model: embeddingModel,
        value: `${qa.question}\n\n${qa.answer}`,
      });

      await db.qAPair.update({
        where: { id: qa.id },
        data: { embedding },
      });
    } catch (error) {
      logger.error("Failed to embed Q&A pair", error, { qaPairId: qa.id });
    }
  }

  const candidates = await db.qAPair.findMany({
    where: {
      clusterId: null,
      categoryId: { not: null },
      NOT: { embedding: { equals: Prisma.JsonNull } },
    },
    orderBy: { createdAt: "asc" },
    take: CLUSTER_SAMPLE_SIZE,
  });

  const clusters = buildClusters(candidates);

  for (const cluster of clusters) {
    const clusterId = randomUUID();
    await db.qAPair.updateMany({
      where: { id: { in: cluster.map((qa) => qa.id) } },
      data: { clusterId },
    });
  }

  return Response.json({
    embeddingsGenerated: qasWithoutEmbedding.length,
    clustersCreated: clusters.length,
  });
}

function buildClusters(qas: QAPair[]): QAPair[][] {
  const processed = new Set<string>();
  const clusters: QAPair[][] = [];

  for (const qa of qas) {
    if (processed.has(qa.id)) continue;
    const baseVector = toVector(qa.embedding);
    if (!baseVector) continue;

    const cluster: QAPair[] = [qa];
    processed.add(qa.id);

    for (const candidate of qas) {
      if (processed.has(candidate.id) || candidate.id === qa.id) continue;
      const candidateVector = toVector(candidate.embedding);
      if (!candidateVector || candidateVector.length !== baseVector.length) continue;

      const similarity = cosineSimilarity(baseVector, candidateVector);
      if (similarity >= SIMILARITY_THRESHOLD) {
        cluster.push(candidate);
        processed.add(candidate.id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

function toVector(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  if (value.some((entry) => typeof entry !== "number")) return null;
  return value as number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const valueA = a[i];
    const valueB = b[i];
    if (valueA === undefined || valueB === undefined) continue;

    dot += valueA * valueB;
    magA += valueA * valueA;
    magB += valueB * valueB;
  }

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
