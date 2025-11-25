import { OpenAIEmbedding } from "@llamaindex/openai";
import {
  Settings,
  storageContextFromDefaults,
  VectorStoreIndex,
} from "llamaindex";
import path from "path";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { APP_CONFIG } from "@/config/app-config";
import { generateNodeUrl, extractNodeInfo } from "./url-utils";

export interface SourceDocument {
  node_id: string;
  title: string;
  score: number;
  /** Full text chunk from the source (for hover preview) */
  text_snippet: string;
  /** Short excerpt for inline display (50-100 chars) */
  excerpt?: string;
  /** Section heading within the document */
  section_heading?: string;
  /** Position/chunk index for deep linking */
  chunk_index?: number;
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

const DEFAULT_ROADMAP_ID = APP_CONFIG.embeddings.defaultRoadmapId;
const EMBEDDINGS_BASE_PATH = path.join(process.cwd(), "src/data/embeddings");

const INDEX_CACHE_TTL_MS = APP_CONFIG.embeddings.indexCacheTtl;

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

/**
 * Extract a short excerpt from text, preferring to start at a sentence boundary
 */
function extractExcerpt(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;

  // Try to find a good break point (sentence end, comma, or space)
  const trimmed = text.substring(0, maxLength);
  const lastSentence = trimmed.lastIndexOf(". ");
  const lastComma = trimmed.lastIndexOf(", ");
  const lastSpace = trimmed.lastIndexOf(" ");

  let breakPoint = maxLength;
  if (lastSentence > maxLength * 0.5) {
    breakPoint = lastSentence + 1;
  } else if (lastComma > maxLength * 0.6) {
    breakPoint = lastComma + 1;
  } else if (lastSpace > maxLength * 0.7) {
    breakPoint = lastSpace;
  }

  return text.substring(0, breakPoint).trim() + "...";
}

/**
 * Extract section heading from text (first markdown heading or first line)
 */
function extractSectionHeading(text: string): string | undefined {
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    // Look for markdown headings
    if (trimmed.startsWith("#")) {
      return trimmed.replace(/^#+\s*/, "");
    }
    // Or return first non-empty line as fallback
    if (trimmed.length > 0 && trimmed.length < 100) {
      return trimmed;
    }
  }
  return undefined;
}

function buildSourceDocument(
  nodeWithScore: {
    node: { metadata: Record<string, unknown>; text?: string };
    score?: number;
  },
  roadmapId: string,
  chunkIndex?: number,
): SourceDocument {
  const node = nodeWithScore.node;
  const metadata = node.metadata;
  const nodeText = ("text" in node ? node.text : "") ?? "";

  // Keep full text for preview (up to 500 chars), but also create a short excerpt
  const textSnippet =
    nodeText.length > 500 ? nodeText.substring(0, 500) + "..." : nodeText;
  const excerpt = extractExcerpt(nodeText, 100);
  const sectionHeading = extractSectionHeading(nodeText);

  // Extract node information for URL generation
  const nodeInfo = extractNodeInfo(metadata);

  // Generate URL based on file type
  let url: string | undefined;
  const fileName = metadata.file_name as string | undefined;
  const fileType = metadata.file_type as string | undefined;

  if (fileName && fileType === "pdf") {
    // Link to PDF in embeddings directory
    url = `/embeddings/${roadmapId}/${fileName}`;
  } else if (fileName && fileType === "markdown") {
    // Link to roadmap node for markdown files
    url = generateNodeUrl({
      roadmapId,
      nodeId: nodeInfo.nodeId,
      nodeType: nodeInfo.nodeType,
    });
  }

  return {
    node_id: nodeInfo.nodeId,
    title: nodeInfo.title ?? "Unknown",
    score: nodeWithScore.score ?? 0,
    text_snippet: textSnippet,
    excerpt,
    section_heading: sectionHeading,
    chunk_index: chunkIndex,
    url,
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

  for (let i = 0; i < nodes.length; i++) {
    const nodeWithScore = nodes[i];
    if (!nodeWithScore) continue;

    const source = buildSourceDocument(nodeWithScore, roadmapId, i);
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
