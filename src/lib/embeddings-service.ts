import { OpenAIEmbedding } from "@llamaindex/openai";
import {
  Settings,
  storageContextFromDefaults,
  VectorStoreIndex,
} from "llamaindex";
import path from "path";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { generateNodeUrl, extractNodeInfo } from "./url-utils";

export interface SourceDocument {
  node_id: string;
  title: string;
  score: number;
  text_snippet: string;
  url?: string;
  node_type?: string;
  roadmap_id?: string;
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

const INDEX_CACHE_TTL_MS = 60 * 60 * 1000;

interface CachedIndex {
  index: VectorStoreIndex;
  timestamp: number;
}

const indexCache = new Map<string, CachedIndex>();

async function loadIndex(roadmapId: string): Promise<VectorStoreIndex> {
  const cached = indexCache.get(roadmapId);
  const now = Date.now();

  if (cached && now - cached.timestamp < INDEX_CACHE_TTL_MS) {
    return cached.index;
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

  indexCache.set(roadmapId, { index, timestamp: now });
  logger.info("Index loaded and cached", { roadmapId });

  return index;
}

function buildSourceDocument(
  nodeWithScore: {
    node: { metadata: Record<string, unknown>; text?: string };
    score?: number;
  },
  roadmapId: string,
): SourceDocument {
  const node = nodeWithScore.node;
  const metadata = node.metadata;
  const nodeText = ("text" in node ? node.text : "")!;
  const textSnippet =
    nodeText.length > 200 ? nodeText.substring(0, 200) + "..." : nodeText;

  // Extract node information for URL generation
  const nodeInfo = extractNodeInfo(metadata);

  return {
    node_id: nodeInfo.nodeId,
    title: nodeInfo.title ?? "Unknown",
    score: nodeWithScore.score ?? 0,
    text_snippet: textSnippet,
    url: generateNodeUrl({
      roadmapId,
      nodeId: nodeInfo.nodeId,
      nodeType: nodeInfo.nodeType,
    }),
    node_type: nodeInfo.nodeType,
    roadmap_id: roadmapId,
  };
}

export async function queryEmbeddings(
  request: QueryRequest,
): Promise<QueryResponse> {
  const roadmapId = request.roadmap_id ?? DEFAULT_ROADMAP_ID;
  const topK = request.top_k ?? 5;

  logger.info("Querying embeddings", { roadmapId, topK, query: request.query });

  const index = await loadIndex(roadmapId).catch((error) => {
    logger.error("Failed to load embeddings index", error, { roadmapId });
    throw new Error(
      `Failed to load embeddings index: ${error instanceof Error ? error.message : String(error)}`,
    );
  });

  const retriever = index.asRetriever({ similarityTopK: topK });
  const nodes = await retriever
    .retrieve({ query: request.query })
    .catch((error) => {
      logger.error("Failed to retrieve embeddings", error, { roadmapId });
      throw new Error(
        `Failed to retrieve embeddings: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

  const sources: SourceDocument[] = [];
  const contextParts: string[] = [];

  for (const nodeWithScore of nodes) {
    const source = buildSourceDocument(nodeWithScore, roadmapId);
    const nodeText =
      "text" in nodeWithScore.node ? (nodeWithScore.node.text as string) : "";

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
}
