import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import type {
  RoadmapMetadata,
  RoadmapGraph,
  NodeContent,
  NodeContentFrontmatter,
  Roadmap,
} from "@/data/types/roadmap";

/**
 * Base path for roadmap data directory
 */
const ROADMAPS_BASE_PATH = path.join(process.cwd(), "src/data/roadmaps");

/**
 * Load roadmap metadata from metadata.json
 */
export async function loadRoadmapMetadata(
  roadmapId: string,
): Promise<RoadmapMetadata> {
  const metadataPath = path.join(
    ROADMAPS_BASE_PATH,
    roadmapId,
    "metadata.json",
  );

  try {
    const fileContents = await fs.readFile(metadataPath, "utf-8");
    const metadata = JSON.parse(fileContents) as RoadmapMetadata;
    return metadata;
  } catch (error) {
    throw new Error(
      `Failed to load metadata for roadmap "${roadmapId}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Load roadmap graph structure from graph.json
 */
export async function loadRoadmapGraph(
  roadmapId: string,
): Promise<RoadmapGraph> {
  const graphPath = path.join(ROADMAPS_BASE_PATH, roadmapId, "graph.json");

  try {
    const fileContents = await fs.readFile(graphPath, "utf-8");
    const graph = JSON.parse(fileContents) as RoadmapGraph;
    return graph;
  } catch (error) {
    throw new Error(
      `Failed to load graph for roadmap "${roadmapId}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Parse markdown content sections into structured data
 */
function parseMarkdownSections(content: string): {
  eligibility?: string[];
  benefits?: string[];
  outcomes?: string[];
  resources?: Array<{ label: string; href: string }>;
} {
  const sections: {
    eligibility?: string[];
    benefits?: string[];
    outcomes?: string[];
    resources?: Array<{ label: string; href: string }>;
  } = {};

  // Extract Eligibility section
  const eligibilityRegex = /##\s+Eligibility\s*\n([\s\S]*?)(?=\n##|\n---|$)/i;
  const eligibilityMatch = eligibilityRegex.exec(content);
  if (eligibilityMatch?.[1]) {
    sections.eligibility = eligibilityMatch[1]
      .split("\n")
      .filter(
        (line) => line.trim().startsWith("-") || line.trim().startsWith("*"),
      )
      .map((line) => line.replace(/^[-*]\s+/, "").trim())
      .filter((line) => line && !line.includes("TODO"));
  }

  // Extract Benefits section
  const benefitsRegex = /##\s+Benefits\s*\n([\s\S]*?)(?=\n##|\n---|$)/i;
  const benefitsMatch = benefitsRegex.exec(content);
  if (benefitsMatch?.[1]) {
    sections.benefits = benefitsMatch[1]
      .split("\n")
      .filter(
        (line) => line.trim().startsWith("-") || line.trim().startsWith("*"),
      )
      .map((line) => line.replace(/^[-*]\s+/, "").trim())
      .filter((line) => line && !line.includes("TODO"));
  }

  // Extract Final Outcome section
  const outcomesRegex = /##\s+Final Outcome\s*\n([\s\S]*?)(?=\n##|\n---|$)/i;
  const outcomesMatch = outcomesRegex.exec(content);
  if (outcomesMatch?.[1]) {
    sections.outcomes = outcomesMatch[1]
      .split("\n")
      .filter(
        (line) => line.trim().startsWith("-") || line.trim().startsWith("*"),
      )
      .map((line) => line.replace(/^[-*]\s+/, "").trim())
      .filter((line) => line && !line.includes("TODO"));
  }

  // Extract Resources section
  const resourcesRegex = /##\s+Resources\s*\n([\s\S]*?)(?=\n##|\n---|$)/i;
  const resourcesMatch = resourcesRegex.exec(content);
  if (resourcesMatch?.[1]) {
    const resourceLines = resourcesMatch[1].split("\n");
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
    sections.resources = resourceLines
      .filter((line) => line.includes("]("))
      .map((line) => {
        const match = linkRegex.exec(line);
        if (match?.[1] && match?.[2]) {
          return { label: match[1], href: match[2] };
        }
        return null;
      })
      .filter((resource): resource is { label: string; href: string } =>
        Boolean(resource),
      );
  }

  return sections;
}

/**
 * Load content for a specific node from markdown file
 */
export async function loadNodeContent(
  roadmapId: string,
  nodeId: string,
): Promise<NodeContent> {
  const contentPath = path.join(
    ROADMAPS_BASE_PATH,
    roadmapId,
    "content",
    `${nodeId}.md`,
  );

  try {
    const fileContents = await fs.readFile(contentPath, "utf-8");
    const { data, content } = matter(fileContents);

    const frontmatter = data as NodeContentFrontmatter;
    const sections = parseMarkdownSections(content);

    return {
      frontmatter,
      content,
      ...sections,
    };
  } catch (error) {
    throw new Error(
      `Failed to load content for node "${nodeId}" in roadmap "${roadmapId}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Load all node content from the content directory
 */
export async function loadAllNodeContent(
  roadmapId: string,
): Promise<Map<string, NodeContent>> {
  const contentDir = path.join(ROADMAPS_BASE_PATH, roadmapId, "content");
  const contentMap = new Map<string, NodeContent>();

  try {
    const files = await fs.readdir(contentDir);
    const markdownFiles = files.filter((file) => file.endsWith(".md"));

    for (const file of markdownFiles) {
      const nodeId = file.replace(".md", "");
      const content = await loadNodeContent(roadmapId, nodeId);
      contentMap.set(nodeId, content);
    }

    return contentMap;
  } catch (error) {
    throw new Error(
      `Failed to load node content for roadmap "${roadmapId}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Build complete roadmap with metadata, graph, and content
 */
export async function buildRoadmap(roadmapId: string): Promise<Roadmap> {
  const [metadata, graph, content] = await Promise.all([
    loadRoadmapMetadata(roadmapId),
    loadRoadmapGraph(roadmapId),
    loadAllNodeContent(roadmapId),
  ]);

  return {
    metadata,
    graph,
    content,
  };
}

/**
 * Get list of available roadmap IDs
 */
export async function getAvailableRoadmaps(): Promise<string[]> {
  try {
    const entries = await fs.readdir(ROADMAPS_BASE_PATH, {
      withFileTypes: true,
    });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    throw new Error(
      `Failed to load available roadmaps: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
