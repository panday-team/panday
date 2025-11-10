import { OpenAI } from "openai";
import { db as prisma } from "@/server/db";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import type {
  QueryRequest,
  QueryResponse,
  SourceDocument,
} from "./embeddings-service";
import { generateNodeUrl, extractNodeInfo } from "./url-utils";

const DEFAULT_ROADMAP_ID = "electrician-bc";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedQueryResult {
  response: QueryResponse;
  timestamp: number;
}

// Simple in-memory cache for query results
const queryCache = new Map<string, CachedQueryResult>();

/**
 * Generate an embedding vector for a query using OpenAI
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });

  logger.info("Generating query embedding", { queryLength: query.length });

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
    encoding_format: "float",
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding) {
    throw new Error("Failed to generate embedding: No embedding returned");
  }

  logger.info("Query embedding generated", { dimensions: embedding.length });
  return embedding;
}

/**
 * Perform vector similarity search using pgvector
 */
async function searchSimilarDocuments(
  roadmapId: string,
  queryEmbedding: number[],
  topK: number,
  userId?: string,
): Promise<
  Array<{
    id: string;
    nodeId: string | null;
    content: string;
    metadata: Record<string, unknown>;
    distance: number;
  }>
> {
  logger.info("Searching similar documents", { roadmapId, topK, userId });

  // Get the active index ID for this roadmap/user
  const activeIndex = await prisma.embeddingIndex.findFirst({
    where: {
      roadmapId,
      userId: userId ?? null,
      isActive: true,
    },
    select: {
      id: true,
      documentCount: true,
    },
  });

  if (!activeIndex) {
    throw new Error(
      `No active embedding index found for roadmap: ${roadmapId}${userId ? ` user: ${userId}` : ""}`,
    );
  }

  logger.info("Found active index", {
    indexId: activeIndex.id,
    documentCount: activeIndex.documentCount,
  });

  // Convert embedding to pgvector format string
  const embeddingString = `[${queryEmbedding.join(",")}]`;

  // Perform vector similarity search using raw SQL with pgvector
  // Using <=> operator for cosine distance (lower is more similar)
  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      nodeId: string | null;
      content: string;
      metadata: unknown;
      distance: number;
    }>
  >`
    SELECT
      id,
      "nodeId",
      content,
      metadata,
      embedding <=> ${embeddingString}::vector as distance
    FROM embedding_documents
    WHERE "indexId" = ${activeIndex.id}
    ORDER BY embedding <=> ${embeddingString}::vector
    LIMIT ${topK}
  `;

  logger.info("Vector search completed", { resultsFound: results.length });

  return results.map(
    (row: {
      id: string;
      nodeId: string | null;
      content: string;
      metadata: unknown;
      distance: number;
    }) => ({
      ...row,
      nodeId: row.nodeId,
      metadata:
        typeof row.metadata === "object" && row.metadata !== null
          ? (row.metadata as Record<string, unknown>)
          : {},
    }),
  );
}

/**
 * Build source document from search result
 */
function buildSourceDocument(
  result: {
    nodeId: string | null;
    content: string;
    metadata: Record<string, unknown>;
    distance: number;
  },
  index: number,
  roadmapId: string,
): SourceDocument {
  const textSnippet =
    result.content.length > 200
      ? result.content.substring(0, 200) + "..."
      : result.content;

  // Convert distance to similarity score (1 - distance)
  // Cosine distance is in range [0, 2], where 0 is most similar
  // We normalize to [0, 1] where 1 is most similar
  const score = Math.max(0, 1 - result.distance / 2);

  // Extract node information for URL generation
  const nodeInfo = extractNodeInfo(result.metadata);
  const nodeId = result.nodeId ?? nodeInfo.nodeId ?? `unknown-${index}`;

  return {
    node_id: nodeId,
    title: nodeInfo.title ?? "Unknown",
    score,
    text_snippet: textSnippet,
    url: generateNodeUrl({
      roadmapId,
      nodeId,
      nodeType: nodeInfo.nodeType,
    }),
    node_type: nodeInfo.nodeType,
    roadmap_id: roadmapId,
  };
}

/**
 * Generate cache key for query results
 */
function getCacheKey(
  roadmapId: string,
  query: string,
  topK: number,
  userId?: string,
): string {
  return `${roadmapId}:${userId ?? "global"}:${topK}:${query}`;
}

/**
 * Query embeddings from Postgres using pgvector similarity search
 *
 * This is a drop-in replacement for the JSON-based queryEmbeddings function
 */
export async function queryEmbeddings(
  request: QueryRequest,
): Promise<QueryResponse> {
  const roadmapId = request.roadmap_id ?? DEFAULT_ROADMAP_ID;
  const topK = request.top_k ?? 5;
  const userId = undefined; // TODO: Add userId support from request when implementing multi-tenant

  logger.info("Querying embeddings from Postgres", {
    roadmapId,
    topK,
    query: request.query,
    backend: "postgres",
  });

  // Check cache first
  const cacheKey = getCacheKey(roadmapId, request.query, topK, userId);
  const cached = queryCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    logger.info("Returning cached query result", { roadmapId });
    return cached.response;
  }

  try {
    // Step 1: Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(request.query);

    // Step 2: Search for similar documents using pgvector
    const results = await searchSimilarDocuments(
      roadmapId,
      queryEmbedding,
      topK,
      userId,
    );

    // Step 3: Build response
    const sources: SourceDocument[] = [];
    const contextParts: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i]!;
      const source = buildSourceDocument(result, i, roadmapId);

      sources.push(source);
      contextParts.push(`[${source.title}]\n${result.content}\n`);
    }

    const context = contextParts.join("\n---\n");

    const response: QueryResponse = {
      query: request.query,
      roadmap_id: roadmapId,
      sources,
      context,
    };

    // Cache the result
    queryCache.set(cacheKey, { response, timestamp: now });

    logger.info("Embeddings query completed", {
      roadmapId,
      sourcesFound: sources.length,
      backend: "postgres",
    });

    return response;
  } catch (error) {
    logger.error("Failed to query Postgres embeddings", error, { roadmapId });
    throw new Error(
      `Failed to query Postgres embeddings: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Clear the query cache (useful for testing or when index is updated)
 */
export function clearCache(): void {
  queryCache.clear();
  logger.info("Postgres embeddings cache cleared");
}
