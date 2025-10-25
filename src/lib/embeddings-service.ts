import { OpenAIEmbedding } from "@llamaindex/openai";
import {
  Settings,
  storageContextFromDefaults,
  VectorStoreIndex,
} from "llamaindex";
import path from "path";
import { env } from "@/env";
import { logger } from "@/lib/logger";

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

const DEFAULT_ROADMAP_ID = "electrician-bc";
const EMBEDDINGS_BASE_PATH = path.join(process.cwd(), "src/data/embeddings");

const indexCache = new Map<string, VectorStoreIndex>();

async function loadIndex(roadmapId: string): Promise<VectorStoreIndex> {
  if (indexCache.has(roadmapId)) {
    return indexCache.get(roadmapId)!;
  }

  const indexPath = path.join(EMBEDDINGS_BASE_PATH, roadmapId, "index");

  logger.info("Loading embeddings index", { roadmapId, indexPath });

  const embedModel = new OpenAIEmbedding({
    model: "text-embedding-3-small",
    apiKey: env.OPENAI_API_KEY,
  });
  Settings.embedModel = embedModel;

  const storageContext = await storageContextFromDefaults({
    persistDir: indexPath,
  });

  const index = await VectorStoreIndex.init({
    storageContext,
    nodes: [],
  });

  indexCache.set(roadmapId, index);
  logger.info("Index loaded and cached", { roadmapId });

  return index;
}

export async function queryEmbeddings(
  request: QueryRequest,
): Promise<QueryResponse> {
  const roadmapId = request.roadmap_id ?? DEFAULT_ROADMAP_ID;
  const topK = request.top_k ?? 5;

  logger.info("Querying embeddings", { roadmapId, topK, query: request.query });

  try {
    const index = await loadIndex(roadmapId);

    const retriever = index.asRetriever({ similarityTopK: topK });
    const nodes = await retriever.retrieve({ query: request.query });

    const sources: SourceDocument[] = [];
    const contextParts: string[] = [];

    for (const nodeWithScore of nodes) {
      const node = nodeWithScore.node;
      const metadata = node.metadata;

      const nodeText = "text" in node ? (node.text as string) : "";
      const textSnippet =
        nodeText.length > 200 ? nodeText.substring(0, 200) + "..." : nodeText;

      const source: SourceDocument = {
        node_id: (metadata.node_id as string) ?? "unknown",
        title: (metadata.title as string) ?? "Unknown",
        score: nodeWithScore.score ?? 0,
        text_snippet: textSnippet,
      };

      sources.push(source);
      contextParts.push(`[${source.title}]\n${nodeText}\n`);
    }

    const context = contextParts.join("\n---\n");

    logger.info("Embeddings query completed", {
      roadmapId,
      sourcesFound: sources.length,
    });

    return {
      query: request.query,
      roadmap_id: roadmapId,
      sources,
      context,
    };
  } catch (error) {
    logger.error("Failed to query embeddings", error, { roadmapId });
    throw new Error(
      `Failed to query embeddings: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
