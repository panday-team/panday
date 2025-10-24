/**
 * Client for querying the Panday Embeddings API (FastAPI service).
 *
 * This client handles semantic search over LlamaIndex embeddings to retrieve
 * relevant context for RAG (Retrieval Augmented Generation).
 */

import { env } from "@/env";

// Types matching FastAPI response models
export interface SourceDocument {
  node_id: string;
  title: string;
  score: number;
  text_snippet: string;
}

export interface QueryResponse {
  query: string;
  roadmap_id: string;
  sources: SourceDocument[];
  context: string;
}

export interface QueryRequest {
  query: string;
  top_k?: number;
  roadmap_id?: string;
}

export class EmbeddingsClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? env.EMBEDDINGS_API_URL;
  }

  /**
   * Query the embeddings for relevant context.
   *
   * @param request Query parameters
   * @returns Relevant sources and context for RAG
   * @throws Error if the API request fails
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: request.query,
        top_k: request.top_k ?? 5,
        roadmap_id: request.roadmap_id,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Embeddings API query failed (${response.status}): ${error}`,
      );
    }

    return response.json() as Promise<QueryResponse>;
  }

  /**
   * Health check for the embeddings API.
   *
   * @returns Health status and loaded indexes
   */
  async health(): Promise<{ status: string; loaded_indexes: string[] }> {
    const response = await fetch(`${this.baseUrl}/health`);

    if (!response.ok) {
      throw new Error(`Health check failed (${response.status})`);
    }

    return response.json() as Promise<{
      status: string;
      loaded_indexes: string[];
    }>;
  }
}

/**
 * Default embeddings client instance using environment configuration.
 */
export const embeddingsClient = new EmbeddingsClient();
