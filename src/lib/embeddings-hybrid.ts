import { logger } from "@/lib/logger";
import type { QueryRequest, QueryResponse } from "./embeddings-service";
import * as jsonEmbeddings from "./embeddings-service";
import * as postgresEmbeddings from "./embeddings-postgres";

export type EmbeddingsBackend = "json" | "postgres";

/**
 * Get the configured embeddings backend from environment
 * Defaults to "json" for backward compatibility
 */
function getBackend(): EmbeddingsBackend {
  const backend = process.env.EMBEDDINGS_BACKEND?.toLowerCase();

  if (backend === "postgres") {
    return "postgres";
  }

  if (backend && backend !== "json") {
    logger.warn("Invalid EMBEDDINGS_BACKEND value, defaulting to json", {
      provided: backend,
    });
  }

  return "json";
}

/**
 * Query embeddings using the configured backend (JSON or Postgres)
 *
 * This function routes queries to either the JSON-based or Postgres-based
 * embeddings service based on the EMBEDDINGS_BACKEND environment variable.
 *
 * If Postgres backend fails, it will automatically fall back to JSON.
 *
 * @param request - Query request with query text, roadmap ID, and top_k
 * @returns Query response with sources and context
 */
export async function queryEmbeddings(
  request: QueryRequest,
): Promise<QueryResponse> {
  const backend = getBackend();

  logger.info("Querying embeddings via hybrid router", {
    backend,
    roadmapId: request.roadmap_id,
  });

  // Route to appropriate backend
  if (backend === "postgres") {
    try {
      const response = await postgresEmbeddings.queryEmbeddings(request);
      return response;
    } catch (error) {
      logger.error(
        "Postgres embeddings query failed, falling back to JSON",
        error,
        {
          roadmapId: request.roadmap_id,
        },
      );

      // Fallback to JSON if Postgres fails
      logger.info("Attempting fallback to JSON embeddings", {
        roadmapId: request.roadmap_id,
      });

      try {
        const fallbackResponse = await jsonEmbeddings.queryEmbeddings(request);
        logger.info("Successfully fell back to JSON embeddings", {
          roadmapId: request.roadmap_id,
        });
        return fallbackResponse;
      } catch (fallbackError) {
        logger.error("JSON fallback also failed", fallbackError, {
          roadmapId: request.roadmap_id,
        });
        // Re-throw the original error
        throw error;
      }
    }
  }

  // Default to JSON backend
  return jsonEmbeddings.queryEmbeddings(request);
}

/**
 * Clear embeddings cache for the active backend
 */
export function clearCache(): void {
  const backend = getBackend();

  logger.info("Clearing embeddings cache", { backend });

  if (backend === "postgres") {
    postgresEmbeddings.clearCache();
  }

  // JSON backend doesn't expose clearCache, but we could add it if needed
}

/**
 * Get the currently active backend
 */
export function getActiveBackend(): EmbeddingsBackend {
  return getBackend();
}

// Re-export types for convenience
export type { QueryRequest, QueryResponse, SourceDocument } from "./embeddings-service";
